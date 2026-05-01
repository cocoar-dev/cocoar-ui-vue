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
