/**
 * Public Recurrence pipeline — C8.
 *
 * `expandSeries(series, window, dstPolicy)` is the ONE function that
 * turns a `RecurringSeries` into concrete `CalendarEvent`s for a
 * visible window. It does NOT live on `CalendarEvent.meta` and
 * cannot be substituted by stuffing RRULE strings somewhere; the
 * type system enforces the separation (C8).
 *
 * **Session 2 status.** Throwing stub. The type contract exists so
 * consumers porting from FullCalendar / ICS feeds construct
 * `RecurringSeries` from day one rather than inventing their own
 * meta-conventions that we'd later have to migrate. The engine
 * integration (rrule-rust + worker boundary) ships in Phase 4 — at
 * which point this file's body will dispatch to `core/recurrence.ts`
 * and produce `CalendarEvent[]` with each occurrence's
 * `start.timeZoneId` matching the source-series zone (Article 5
 * "recurring events MUST be local + IANA, never UTC").
 *
 * The engine MUST honor the same `DstPolicy` (C4) the drag pipeline
 * does, so spring-forward gaps and fall-back overlaps in any series'
 * occurrence stream resolve consistently with the rest of the
 * library.
 *
 * Pure function — no Vue imports.
 */

import type { Temporal } from '@js-temporal/polyfill';
import type {
  CalendarEvent,
  RecurrenceExpansionWindow,
  RecurringSeries,
} from './types';
import type { DstPolicy } from './dnd/move-math';

const PHASE_4_MESSAGE =
  '[@cocoar/vue-calendar] expandSeries() is not implemented yet — the recurrence engine integration is Phase 4. The TYPE contract for RecurringSeries is enforced from Session 2 so your data layer can build against it now; expansion will become available without API changes.';

/**
 * Expand a `RecurringSeries` into the concrete occurrences that fall
 * within `window`, applying `dstPolicy` to any occurrence whose
 * wall-time hits a DST gap or overlap in the series' source zone.
 *
 * **Inputs**
 *
 *   - `series` — the rule + dtstart + optional duration / rdate / exdate.
 *   - `window` — inclusive-start / exclusive-end. Typically the
 *     calendar's `_visibleRange` plus a small overscan.
 *   - `dstPolicy` — required (C4). Same options as the drag pipeline.
 *
 * **Output**
 *
 * `CalendarEvent<TMeta>[]` where every occurrence:
 *   - shares the series' `id` (use `start` to distinguish).
 *   - has `start` typed identically to `series.dtstart` (timed → ZDT,
 *     all-day → PD).
 *   - has `start.timeZoneId === series.dtstart.timeZoneId` for timed
 *     series — the engine never collapses to UTC or to the calendar's
 *     display zone.
 *   - has `end` computed from `series.duration` if present.
 *   - has `meta` shallow-copied from `series.meta`.
 *
 * **Throws**
 *
 * Until Phase 4: a `TypeError` with an informative message. Consumers
 * can rely on the type contract NOW; expansion arrives without an
 * API change.
 *
 * After Phase 4 (planned): a `DstResolutionError` if any occurrence
 * lands in a DST gap/overlap and `dstPolicy === 'reject'`.
 */
export function expandSeries<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _series: RecurringSeries<TMeta>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _window: RecurrenceExpansionWindow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _dstPolicy: DstPolicy,
): CalendarEvent<TMeta>[] {
  throw new TypeError(PHASE_4_MESSAGE);
}

/**
 * Re-export for ergonomics — consumers usually `import { expandSeries }`
 * alongside the types they're constructing.
 *
 * Session 2 also re-uses this constant in tests to assert the stub
 * shape without duplicating the message.
 */
export const EXPAND_SERIES_NOT_IMPLEMENTED_MESSAGE = PHASE_4_MESSAGE;

/**
 * Type-only re-exports so consumers writing `import { ... } from '@cocoar/vue-calendar'`
 * find the recurrence types alongside `expandSeries` without needing
 * to know they were declared in `core/types.ts`.
 */
export type {
  RecurringSeries,
  RecurrencePattern,
  RecurrenceExpansionWindow,
} from './types';

/**
 * Re-exported `Temporal` for convenience when constructing series.
 *
 * Without it consumers would have to add a separate
 * `@js-temporal/polyfill` import for `Temporal.ZonedDateTime.from(...)`.
 */
export type { Temporal };
