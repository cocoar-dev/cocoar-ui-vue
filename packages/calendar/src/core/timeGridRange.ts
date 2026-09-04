/**
 * ONE model for every time-grid surface (day, multi-day, week, work
 * week): which dates the columns show, and how far paging moves.
 *
 * A surface is fully described by four parameters:
 *
 *   - `anchor` — where the first column stands: at the cursor, or the
 *     cursor snapped back to the locale's first day of the week.
 *   - `span`   — how many days from the anchor, or `'responsive'` for
 *     "as many complete columns as the container width allows".
 *   - `filter` — which of those days are drawn: all, or only the
 *     builder's `workDays`. The window (what loaders see) is always
 *     the unfiltered span — a Saturday IS in the rendered week, it's
 *     just not displayed.
 *   - `step`   — how far `next` / `prev` / a swipe moves the cursor:
 *     a fixed number of days, or `'span'` for "as many as are shown".
 *
 * The classic views are presets of this model, nothing more:
 *
 *   day (one)      cursor     1           all       span
 *   day (multi)    cursor     responsive  all       span
 *   week           weekStart  7           all       7
 *   work week      weekStart  7           workDays  7
 *
 * …and combinations that had no name before ("start Monday, show
 * five days, page by a week") are just another spec. Every feature
 * of the grid — swipe, hooks, all-day cap — lands in all of them
 * because there is only one resolver and one surface underneath.
 *
 * Pure: no DOM, no Vue. The caller measures the container and passes
 * the resolved responsive column count in.
 */

import type { Temporal } from '@js-temporal/polyfill';
import { type DayOfWeek, startOfWeek, temporalDowToCalendarDow } from './temporal';

export type TimeGridAnchor = 'cursor' | 'weekStart';
export type TimeGridFilter = 'all' | 'workDays';
/** The three views that render on the time grid. */
export type TimeGridView = 'day' | 'week' | 'workWeek';

export interface TimeGridRangeSpec {
  anchor: TimeGridAnchor;
  /** Days from the anchor (≥ 1), or as many complete columns as fit. */
  span: number | 'responsive';
  filter: TimeGridFilter;
  /** Days per page turn (≥ 1), or `'span'` = as many as are shown. */
  step: number | 'span';
}

export const TIME_GRID_PRESETS: Readonly<
  Record<'daySingle' | 'dayMulti' | 'week' | 'workWeek', TimeGridRangeSpec>
> = {
  daySingle: { anchor: 'cursor', span: 1, filter: 'all', step: 'span' },
  dayMulti: { anchor: 'cursor', span: 'responsive', filter: 'all', step: 'span' },
  week: { anchor: 'weekStart', span: 7, filter: 'all', step: 7 },
  workWeek: { anchor: 'weekStart', span: 7, filter: 'workDays', step: 7 },
};

/**
 * The spec a view renders with. `week` / `workWeek` are fixed presets
 * by definition; `day` honours an explicit `builder.timeGridRange(...)`
 * and otherwise follows `dayMode`.
 */
export function timeGridRangeSpecFor(
  view: TimeGridView,
  options: { dayMode?: 'single' | 'multiDay'; explicit?: TimeGridRangeSpec | null } = {},
): TimeGridRangeSpec {
  if (view === 'week') return TIME_GRID_PRESETS.week;
  if (view === 'workWeek') return TIME_GRID_PRESETS.workWeek;
  if (options.explicit) return options.explicit;
  return options.dayMode === 'multiDay' ? TIME_GRID_PRESETS.dayMulti : TIME_GRID_PRESETS.daySingle;
}

export interface ResolveTimeGridRangeOptions {
  spec: TimeGridRangeSpec;
  cursor: Temporal.PlainDate;
  /** 0 = Sun … 6 = Sat. Only read for the `weekStart` anchor. */
  firstDayOfWeek: DayOfWeek;
  /** Only read for the `workDays` filter. */
  workDays: readonly DayOfWeek[];
  /** The measured column count for a `'responsive'` span (≥ 1). */
  responsiveColumns: number;
}

export interface TimeGridRange {
  /** First day of the (unfiltered) span — the loader window's start. */
  start: Temporal.PlainDate;
  /** Length of the unfiltered span in days — the loader window's length. */
  spanDays: number;
  /** The dates actually rendered as columns, in order. */
  days: Temporal.PlainDate[];
  /** Days `next` / `prev` move the cursor. */
  stepDays: number;
}

export function resolveTimeGridRange(opts: ResolveTimeGridRangeOptions): TimeGridRange {
  const { spec, cursor, firstDayOfWeek, workDays } = opts;
  const start = spec.anchor === 'weekStart' ? startOfWeek(cursor, firstDayOfWeek) : cursor;
  const spanDays = resolveSpanDays(spec, opts.responsiveColumns);
  const all = Array.from({ length: spanDays }, (_, i) => start.add({ days: i }));
  const days =
    spec.filter === 'workDays'
      ? all.filter((d) => workDays.includes(temporalDowToCalendarDow(d.dayOfWeek)))
      : all;
  return { start, spanDays, days, stepDays: timeGridStepDays(spec, spanDays) };
}

/** The unfiltered span length for `spec` given the measured column count. */
export function resolveSpanDays(spec: TimeGridRangeSpec, responsiveColumns: number): number {
  if (spec.span === 'responsive') return Math.max(1, Math.floor(responsiveColumns));
  return Math.max(1, Math.floor(spec.span));
}

/** Days one page turn moves for `spec` whose span resolved to `spanDays`. */
export function timeGridStepDays(spec: TimeGridRangeSpec, spanDays: number): number {
  if (spec.step === 'span') return Math.max(1, spanDays);
  return Math.max(1, Math.floor(spec.step));
}
