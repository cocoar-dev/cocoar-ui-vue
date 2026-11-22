/**
 * A board: rows of day cells, with bars running across them.
 *
 * A row says which day each column shows and which events belong to
 * it. That one shape covers a week of days and parts of the day, a
 * week per resource and a year wall planner. What a row means stays
 * with the host.
 */

import { Temporal } from './temporal';
import { compareEventStart } from './eventOrder';
import { dayBoundsOf, dayOrdinal } from './monthGridLayout';
import type { CalendarPeriod } from './occupancy';
import { layoutOverlappingIntervals } from './overlapLayout';
import { isTimedEvent, type CalendarEvent } from './types';

/**
 * `cells`: single-day events in their cell, multi-day events as bars.
 * `bars`: every event as a bar.
 * `custom`: no events, the host fills the cells.
 */
export type BoardRowKind = 'cells' | 'bars' | 'custom';

export interface BoardRow<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  key: string;
  /** One entry per column; `null` is a column this row has no day for. */
  dates: ReadonlyArray<Temporal.PlainDate | null>;
  kind: BoardRowKind;
  /** Which events belong here. Default: all. */
  match?: (event: CalendarEvent<TMeta>) => boolean;
  /** Left out of the layout when no event lands in it. */
  hideWhenEmpty?: boolean;
  /** The part of the day this row stands for; a drop onto it starts there. */
  period?: CalendarPeriod;
  /** Extra class on the row, to style it through the board's tokens. */
  class?: string;
  /** Text of the row's label. Default: `key`. */
  label?: string;
  /**
   * Draw the single-day events of a cell. Default true. With `false`
   * they only reach the `#cell` slot, for a planner that shows dots.
   */
  showCellEvents?: boolean;
}

export interface BoardBar<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  event: CalendarEvent<TMeta>;
  lane: number;
  /** First and last column, inclusive. */
  startCol: number;
  endCol: number;
  /** The event goes on before or after what this row shows. */
  clippedStart: boolean;
  clippedEnd: boolean;
}

export interface BoardCell<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  date: Temporal.PlainDate | null;
  events: ReadonlyArray<CalendarEvent<TMeta>>;
}

export interface BoardLayoutRow<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  row: BoardRow<TMeta>;
  bars: ReadonlyArray<BoardBar<TMeta>>;
  laneCount: number;
  cells: ReadonlyArray<BoardCell<TMeta>>;
}

/**
 * Runs of consecutive columns inside `[first, last]`. Days are compared
 * as ordinals: a year wall asks this for every event in every row.
 */
function columnRuns(
  ordinals: ReadonlyArray<number | null>,
  first: number,
  last: number,
): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  let start = -1;
  for (let col = 0; col <= ordinals.length; col++) {
    const ordinal = ordinals[col];
    const inside = ordinal !== null && ordinal !== undefined && ordinal >= first && ordinal <= last;
    if (inside && start < 0) start = col;
    if (!inside && start >= 0) {
      runs.push([start, col - 1]);
      start = -1;
    }
  }
  return runs;
}

