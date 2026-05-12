/**
 * Lazy loader for the default recurrence engine.
 *
 * The default engine (rrule-temporal adapter) lives at
 * `@cocoar/vue-calendar/recurrence-rrule-temporal`. Consumers that
 * import `expandSeries` from `@cocoar/vue-calendar/recurrence`
 * without configuring an engine get this default — but only on
 * actual use, via dynamic import. Apps that import `expandSeries`
 * but never actually call it never load the engine.
 *
 * Keeps the `recurrence` subpath bundle tiny (just the orchestrator
 * + types). The engine adapter chunk is fetched on first call.
 */

import type { RecurrenceEngine } from '../types';

let cached: RecurrenceEngine | null = null;
let cachedPromise: Promise<RecurrenceEngine> | null = null;

/**
 * Resolve the default engine. Dynamic-imports
 * `recurrence-rrule-temporal` once, then caches the instance for
 * subsequent calls.
 *
 * The loader is process-global by design — the engine is stateless
 * and reuse is safe. Builders that want a different engine pass it
 * explicitly via `builder.recurrenceEngine(...)`.
 */
export async function getDefaultEngine(): Promise<RecurrenceEngine> {
  if (cached) return cached;
  if (cachedPromise) return cachedPromise;

  cachedPromise = import('../../recurrence-rrule-temporal/index')
    .then((mod) => {
      cached = new mod.RruleTemporalEngine();
      return cached;
    })
    .catch((e) => {
      cachedPromise = null;
      throw new Error(
        '[@cocoar/vue-calendar] Failed to load default recurrence engine ' +
          '(rrule-temporal). Ensure `rrule-temporal` is installed, or pass ' +
          'an explicit engine to `expandSeries(series, window, dstPolicy, engine)` / ' +
          '`builder.recurrenceEngine(...)`. Original error: ' +
          ((e as Error).message ?? String(e)),
        { cause: e },
      );
    });

  return cachedPromise;
}

/**
 * Test-only helper: clear the cached engine. Lets test suites
 * inject engines without leaking across tests.
 *
 * Not part of the public API surface (re-exported only from the
 * recurrence subpath for internal test use).
 */
export function _resetDefaultEngineForTests(): void {
  cached = null;
  cachedPromise = null;
}
