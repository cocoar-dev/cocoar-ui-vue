/**
 * `core/viewWindow.ts` — pure functions that compute the visible
 * date range for each calendar view.
 *
 * Every view answers one question: "given a cursor date and a
 * locale, what range of dates should I render?". The answer is a
 * `ViewWindow` with `start` (inclusive) and `end` (exclusive)
 * dates.
 *
 * Conventions:
 *   - For month/week/day/agenda views, the bounds are date-only
 *     (`'2026-04-13'`). The calendar's day-of-day rendering does
 *     NOT depend on the time portion; events that span across the
 *     boundary are clipped at render time, not at window-compute.
 *   - The MONTH view's window is the bounding rectangle of the
 *     6×7 grid — i.e. extends backward to the start of the visual
 *     first week and forward to the end of the visual last week.
 *     This way the month view sees ALL the events shown in its
 *     grid, including the leading / trailing days from adjacent
 *     months.
 *   - The AGENDA view is unbounded forward; the caller supplies a
 *     `lengthDays` to bound it.
 *
 * All functions are pure. No DOM, no Vue, no side effects.
 */

import { Temporal } from '@js-temporal/polyfill';
import { type DayOfWeek, startOfWeek, monthGridDates } from './temporal';

/** Default `workDays` — Mon–Fri using the 0=Sun..6=Sat convention. */
export const DEFAULT_WORK_DAYS: readonly DayOfWeek[] = [1, 2, 3, 4, 5];
import type { CalendarView, ViewWindow } from './types';
import {
  resolveTimeGridRange,
  timeGridRangeSpecFor,
  type TimeGridRangeSpec,
} from './timeGridRange';

export interface ViewWindowOptions {
  view: CalendarView;
  /** Cursor date — the date the user is "looking at". */
  cursor: Temporal.PlainDate;
  /** Used for week-aligned views (month, week). 0 = Sun … 6 = Sat. */
  firstDayOfWeek: DayOfWeek;
  /**
   * Agenda-view length in days. Default 30 (about a month forward).
   * Ignored for non-agenda views.
   */
  agendaLengthDays?: number;
  /**
   * Timeline-view length in days. Default 60.
   * Ignored for non-timeline views.
   */
  timelineRangeDays?: number;
  /**
   * Resolved column count for a `'responsive'` time-grid span (the
   * day view measures its container). Default 1. Ignored by views
   * whose spec has a fixed span.
   */
  dayColumnCount?: number;
  /**
   * Explicit time-grid range spec for the `day` view
   * (`builder.timeGridRange(...)`). `week` / `workWeek` are fixed
   * presets and ignore it. Without it the day view is one column.
   */
  timeGridRange?: TimeGridRangeSpec | null;
  /** Adjacent calendar months loaded around the cursor for the continuous month surface. */
  monthBuffer?: number;
  /**
   * IANA display timezone — written through to `ViewWindow.timezone`
   * so loaders can derive the correct instant range.
   */
  timezone: string;
}

/**
 * Compute the visible date range for a calendar view.
 *
 * @returns ViewWindow with `start` inclusive and `end` exclusive,
 *          both as `YYYY-MM-DD` strings.
 */
