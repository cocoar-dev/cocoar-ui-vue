/**
 * Pure-function layout for the month view.
 *
 * The month view renders a fixed 6 × 7 grid (42 cells, always —
 * see `monthGridDates` in temporal.ts). Events fall into two
 * visual categories:
 *
 *   1. **Multi-day all-day events** render as horizontal BARS that
 *      span multiple cells inside a single week row. A 5-day
 *      conference Mon-Fri renders as one bar from cell 0 to cell 4
 *      of that week's row. An event spanning two weeks renders as
 *      two bars, one per week, with `clippedStart` / `clippedEnd`
 *      flags so the renderer can drop the cap on the clipped side.
 *
 *   2. **Single-day events** (timed or single-day all-day) render
 *      as PILLS inside a specific cell. The cell's max-pill count
 *      is `maxEventsPerCell`; events past that show as a
 *      "+N more" link.
 *
 * Per-week-row multi-day-bar lane assignment via the Spike C
 * interval-graph layout. Each row is independent — a 3-deep row
 * doesn't widen the bars in other rows.
 *
 * Pure TypeScript, no DOM, no Vue. Property-tested.
 */

import type { CalendarEvent } from './types';
import { isAllDayEvent } from './types';
import {
  layoutOverlappingIntervals,
  type IntervalInput,
} from './overlapLayout';
import { Temporal, dateKey, eventStartDateInZone } from './temporal';

// ─── Output types ────────────────────────────────────────────────────

export interface MonthMultiDayBar<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  event: CalendarEvent<TMeta>;
  /** Lane within the week row. 0 = topmost. */
  lane: number;
  /** Total lanes used in this week row. */
  laneCount: number;
  /** Column 0..6 inclusive — first cell the bar covers. */
  startCol: number;
  /** Column 0..6 inclusive — last cell the bar covers. */
  endCol: number;
  /** True when the event extends earlier than the row's first day. */
  clippedStart: boolean;
  /** True when the event extends later than the row's last day. */
  clippedEnd: boolean;
}

/**
 * Single-day event rendered as a pill inside a specific cell.
 * "Single-day" here means the event occupies exactly ONE day in
 * the calendar — either a date-only event with no end, a date-only
 * event with end == start + 1 day (RFC 5545 single-day all-day),
 * or any timed event (timed events always render as pills, even
 * if their wall-clock spans midnight, because their visual home
 * in the month view is the start day).
 */
export interface MonthCellPill<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  event: CalendarEvent<TMeta>;
  /** Visual order within the cell. Stable across renders for the
   *  same input. */
  order: number;
}

export interface MonthWeekRow<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  /** 0..5. */
  rowIndex: number;
  /** First date of the row (the cell-0 date). */
  weekStart: Temporal.PlainDate;
  /** All 7 dates of the row, in column order. */
  days: ReadonlyArray<Temporal.PlainDate>;
  /** Multi-day bars on this row, lane-resolved. */
  multiDayBars: ReadonlyArray<MonthMultiDayBar<TMeta>>;
  /** Per-cell single-day pills, indexed by `dateKey()`. */
  cellPills: ReadonlyMap<string, ReadonlyArray<MonthCellPill<TMeta>>>;
}

export interface MonthLayout<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  /** Always 6 rows. */
  weekRows: ReadonlyArray<MonthWeekRow<TMeta>>;
}

// ─── Inputs ──────────────────────────────────────────────────────────

export interface MonthLayoutOptions {
  /**
   * The 42 dates of the month grid, in row-major order
   * (cell 0 = top-left, cell 6 = top-right, cell 7 = next row,
   * etc.). Use `monthGridDates(yearMonth, firstDayOfWeek)` from
   * temporal.ts.
   */
  gridDates: ReadonlyArray<Temporal.PlainDate>;
  /** Timezone for resolving timed events. */
  timezone: string;
}

// ─── Main function ───────────────────────────────────────────────────

/**
 * Compute the full layout for a month grid.
 *
 * Multi-day events that span across week-row boundaries are
 * rendered as multiple bars (one per affected row), each correctly
 * clipped to its row.
 */
