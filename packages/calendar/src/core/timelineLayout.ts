/**
 * `core/timelineLayout.ts` — pure layout math for the `'timeline'`
 * view.
 *
 * The timeline lays each EVENT GROUP out as a horizontal row with
 * one or more bars. A "group" is:
 *   - a recurring series (`meta.__recurrence.seriesId`) — all
 *     occurrences within the window collapse to ONE row containing
 *     N bars. Mirrors the Gantt convention: a series is one logical
 *     unit of work, not N copies of itself.
 *   - a standalone event (no `__recurrence` meta) — one row with
 *     one bar.
 *
 * Unlike the day/week time-grids (which stack overlapping events
 * into lanes within a single column), the timeline gives every group
 * one full row — overlap between two distinct events doesn't fight
 * for space, but overlap WITHIN a recurring series simply renders
 * two bars on the same row.
 *
 * **Cross-zone events.** Bar geometry is computed in the display
 * zone (the calendar's `timezone`), because that's where the user's
 * eyes are anchored. The original `ZonedDateTime`s on the event are
 * preserved on the returned bar for renderers that want to surface
 * source-zone information (globe icon, tooltip).
 *
 * **All-day events.** Treated as inclusive-start / exclusive-end
 * date ranges (the lib's standard all-day shape). The bar spans
 * full days. A single-day all-day event renders as one day wide.
 *
 * **Window clamping.** Bars are clamped to `[windowStart, windowEnd)`.
 * `clippedStart` / `clippedEnd` flags surface whether the event
 * actually extends past the visible window so renderers can show a
 * "continues" indicator. Bars outside the window are filtered out;
 * a group with zero bars in window disappears entirely.
 *
 * Pure function. No DOM, no Vue, no side effects.
 */

import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEvent } from './types';

export interface TimelineLayoutOptions {
  /** Inclusive start of the visible window, anchored in `displayZone`. */
  readonly windowStart: Temporal.PlainDate;
  /** Exclusive end of the visible window. */
  readonly windowEnd: Temporal.PlainDate;
  /** Horizontal pixel density. */
  readonly pixelsPerDay: number;
  /** Vertical row height. */
  readonly rowHeight: number;
  /**
   * Display zone — used to project timed events' `ZonedDateTime`
   * endpoints into the date axis. All-day events ignore this (they're
   * already zone-less PlainDate).
   */
  readonly displayZone: string;
}

/**
 * One bar within a row — covers one event's `[start, end)` span
 * projected onto the timeline's pixel coordinate space.
 */
export interface TimelineBar<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly event: CalendarEvent<TMeta>;
  /** Pixel offset from the window's left edge. */
  readonly left: number;
  /** Pixel width of the bar (always > 0). */
  readonly width: number;
  /** True when the event starts before `windowStart`. */
  readonly clippedStart: boolean;
  /** True when the event ends at or after `windowEnd`. */
  readonly clippedEnd: boolean;
}

/**
 * One row in the timeline — either a single standalone event or
 * a recurring series with multiple occurrences.
 */
export interface TimelineRow<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Row identifier. For recurring series, the
   * `meta.__recurrence.seriesId`. For standalone events, the
   * `event.id`. Stable across re-renders so Vue's `:key` doesn't
   * re-mount rows unnecessarily.
   */
  readonly id: string;
  /** Pixel offset from the timeline's top edge. */
  readonly top: number;
  /** Pixel height of the row (matches `rowHeight`). */
  readonly height: number;
  /**
   * `true` when this row represents a recurring series (and therefore
   * may contain more than one bar). For standalone events, `false`
   * and `bars.length === 1`.
   */
  readonly isRecurring: boolean;
  /**
   * All bars in this row, sorted by `left` ascending. For standalone
   * events this is a single-element array.
   */
  readonly bars: TimelineBar<TMeta>[];
}

export interface TimelineLayout<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  /** One entry per group, sorted by first bar's `left` ascending,
   *  then by `id` ascending for tie-break. */
  readonly rows: TimelineRow<TMeta>[];
  /** Total time-grid width: `(windowEnd - windowStart) days × pixelsPerDay`. */
  readonly totalWidth: number;
  /** Total time-grid height: `rows.length × rowHeight`. */
  readonly totalHeight: number;
}

/**
 * Compute the timeline layout for `events` over the given window.
 * Events that don't intersect the window are filtered out. Recurring
 * occurrences of the same series collapse to one row.
 */
