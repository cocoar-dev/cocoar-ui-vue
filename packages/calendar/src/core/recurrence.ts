/**
 * Recurrence engine — main-thread API.
 *
 * Two paths sharing one request/response shape:
 *
 *   - `expandSync`  — runs `rrule-rust` in the calling thread.
 *                     Cheapest for small workloads (single rule,
 *                     one-shot expansion). Blocks the main thread.
 *
 *   - `expandAsync` — dispatches to a long-lived worker. Cheapest
 *                     for large workloads where main-thread blocking
 *                     would jank the UI. Pays a postMessage round-
 *                     trip (~ 1-2 ms) on top of the actual expansion.
 *
 * Spike E benchmarks both at four scales (W1-W4) and locks the
 * auto-dispatch threshold — when does the worker round-trip beat
 * in-thread? Per Spike B's measurements (`rrule-rust` warm path =
 * 0.6 ms / expansion), the in-thread cost is much lower than the
 * spike-plan hypothesis suggested, so the auto-dispatch threshold
 * lands at higher series counts than originally estimated.
 *
 * Wire format is the same in both modes; consumers swap engines by
 * choosing which function to call. A higher-level
 * `<CoarCalendar :recurrence-engine="...">` prop in Phase 1 will
 * pick automatically based on `series.length` against the locked
 * threshold.
 */

import { DateTime, RRuleSet } from 'rrule-rust';
// @ts-expect-error — Vite-specific `?worker` import. The default
// export is a constructor-shaped class; types are loosely declared
// so this file stays portable to non-Vite builds.
import RecurrenceWorker from './recurrenceWorker?worker';

export interface RecurrenceRequest {
  rules: ReadonlyArray<{ seriesId: string; rruleString: string }>;
  /** Window start as unix-ms (absolute timestamp). */
  windowStart: number;
  /** Window end as unix-ms (absolute timestamp), exclusive-ish. */
  windowEnd: number;
}

export interface RecurrenceRuleResult {
  seriesId: string;
  /** Unix-ms timestamps of every occurrence inside the window. */
  timestamps: Float64Array;
}

export interface RecurrenceResponse {
  results: RecurrenceRuleResult[];
  /** Time spent in actual expansion (ms). Excludes worker round-trip. */
  expansionMs: number;
  /** Per-rule errors; empty on full success. */
  errors: Array<{ seriesId: string; message: string }>;
}

// ─── In-thread implementation (shared with the worker code) ─────────

function expandInThread(req: RecurrenceRequest): RecurrenceResponse {
  const t0 = performance.now();
  const results: RecurrenceRuleResult[] = [];
  const errors: RecurrenceResponse['errors'] = [];

  const a = DateTime.fromTimestamp(req.windowStart);
  const b = DateTime.fromTimestamp(req.windowEnd);

  for (const rule of req.rules) {
    try {
      const set = RRuleSet.fromString(rule.rruleString);
      const occurrences = set.between(a, b, true);
      const ts = new Float64Array(occurrences.length);
      for (let i = 0; i < occurrences.length; i++) {
        ts[i] = occurrences[i].toTimestamp();
      }
      results.push({ seriesId: rule.seriesId, timestamps: ts });
    } catch (e) {
      errors.push({
        seriesId: rule.seriesId,
        message: (e as Error).message ?? String(e),
      });
    }
  }

  return { results, expansionMs: performance.now() - t0, errors };
}

/**
 * Synchronous in-thread expansion. Runs in the caller's thread; for
 * large workloads (≥ threshold), prefer `expandAsync`.
 */
export function expandSync(req: RecurrenceRequest): RecurrenceResponse {
  return expandInThread(req);
}

// ─── Async (worker) implementation ──────────────────────────────────

interface PendingRequest {
  resolve: (r: RecurrenceResponse) => void;
  reject: (e: unknown) => void;
}

let workerInstance: Worker | null = null;
let nextRequestId = 1;
const pending = new Map<number, PendingRequest>();

interface WorkerMessage extends RecurrenceResponse {
  id: number;
}