export function layoutMonthGrid<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  events: ReadonlyArray<CalendarEvent<TMeta>>,
  opts: MonthLayoutOptions,
): MonthLayout<TMeta> {
  const { gridDates, timezone } = opts;
  if (gridDates.length !== 42) {
    throw new RangeError(
      `gridDates must have exactly 42 entries (got ${gridDates.length})`,
    );
  }

  // Pre-compute per-row {start, end (inclusive), days, dayKeys}.
  const rows: {
    rowIndex: number;
    days: Temporal.PlainDate[];
    dayKeyToCol: Map<string, number>;
    weekStart: Temporal.PlainDate;
    weekEnd: Temporal.PlainDate;
  }[] = [];
  for (let r = 0; r < 6; r++) {
    const days = gridDates.slice(r * 7, r * 7 + 7) as Temporal.PlainDate[];
    const dayKeyToCol = new Map<string, number>();
    for (let i = 0; i < 7; i++) dayKeyToCol.set(dateKey(days[i]), i);
    rows.push({
      rowIndex: r,
      days,
      dayKeyToCol,
      weekStart: days[0],
      weekEnd: days[6],
    });
  }

  // Bucket events into multi-day candidates and single-day pills.
  // De-duplicate by id for the multi-day path (same defensive
  // discipline as the time-grid).
  const seenIds = new Set<string>();
  type MultiDayProj<M extends Record<string, unknown>> = {
    event: CalendarEvent<M>;
    firstDay: Temporal.PlainDate;
    lastDayInclusive: Temporal.PlainDate;
  };
  const multiDayCandidates: MultiDayProj<TMeta>[] = [];
  const cellPillsByKey = new Map<string, MonthCellPill<TMeta>[]>();

  for (const event of events) {
    if (seenIds.has(event.id)) continue;
    seenIds.add(event.id);

    const { firstDay, lastDayInclusive, isMultiDay } = resolveDayBounds(
      event,
      timezone,
    );

    if (isMultiDay) {
      multiDayCandidates.push({ event, firstDay, lastDayInclusive });
    } else {
      // Single-day. Pin to the start day's bucket.
      const key = dateKey(firstDay);
      const existing = cellPillsByKey.get(key);
      const pill: MonthCellPill<TMeta> = {
        event,
        order: existing ? existing.length : 0,
      };
      if (existing) existing.push(pill);
      else cellPillsByKey.set(key, [pill]);
    }
  }

  // For each row, produce multi-day bars by clipping events to
  // the row's [weekStart, weekEnd] inclusive range and running
  // overlapLayout on column intervals 0..6.
  const weekRows: MonthWeekRow<TMeta>[] = rows.map((row) => {
    type RowProj = MultiDayProj<TMeta> & {
      startCol: number;
      endCol: number;
      clippedStart: boolean;
      clippedEnd: boolean;
    };
    const projections: RowProj[] = [];

    for (const m of multiDayCandidates) {
      // Skip events entirely outside this row.
      if (
        Temporal.PlainDate.compare(m.lastDayInclusive, row.weekStart) < 0 ||
        Temporal.PlainDate.compare(m.firstDay, row.weekEnd) > 0
      ) {
        continue;
      }
      const visStart =
        Temporal.PlainDate.compare(m.firstDay, row.weekStart) < 0
          ? row.weekStart
          : m.firstDay;
      const visEnd =
        Temporal.PlainDate.compare(m.lastDayInclusive, row.weekEnd) > 0
          ? row.weekEnd
          : m.lastDayInclusive;
      const startCol = row.dayKeyToCol.get(dateKey(visStart));
      const endCol = row.dayKeyToCol.get(dateKey(visEnd));
      if (startCol === undefined || endCol === undefined) continue;
      projections.push({
        ...m,
        startCol,
        endCol,
        clippedStart:
          Temporal.PlainDate.compare(m.firstDay, row.weekStart) < 0,
        clippedEnd:
          Temporal.PlainDate.compare(m.lastDayInclusive, row.weekEnd) > 0,
      });
    }

    let multiDayBars: MonthMultiDayBar<TMeta>[] = [];
    if (projections.length > 0) {
      const intervals: IntervalInput[] = projections.map((p) => ({
        id: p.event.id,
        start: p.startCol,
        end: p.endCol,
      }));
      const result = layoutOverlappingIntervals(intervals);
      const laneById = new Map<string, number>();
      for (const bar of result.bars) laneById.set(bar.id, bar.lane);
      multiDayBars = projections.map((p) => ({
        event: p.event,
        lane: laneById.get(p.event.id) ?? 0,
        laneCount: result.laneCount,
        startCol: p.startCol,
        endCol: p.endCol,
        clippedStart: p.clippedStart,
        clippedEnd: p.clippedEnd,
      }));
    }

    // Cell pills for this row's days.
    const cellPills = new Map<string, MonthCellPill<TMeta>[]>();
    for (const day of row.days) {
      const key = dateKey(day);
      const pills = cellPillsByKey.get(key);
      if (pills) cellPills.set(key, pills);
    }

    return {
      rowIndex: row.rowIndex,
      weekStart: row.weekStart,
      days: row.days,
      multiDayBars,
      cellPills,
    } satisfies MonthWeekRow<TMeta>;
  });

  return { weekRows };
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Resolve an event's calendar-day bounds for month-view bucketing.
 *
 * "Multi-day" means the event spans more than one calendar day in
 * the configured timezone. RFC 5545 convention: `end` is exclusive,
 * so `[2026-04-13, 2026-04-16)` covers Mon-Wed (3 days) and
 * counts as multi-day.
 *
 * Timed events that span across midnight ARE treated as single-day
 * for the month view (their visual home is the start day). The
 * week / day views handle the cross-midnight clipping per-day in
 * the time grid; in the month view we don't have time slots, so
 * timed events live as pills on the start day.
 */
function resolveDayBounds(
  event: CalendarEvent,
  timezone: string,
): {
  firstDay: Temporal.PlainDate;
  lastDayInclusive: Temporal.PlainDate;
  isMultiDay: boolean;
} {
  if (isAllDayEvent(event)) {
    const firstDay = event.start;
    let lastDayInclusive: Temporal.PlainDate;
    if (event.end) {
      const endExcl = event.end;
      lastDayInclusive = endExcl.subtract({ days: 1 });
      if (Temporal.PlainDate.compare(lastDayInclusive, firstDay) < 0) {
        lastDayInclusive = firstDay;
      }
    } else {
      lastDayInclusive = firstDay;
    }
    return {
      firstDay,
      lastDayInclusive,
      isMultiDay:
        Temporal.PlainDate.compare(lastDayInclusive, firstDay) > 0,
    };
  }

  // Timed event. Single-day in month-view terms — pin to start day in
  // the display zone.
  const startDay = eventStartDateInZone(event.start, timezone);
  return {
    firstDay: startDay,
    lastDayInclusive: startDay,
    isMultiDay: false,
  };
}