/** Lay out `events` on `rows`, in the display zone `timezone`. Pure. */
export function layoutBoard<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  events: ReadonlyArray<CalendarEvent<TMeta>>,
  options: { rows: ReadonlyArray<BoardRow<TMeta>>; timezone: string },
): BoardLayoutRow<TMeta>[] {
  const { rows, timezone } = options;
  const out: BoardLayoutRow<TMeta>[] = [];

  for (const row of rows) {
    const cellEvents = row.dates.map(() => [] as CalendarEvent<TMeta>[]);
    const pending: Array<Omit<BoardBar<TMeta>, 'lane'>> = [];

    if (row.kind !== 'custom') {
      const ordinals = row.dates.map((d) => (d ? dayOrdinal(d) : null));
      const present = ordinals.filter((o): o is number => o !== null);
      const rowFirst = present.length ? Math.min(...present) : Infinity;
      const rowLast = present.length ? Math.max(...present) : -Infinity;
      for (const event of events) {
        const bounds = dayBoundsOf(event as CalendarEvent, timezone);
        if (bounds.lastOrd < rowFirst || bounds.firstOrd > rowLast) continue;
        if (row.match && !row.match(event)) continue;
        if (row.kind === 'cells' && !bounds.isMultiDay) {
          const col = ordinals.indexOf(bounds.firstOrd);
          if (col >= 0) cellEvents[col].push(event);
          continue;
        }
        for (const [startCol, endCol] of columnRuns(ordinals, bounds.firstOrd, bounds.lastOrd)) {
          pending.push({
            event,
            startCol,
            endCol,
            clippedStart: bounds.firstOrd < ordinals[startCol]!,
            clippedEnd: bounds.lastOrd > ordinals[endCol]!,
          });
        }
      }
    }

    if (row.hideWhenEmpty && pending.length === 0 && cellEvents.every((c) => c.length === 0)) {
      continue;
    }

    const barId = (bar: { event: CalendarEvent<TMeta>; startCol: number }) =>
      `${bar.event.id}#${bar.startCol}`;
    const lanes = layoutOverlappingIntervals(
      pending.map((bar) => ({ id: barId(bar), start: bar.startCol, end: bar.endCol })),
    );
    const laneById = new Map(lanes.bars.map((b) => [b.id, b.lane]));

    out.push({
      row,
      bars: pending.map((bar) => ({ ...bar, lane: laneById.get(barId(bar)) ?? 0 })),
      laneCount: lanes.laneCount,
      cells: row.dates.map((date, col) => ({
        date,
        events: cellEvents[col].sort(compareEventStart),
      })),
    });
  }
  return out;
}

// ─── Drops ───────────────────────────────────────────────────────────

export interface BoardDropInput<TMeta extends Record<string, unknown>> {
  event: CalendarEvent<TMeta>;
  /** Row and day under the pointer. */
  row: BoardRow<TMeta>;
  date: Temporal.PlainDate;
  /** Row the event was grabbed in. */
  sourceRow: BoardRow<TMeta>;
  /** Days from the event's first day to the day it was grabbed on. */
  grabOffsetDays: number;
  /** Display zone. */
  timezone: string;
}

/**
 * Where a dragged event lands. On another day the time stays. In
 * another part of the day a single-day event starts where that part
 * starts. The duration always stays. `null` on a `custom` row.
 */
export function boardDropTarget<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  input: BoardDropInput<TMeta>,
): { date: string; minutes: number | null; mode: 'allDay' | 'timed' } | null {
  const { event, row, date, sourceRow, grabOffsetDays, timezone } = input;
  if (row.kind === 'custom') return null;
  const startDay = date.subtract({ days: grabOffsetDays }).toString();
  if (!isTimedEvent(event)) return { date: startDay, minutes: null, mode: 'allDay' };
  const changedPeriod =
    !!row.period && !!sourceRow.period && row.period.key !== sourceRow.period.key;
  const multiDay = dayBoundsOf(event as CalendarEvent, timezone).isMultiDay;
  const minutes =
    changedPeriod && !multiDay
      ? (row.period!.dropMinutes ?? row.period!.startMinutes)
      : startMinuteIn(event as CalendarEvent, timezone);
  return { date: startDay, minutes, mode: 'timed' };
}

// ─── Row sets ────────────────────────────────────────────────────────

/** Key of the all-day row of `weekBoardRows`. */
export const BOARD_ALL_DAY_ROW = '__all-day';
/** Key of the row of events without a resource in `resourceWeekRows`. */
export const BOARD_UNASSIGNED_ROW = '__unassigned';

/** Wall-clock minute of the day an event starts at, in the display zone. */
function startMinuteIn(event: CalendarEvent<never> | CalendarEvent, timezone: string): number {
  const start = (event.start as Temporal.ZonedDateTime).withTimeZone(timezone);
  return start.hour * 60 + start.minute;
}

export interface WeekBoardRowsOptions {
  dates: ReadonlyArray<Temporal.PlainDate>;
  periods: ReadonlyArray<CalendarPeriod>;
  timezone: string;
  /** Add the row for all-day and multi-day events on top. Default true. */
  allDay?: boolean;
  /** Keys of rows the host fills itself, below the periods. */
  extraRows?: ReadonlyArray<string>;
}