export function layoutTimeline<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>(
  events: readonly CalendarEvent<TMeta>[],
  opts: TimelineLayoutOptions,
): TimelineLayout<TMeta> {
  const { windowStart, windowEnd, pixelsPerDay, rowHeight, displayZone } = opts;

  const windowDays = windowStart.until(windowEnd, { largestUnit: 'days' }).days;
  const totalWidth = windowDays * pixelsPerDay;

  // Step 1: group events by series id (recurring) or event id (standalone).
  const groups = new Map<
    string,
    { events: CalendarEvent<TMeta>[]; isRecurring: boolean }
  >();
  for (const event of events) {
    const groupId = readGroupId(event);
    const isRecurring = readSeriesId(event) !== null;
    let bucket = groups.get(groupId);
    if (!bucket) {
      bucket = { events: [], isRecurring };
      groups.set(groupId, bucket);
    }
    bucket.events.push(event);
  }

  // Step 2: for each group, compute its bars within the window.
  type GroupData = {
    id: string;
    isRecurring: boolean;
    bars: TimelineBar<TMeta>[];
    firstLeft: number;
  };
  const groupDatas: GroupData[] = [];

  for (const [id, group] of groups) {
    const bars: TimelineBar<TMeta>[] = [];
    for (const event of group.events) {
      const { startDate, endDate } = eventDateRange(event, displayZone);
      if (Temporal.PlainDate.compare(endDate, windowStart) <= 0) continue;
      if (Temporal.PlainDate.compare(startDate, windowEnd) >= 0) continue;

      const clippedStart =
        Temporal.PlainDate.compare(startDate, windowStart) < 0;
      const clippedEnd = Temporal.PlainDate.compare(endDate, windowEnd) > 0;

      const visibleStart = clippedStart ? windowStart : startDate;
      const visibleEnd = clippedEnd ? windowEnd : endDate;

      const leftDays = windowStart.until(visibleStart, { largestUnit: 'days' })
        .days;
      const widthDays = visibleStart.until(visibleEnd, { largestUnit: 'days' })
        .days;

      bars.push({
        event,
        left: leftDays * pixelsPerDay,
        width: Math.max(1, widthDays) * pixelsPerDay,
        clippedStart,
        clippedEnd,
      });
    }
    if (bars.length === 0) continue;
    bars.sort((a, b) => a.left - b.left);
    groupDatas.push({
      id,
      isRecurring: group.isRecurring,
      bars,
      firstLeft: bars[0].left,
    });
  }

  // Step 3: sort groups by first bar's left, then group id asc.
  groupDatas.sort((a, b) => {
    if (a.firstLeft !== b.firstLeft) return a.firstLeft - b.firstLeft;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Step 4: assemble rows with vertical positions.
  const rows: TimelineRow<TMeta>[] = groupDatas.map((g, i) => ({
    id: g.id,
    top: i * rowHeight,
    height: rowHeight,
    isRecurring: g.isRecurring,
    bars: g.bars,
  }));

  return {
    rows,
    totalWidth,
    totalHeight: rows.length * rowHeight,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────

interface RecurrenceMetaShape {
  readonly seriesId?: unknown;
}

function readSeriesId(event: CalendarEvent): string | null {
  const meta = event.meta as { __recurrence?: RecurrenceMetaShape } | undefined;
  const seriesId = meta?.__recurrence?.seriesId;
  return typeof seriesId === 'string' ? seriesId : null;
}

function readGroupId(event: CalendarEvent): string {
  return readSeriesId(event) ?? event.id;
}

/**
 * Normalize an event's start / end to a `[startDate, endDate)` pair
 * in the display zone. Inclusive start, exclusive end.
 *
 *   - Timed event (`ZonedDateTime` start): convert to display-zone
 *     ZDT, take its date. End: same but for `event.end`; if missing,
 *     default to start + 30 minutes (matches event-index default).
 *     Exclusive-end: a meeting that ends at 09:30 doesn't extend
 *     into the next day, so the date-range end is the SAME date —
 *     but as an EXCLUSIVE upper bound we use `endDate + 1 day`.
 *   - All-day event (`PlainDate` start): start is the date, end is
 *     the event's `end` (exclusive per lib convention) or
 *     `start + 1 day`.
 */
function eventDateRange<TMeta extends Record<string, unknown>>(
  event: CalendarEvent<TMeta>,
  displayZone: string,
): { startDate: Temporal.PlainDate; endDate: Temporal.PlainDate } {
  if (event.start instanceof Temporal.PlainDate) {
    const startDate = event.start;
    const endDate =
      event.end instanceof Temporal.PlainDate
        ? event.end
        : startDate.add({ days: 1 });
    return { startDate, endDate };
  }
  // Timed: project to display zone, then take dates.
  const startZdt = event.start.withTimeZone(displayZone);
  const endZdt =
    event.end instanceof Temporal.ZonedDateTime
      ? event.end.withTimeZone(displayZone)
      : startZdt.add({ minutes: 30 });
  const startDate = startZdt.toPlainDate();
  // The bar spans the calendar days from startDate through (endDate -
  // 1ms). For a meeting 09:00–09:30 on day X, both are day X — we
  // need an EXCLUSIVE upper bound so the bar shows on day X only:
  // endDate = startDate + 1 day. For a meeting that crosses midnight
  // 23:00 → 01:30 next day, endZdt.toPlainDate() is day X+1; we still
  // want exclusive, so add 1 day to that.
  const endDate = endZdt.toPlainDate().add({ days: 1 });
  return { startDate, endDate };
}