export function computeViewWindow(opts: ViewWindowOptions): ViewWindow {
  const { view, cursor, firstDayOfWeek, timezone } = opts;

  switch (view) {
    case 'day':
    case 'week':
    case 'workWeek': {
      // ONE resolver for every time-grid surface (`timeGridRange.ts`).
      // The window is the UNFILTERED span: a work week's loaders see
      // weekend events too, and `windowContainsDate` stays intuitive
      // (Saturday IS in the rendered week, just not displayed). The
      // surface filters the column dates itself.
      const spec = timeGridRangeSpecFor(view, {
        dayMode: 'multiDay',
        explicit: view === 'day' ? (opts.timeGridRange ?? null) : null,
      });
      const range = resolveTimeGridRange({
        spec,
        cursor,
        firstDayOfWeek,
        workDays: [],
        responsiveColumns: opts.dayColumnCount ?? 1,
      });
      return {
        view,
        start: range.start.toString(),
        end: range.start.add({ days: range.spanDays }).toString(),
        timezone,
      };
    }

    case 'dayAgenda': {
      const weekStart = startOfWeek(cursor, firstDayOfWeek);
      return {
        view,
        start: weekStart.toString(),
        end: weekStart.add({ days: 7 }).toString(),
        timezone,
      };
    }

    case 'month': {
      const buffer = Math.max(0, Math.floor(opts.monthBuffer ?? 0));
      const ym = Temporal.PlainYearMonth.from({
        year: cursor.year,
        month: cursor.month,
      });
      const firstGrid = monthGridDates(ym.subtract({ months: buffer }), firstDayOfWeek);
      const lastGrid = monthGridDates(ym.add({ months: buffer }), firstDayOfWeek);
      return {
        view,
        start: firstGrid[0].toString(),
        end: lastGrid[41].add({ days: 1 }).toString(),
        timezone,
      };
    }

    case 'monthList': {
      const ym = Temporal.PlainYearMonth.from({ year: cursor.year, month: cursor.month });
      const grid = monthGridDates(ym, firstDayOfWeek);
      return {
        view,
        start: grid[0].toString(),
        end: grid[41].add({ days: 1 }).toString(),
        timezone,
      };
    }

    case 'agenda': {
      const length = opts.agendaLengthDays ?? 30;
      return {
        view,
        start: cursor.toString(),
        end: cursor.add({ days: length }).toString(),
        timezone,
      };
    }

    case 'timeline': {
      const length = opts.timelineRangeDays ?? 60;
      return {
        view,
        start: cursor.toString(),
        end: cursor.add({ days: length }).toString(),
        timezone,
      };
    }

    case 'year': {
      const start = Temporal.PlainDate.from({ year: cursor.year, month: 1, day: 1 });
      return {
        view,
        start: start.toString(),
        end: start.add({ years: 1 }).toString(),
        timezone,
      };
    }

    default: {
      // Exhaustiveness check — unreachable when CalendarView is
      // properly typed.
      const _exhaustive: never = view;
      void _exhaustive;
      throw new Error(`Unsupported view: ${String(view)}`);
    }
  }
}

// ─── Window utilities ────────────────────────────────────────────────

/**
 * Iterate the days inside a window (inclusive start, exclusive end).
 *
 * Useful for views that render per-day (agenda groups, week columns).
 */
export function* daysInWindow(window: ViewWindow): Generator<Temporal.PlainDate> {
  let cur = Temporal.PlainDate.from(window.start);
  const end = Temporal.PlainDate.from(window.end);
  while (Temporal.PlainDate.compare(cur, end) < 0) {
    yield cur;
    cur = cur.add({ days: 1 });
  }
}

/**
 * Number of days in the window (always integer; end-start in days).
 */
export function windowDayCount(window: ViewWindow): number {
  const start = Temporal.PlainDate.from(window.start);
  const end = Temporal.PlainDate.from(window.end);
  return end.since(start, { largestUnit: 'days' }).days;
}

/**
 * True when `date` falls inside `window` (inclusive start, exclusive end).
 */
export function windowContainsDate(window: ViewWindow, date: Temporal.PlainDate): boolean {
  const start = Temporal.PlainDate.from(window.start);
  const end = Temporal.PlainDate.from(window.end);
  return Temporal.PlainDate.compare(date, start) >= 0 && Temporal.PlainDate.compare(date, end) < 0;
}

/**
 * Navigate forward / backward by one logical "page" in the view.
 *
 * - day: ± the rendered column count (the time-grid preset's step)
 * - week / workWeek: ±7 days
 * - month: ±1 month (from the cursor's calendar month)
 * - agenda: ± agendaLengthDays
 *
 * The builder resolves the time-grid views through
 * `timeGridStepDays(spec, spanDays)` so an explicit
 * `builder.timeGridRange(...)` step applies; this function keeps the
 * preset semantics for direct callers.
 *
 * Returns the new cursor for the next computeViewWindow call.
 */
export function navigateCursor(
  view: CalendarView,
  cursor: Temporal.PlainDate,
  direction: 'prev' | 'next',
  agendaLengthDays = 30,
  timelineRangeDays = 60,
  dayColumnCount = 1,
): Temporal.PlainDate {
  const sign = direction === 'next' ? 1 : -1;
  switch (view) {
    case 'day':
      return cursor.add({ days: Math.max(1, dayColumnCount) * sign });
    case 'dayAgenda':
    case 'week':
    case 'workWeek':
      // workWeek navigates by full week (7 days) — the workday
      // filter is purely a render concern, not a navigation one.
      // Stepping by 5 would leave the cursor on a weekend on every
      // other prev/next click.
      return cursor.add({ days: 7 * sign });
    case 'month':
    case 'monthList':
      return cursor.add({ months: 1 * sign });
    case 'agenda':
      return cursor.add({ days: agendaLengthDays * sign });
    case 'timeline':
      return cursor.add({ days: timelineRangeDays * sign });
    case 'year':
      return cursor.add({ years: 1 * sign });
    default: {
      const _exhaustive: never = view;
      void _exhaustive;
      throw new Error(`Unsupported view: ${String(view)}`);
    }
  }
}