/**
 * Days as columns, parts of the day as rows. A timed event stands in
 * the period it starts in; all-day and multi-day events run in the
 * all-day row. A timed event outside every period goes to the first
 * period at or after its start, or the last one, so it never gets lost.
 */
export function weekBoardRows<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  options: WeekBoardRowsOptions,
): BoardRow<TMeta>[] {
  const { dates, periods, timezone, allDay = true, extraRows = [] } = options;
  const isSpanning = (event: CalendarEvent<TMeta>) =>
    !isTimedEvent(event) || dayBoundsOf(event as CalendarEvent, timezone).isMultiDay;
  const periodIndexOf = (minute: number) => {
    const inside = periods.findIndex((p) => minute >= p.startMinutes && minute < p.endMinutes);
    if (inside >= 0) return inside;
    const after = periods.findIndex((p) => p.startMinutes > minute);
    return after >= 0 ? after : periods.length - 1;
  };
  return [
    ...(allDay
      ? [{ key: BOARD_ALL_DAY_ROW, dates, kind: 'bars' as const, match: isSpanning }]
      : []),
    ...periods.map((period, index) => ({
      key: period.key,
      dates,
      kind: 'cells' as const,
      period,
      match: (event: CalendarEvent<TMeta>) =>
        !isSpanning(event) && periodIndexOf(startMinuteIn(event as CalendarEvent, timezone)) === index,
    })),
    ...extraRows.map((key) => ({ key, dates, kind: 'custom' as const })),
  ];
}

export interface YearWallRowsOptions<TMeta extends Record<string, unknown>> {
  year: number;
  /** Month names. Default: the locale's short names. */
  locale?: string;
  /** Which events the planner shows. Default: all. */
  match?: (event: CalendarEvent<TMeta>) => boolean;
}

/**
 * A wall planner: twelve rows of 31 columns, with `null` for the days a
 * month does not have. Multi-day events run as bands through their
 * month; single-day events reach the `#cell` slot, to be drawn as dots.
 */
export function yearWallRows<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  options: YearWallRowsOptions<TMeta>,
): BoardRow<TMeta>[] {
  const { year, locale, match } = options;
  const monthName = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, index) => {
    const month = Temporal.PlainYearMonth.from({ year, month: index + 1 });
    return {
      key: month.toString(),
      label: monthName.format(new Date(Date.UTC(year, index, 1))),
      kind: 'cells' as const,
      showCellEvents: false,
      ...(match ? { match } : {}),
      dates: Array.from({ length: 31 }, (_, day) =>
        day < month.daysInMonth ? month.toPlainDate({ day: day + 1 }) : null,
      ),
    };
  });
}

/** The column headers 1–31 of a wall planner. */
export function yearWallColumns(): Array<{ key: string; label: string }> {
  return Array.from({ length: 31 }, (_, i) => ({ key: String(i + 1), label: String(i + 1) }));
}

export interface ResourceWeekRowsOptions<TMeta extends Record<string, unknown>> {
  dates: ReadonlyArray<Temporal.PlainDate>;
  resources: ReadonlyArray<string>;
  resourcesOf: (event: CalendarEvent<TMeta>) => ReadonlyArray<string>;
  /** Keys of rows the host fills itself, below the resources. */
  extraRows?: ReadonlyArray<string>;
}

/**
 * One row per resource. A shared event stands in the row of each of
 * its resources. Events of no listed resource get a row of their own,
 * which appears only when there are any.
 */
export function resourceWeekRows<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  options: ResourceWeekRowsOptions<TMeta>,
): BoardRow<TMeta>[] {
  const { dates, resources, resourcesOf, extraRows = [] } = options;
  return [
    ...resources.map((id) => ({
      key: id,
      dates,
      kind: 'cells' as const,
      match: (event: CalendarEvent<TMeta>) => resourcesOf(event).includes(id),
    })),
    {
      key: BOARD_UNASSIGNED_ROW,
      dates,
      kind: 'cells' as const,
      hideWhenEmpty: true,
      match: (event: CalendarEvent<TMeta>) =>
        !resourcesOf(event).some((id) => resources.includes(id)),
    },
    ...extraRows.map((key) => ({ key, dates, kind: 'custom' as const })),
  ];
}
