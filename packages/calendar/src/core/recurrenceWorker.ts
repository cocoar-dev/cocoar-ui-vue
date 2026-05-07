/**
 * Recurrence expansion worker — runs `rrule-rust` off the main
 * thread. Imported via Vite's `?worker` syntax; only this file
 * actually executes in the worker context.
 *
 * The worker pays ~ 175 ms WASM init on first instantiation (per
 * Spike B browser cold-start measurement). Subsequent expansions
 * are sub-millisecond. The main thread keeps this worker alive for
 * the lifetime of the calendar; warm-path expansions cost only the
 * postMessage round-trip.
 *
 * Wire format (request → response):
 *
 *   self.postMessage({
 *     id: 7,
 *     rules: [{ seriesId: 'standup', rruleString: 'DTSTART:...\nRRULE:...' }, …],
 *     windowStart: 1717200000000,
 *     windowEnd:   1719792000000,
 *   });
 *
 *   self.onmessage = (e) => {
 *     // e.data: {
 *     //   id: 7,
 *     //   results: [{ seriesId, timestamps: Float64Array }, …],
 *     //   expansionMs: 0.6,
 *     //   errors: [{ seriesId, message }, …]  // empty on success
 *     // }
 *     // Transferred: the Float64Array buffers themselves.
 *   };
 *
 * Float64Array is a Transferable. Sending 7.000 timestamps as a
 * 56 KB ArrayBuffer is roughly free; structured-cloning the same
 * count of plain-object dates would cost milliseconds.
 */

import { DateTime, RRuleSet } from 'rrule-rust';

export interface RecurrenceRequest {
  id: number;
  rules: ReadonlyArray<{ seriesId: string; rruleString: string }>;
  windowStart: number; // unix ms
  windowEnd: number;
}

export interface RecurrenceRuleResult {
  seriesId: string;
  /**
   * Unix-ms timestamps of every occurrence in the window. Always
   * sent as a Float64Array whose `.buffer` is in the transferList.
   */
  timestamps: Float64Array;
}

export interface RecurrenceResponse {
  id: number;
  results: RecurrenceRuleResult[];
  /** Worker-side time spent on actual expansion, in milliseconds. */
  expansionMs: number;
  errors: Array<{ seriesId: string; message: string }>;
}

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<RecurrenceRequest>) => {
  const { id, rules, windowStart, windowEnd } = event.data;

  const t0 = performance.now();
  const results: RecurrenceRuleResult[] = [];
  const errors: RecurrenceResponse['errors'] = [];

  // The window bounds are absolute ms; rrule-rust takes DateTime
  // instances. We use UTC for the window because the rule's own
  // tzid governs the occurrence timezone.
  const a = DateTime.fromTimestamp(windowStart);
  const b = DateTime.fromTimestamp(windowEnd);

  for (const rule of rules) {
    try {
      const set = RRuleSet.fromString(rule.rruleString);
      const occurrences = set.between(a, b, true);
      // Convert to a flat Float64Array of unix-ms.
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

  const expansionMs = performance.now() - t0;

  const response: RecurrenceResponse = { id, results, expansionMs, errors };
  // Transfer all the Float64Array buffers to the main thread —
  // zero-copy.
  const transfer = results.map((r) => r.timestamps.buffer);
  self.postMessage(response, transfer);
};
