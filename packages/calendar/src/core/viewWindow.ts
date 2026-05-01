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
import {
  type DayOfWeek,
  startOfWeek,
  monthGridDates,
} from './temporal';
import type { CalendarView, ViewWindow } from './types';

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
}

/**
 * Compute the visible date range for a calendar view.
 *
 * @returns ViewWindow with `start` inclusive and `end` exclusive,
 *          both as `YYYY-MM-DD` strings.
 */
export function computeViewWindow(opts: ViewWindowOptions): ViewWindow {
  const { view, cursor, firstDayOfWeek } = opts;

  switch (view) {
    case 'day': {
      // Single day. End is the next day (exclusive).
      return {
        view,
        start: cursor.toString(),
        end: cursor.add({ days: 1 }).toString(),
      };
    }

    case 'week': {
      const weekStart = startOfWeek(cursor, firstDayOfWeek);
      // 7 days. End = weekStart + 7 (exclusive).
      return {
        view,
        start: weekStart.toString(),
        end: weekStart.add({ days: 7 }).toString(),
      };
    }

    case 'month': {
      // Month view's window is the FULL 6×7 grid, not just the
      // calendar month. This way the view sees events on the
      // leading / trailing days that fall in the grid.
      const ym = Temporal.PlainYearMonth.from({
        year: cursor.year,
        month: cursor.month,
      });
      const grid = monthGridDates(ym, firstDayOfWeek);
      // grid is 42 dates; start = grid[0], end = grid[41] + 1 day.
      return {
        view,
        start: grid[0].toString(),
        end: grid[41].add({ days: 1 }).toString(),
      };
    }

    case 'agenda': {
      const length = opts.agendaLengthDays ?? 30;
      return {
        view,
        start: cursor.toString(),
        end: cursor.add({ days: length }).toString(),
      };
    }

    case 'timeline':
    case 'year': {
      // v2 placeholders. For Phase 1 we accept the call and return a
      // sensible default so consumers can preview the surface, but
      // the views themselves don't ship until v2.
      return {
        view,
        start: cursor.toString(),
        end: cursor.add({ days: 1 }).toString(),
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
  return (
    Temporal.PlainDate.compare(date, start) >= 0 &&
    Temporal.PlainDate.compare(date, end) < 0
  );
}

/**
 * Navigate forward / backward by one logical "page" in the view.
 *
 * - day: ±1 day
 * - week: ±7 days
 * - month: ±1 month (from the cursor's calendar month)
 * - agenda: ± agendaLengthDays
 *
 * Returns the new cursor for the next computeViewWindow call.
 */
export function navigateCursor(
  view: CalendarView,
  cursor: Temporal.PlainDate,
  direction: 'prev' | 'next',
  agendaLengthDays = 30,
): Temporal.PlainDate {
  const sign = direction === 'next' ? 1 : -1;
  switch (view) {
    case 'day':
      return cursor.add({ days: 1 * sign });
    case 'week':
      return cursor.add({ days: 7 * sign });
    case 'month':
      return cursor.add({ months: 1 * sign });
    case 'agenda':
      return cursor.add({ days: agendaLengthDays * sign });
    case 'timeline':
    case 'year':
      // v2 — fall back to month-by-month navigation for `year`,
      // day-by-day for `timeline`. Placeholders.
      return view === 'year'
        ? cursor.add({ months: 1 * sign })
        : cursor.add({ days: 1 * sign });
    default: {
      const _exhaustive: never = view;
      void _exhaustive;
      throw new Error(`Unsupported view: ${String(view)}`);
    }
  }
}
