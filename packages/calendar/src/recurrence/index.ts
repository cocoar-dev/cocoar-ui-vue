/**
 * `@cocoar/vue-calendar/recurrence` — public recurrence API.
 *
 * The single public entry point for expanding `RecurringSeries` into
 * concrete `CalendarEvent` occurrences. Engine-agnostic — the
 * library does the heavy lifting (Temporal ↔ wire conversion,
 * source-zone preservation, provenance) and delegates RRULE
 * expansion to a swappable `RecurrenceEngine` implementation.
 *
 * The bundled `RruleTemporalEngine` adapter is lazy-imported on
 * first call. Custom engines (consumer-defined) register via
 * `builder.recurrenceEngine(custom)` or pass directly to
 * `expandSeries(..., custom)`.
 *
 * **Topology rule (CI-enforced):**
 *   - Only `src/recurrence-rrule-temporal/**` may import
 *     `rrule-temporal`.
 *   - The main package barrel re-exports types only — `expandSeries`
 *     is reachable only via this subpath, so apps that don't use
 *     recurrence don't pay the runtime bundle cost.
 */

import type { Temporal } from '@js-temporal/polyfill';
import type {
  CalendarEvent,
  RecurringSeries,
  RecurrenceExpansionWindow,
} from '../core/types';
import type { DstPolicy } from '../core/dnd/move-math';
import { seriesToEngineSeries } from './internal/series-to-engine';
import { decodeEngineResult } from './internal/engine-to-events';
import { getDefaultEngine } from './internal/default-engine';
import { applyDstPolicy } from './internal/dst-resolve';
import type { RecurrenceEngine, EngineSeries } from './types';

/**
 * Expand a `RecurringSeries` into the concrete occurrences that fall
 * within `window`.
 *
 * **Inputs**
 *   - `series` — the rule + dtstart + optional duration / rdate /
 *     exdate.
 *   - `window` — inclusive-start / exclusive-end. Typically the
 *     calendar's `_visibleRange` plus a small overscan.
 *   - `dstPolicy` — required (C4). Same options as the drag pipeline:
 *     `'compatible' | 'reject' | 'earlier' | 'later'`. **Step 2:
 *     accepted but not yet applied — engine-default disambiguation
 *     wins.** Step 3 wires the post-processing layer that enforces
 *     the policy uniformly across engines.
 *   - `engine` — optional. Defaults to a lazy-constructed
 *     rrule-temporal adapter from
 *     `@cocoar/vue-calendar/recurrence-rrule-temporal`.
 *
 * **Output**
 *
 * `CalendarEvent<TMeta>[]` where every occurrence:
 *   - has a UNIQUE synthetic `id` of shape
 *     `${series.id}__${recurrenceId}` so the layout pipeline can
 *     distinguish occurrences (it dedupes by `event.id`). The
 *     original series identifier is in `meta.__recurrence.seriesId`
 *     — read via `getRecurrenceMeta(event)`.
 *   - has `start` typed identically to `series.dtstart` (timed → ZDT,
 *     all-day → PD).
 *   - has `start.timeZoneId === series.dtstart.timeZoneId` for
 *     timed series — the engine never collapses to UTC or to the
 *     calendar's display zone (C3).
 *   - has `end` computed from `series.duration` if present.
 *   - carries provenance under `meta.__recurrence` (A4) — read via
 *     `getRecurrenceMeta(event)`.
 *
 * **Throws**
 *
 * - `TypeError` for shape mismatches (PlainDate RDATE on a timed
 *   series, etc.).
 * - Step 3: `DstResolutionError` when `dstPolicy === 'reject'` and
 *   any occurrence falls in a DST gap.
 */
export async function expandSeries<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>(
  series: RecurringSeries<TMeta>,
  window: RecurrenceExpansionWindow,
  dstPolicy: DstPolicy,
  engine?: RecurrenceEngine,
): Promise<CalendarEvent<TMeta>[]> {
  const engineImpl = engine ?? (await getDefaultEngine());
  const engineSeries: EngineSeries = seriesToEngineSeries(series);
  const startMs = window.start.toInstant().epochMilliseconds;
  const endMs = window.end.toInstant().epochMilliseconds;

  const response = await engineImpl.expand({
    window: { startMs, endMs },
    series: [engineSeries],
  });

  if (response.errors.length > 0) {
    const e = response.errors[0];
    throw new Error(
      `[@cocoar/vue-calendar] Engine failed to expand series '${e.seriesId}': ${e.message}`,
    );
  }

  const result = response.results[0];
  if (!result) return [];
  const events = decodeEngineResult(result, series);
  // C4 — apply DstPolicy as post-processing so observable semantics
  // never depend on which engine ran underneath. See A3 + dst-resolve.ts.
  return applyDstPolicy(events, series, dstPolicy);
}

/**
 * Public accessor for the lib-managed recurrence metadata on an
 * expanded occurrence. Returns `null` for non-recurring events.
 *
 * Use this instead of reading `event.meta.__recurrence` directly —
 * the storage key is library-managed and may change between minor
 * versions.
 */
export { getRecurrenceMeta } from './internal/engine-to-events';
export type { RecurrenceMeta } from './internal/engine-to-events';

/**
 * Type-only re-exports — single-import ergonomics for consumers who
 * `import { ... } from '@cocoar/vue-calendar/recurrence'`.
 */
export type {
  RecurringSeries,
  RecurrencePattern,
  RecurrenceExpansionWindow,
} from '../core/types';

export type {
  RecurrenceEngine,
  EngineRequest,
  EngineResponse,
  EngineResult,
  EngineResultTimed,
  EngineResultAllDay,
  EngineSeries,
  EngineSeriesTimed,
  EngineSeriesAllDay,
  EngineWindow,
  EngineSeriesError,
  RuleSpec,
  WallclockTimed,
  WallclockDate,
  OriginCode,
} from './types';

export { ORIGIN_RRULE, ORIGIN_RDATE } from './types';

export type { DstPolicy } from '../core/dnd/move-math';

/**
 * Re-exported `Temporal` for convenience when constructing series.
 */
export type { Temporal };