function ensureWorker(): Worker {
  if (workerInstance) return workerInstance;
  // Vite-specific `?worker` import: returns a Worker constructor that
  // wraps the bundled module-mode worker. More robust than the
  // `new URL(...)` form when import.meta.url goes through aliases.
  workerInstance = new RecurrenceWorker();
  workerInstance.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const { id, ...rest } = event.data;
    const req = pending.get(id);
    if (!req) return;
    pending.delete(id);
    req.resolve(rest);
  };
  workerInstance.onerror = (event) => {
    // Reject all pending requests on a worker-level error.
    for (const [, req] of pending) req.reject(event.error ?? new Error(event.message));
    pending.clear();
  };
  return workerInstance;
}

/**
 * Asynchronous expansion via a long-lived worker. The worker is
 * lazily created on first use and reused for the lifetime of the
 * page. Cold-start (~ 175 ms WASM init) hits the first call; warm
 * calls cost ~ 1-2 ms postMessage round-trip plus the expansion
 * time.
 */
export function expandAsync(req: RecurrenceRequest): Promise<RecurrenceResponse> {
  const worker = ensureWorker();
  const id = nextRequestId++;
  return new Promise<RecurrenceResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, ...req });
  });
}

/**
 * Tear down the worker. Useful for tests or for apps that know
 * recurrence won't be needed any more.
 */
export function shutdownRecurrenceWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  for (const [, req] of pending) req.reject(new Error('Worker terminated'));
  pending.clear();
}

// ─── Engine abstraction ─────────────────────────────────────────────
//
// `RecurrenceEngine` decouples the calendar from the specific
// expansion implementation. Phase 0 Spike B locked rrule-rust as
// the default; Phase 0 Spike E locked auto-dispatch at 200 rules.
//
// Consumers can:
//   - Use the default `DefaultRecurrenceEngine` (rrule-rust + auto-
//     dispatch) — the right answer for ~ 100% of apps.
//   - Inject a `SyncOnlyEngine` for tests / SSR (no worker).
//   - Implement their own `RecurrenceEngine` to swap to
//     rrule-temporal for smaller bundle, mock for tests, etc.
//
// The interface accepts a batch (multiple rules) per call. Even at
// 100 ops/sec call volume, each call going through to the worker
// would saturate postMessage. Batching lets the calendar collect
// "all rules visible in this window" and dispatch once.

export interface RecurrenceEngine {
  /**
   * Expand a batch of recurring rules over a window. The engine
   * decides whether to run sync (in-thread) or async (worker)
   * per-call; consumers always await regardless.
   */
  expand(request: RecurrenceRequest): Promise<RecurrenceResponse>;
}

export interface DefaultRecurrenceEngineOptions {
  /**
   * Auto-dispatch threshold. Rules >= threshold → worker. Default
   * 200, locked empirically in Phase 0 Spike E (W1 sync stays
   * under one frame, W2+ blocks UI).
   */
  threshold?: number;
}

/**
 * Default engine: rrule-rust with auto-dispatch at the locked
 * threshold (200 rules by default, configurable).
 */
export class DefaultRecurrenceEngine implements RecurrenceEngine {
  private threshold: number;

  constructor(opts: DefaultRecurrenceEngineOptions = {}) {
    this.threshold = opts.threshold ?? 200;
  }

  async expand(request: RecurrenceRequest): Promise<RecurrenceResponse> {
    if (request.rules.length >= this.threshold) {
      return expandAsync(request);
    }
    return expandSync(request);
  }
}

/**
 * Forces every expansion through the synchronous in-thread path.
 * Useful for tests (no worker setup) and SSR (no Worker API).
 */
export class SyncOnlyRecurrenceEngine implements RecurrenceEngine {
  async expand(request: RecurrenceRequest): Promise<RecurrenceResponse> {
    return expandSync(request);
  }
}

/**
 * Forces every expansion through the worker. Useful for diagnostic
 * purposes — never blocks the main thread, even for tiny inputs.
 * Production consumers should prefer `DefaultRecurrenceEngine` so
 * the small-batch fast path stays sync.
 */
export class WorkerOnlyRecurrenceEngine implements RecurrenceEngine {
  async expand(request: RecurrenceRequest): Promise<RecurrenceResponse> {
    return expandAsync(request);
  }
}
