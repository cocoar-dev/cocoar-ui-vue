/**
 * Tests for `core/viewWindow.ts`.
 *
 * Property tests prove the bedrock invariants:
 *   - Window always contains the cursor (day, week, month, agenda)
 *   - Week / month windows align to firstDayOfWeek
 *   - Window start is strictly less than end
 *   - daysInWindow + windowDayCount agree
 *   - navigateCursor + computeViewWindow round-trip predictably
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  Temporal,
  type DayOfWeek,
  temporalDowToCalendarDow,
} from '../temporal';
import {
  computeViewWindow,
  daysInWindow,
  windowDayCount,
  windowContainsDate,
  navigateCursor,
} from '../viewWindow';
import type { CalendarView } from '../types';

// ─── Specific cases ──────────────────────────────────────────────────

describe('computeViewWindow — day', () => {
  it('start == cursor, end == cursor + 1 day', () => {
    const cursor = Temporal.PlainDate.from('2026-04-15');
    const w = computeViewWindow({ view: 'day', cursor, firstDayOfWeek: 1, timezone: 'UTC' });
    expect(w).toEqual({ view: 'day', start: '2026-04-15', end: '2026-04-16', timezone: 'UTC' });
  });
});

describe('computeViewWindow — week (Monday-start)', () => {
  it('Wednesday cursor anchors to the prior Monday, end the next Monday', () => {
    const cursor = Temporal.PlainDate.from('2026-04-15'); // Wed
    const w = computeViewWindow({ view: 'week', cursor, firstDayOfWeek: 1, timezone: 'UTC' });
    expect(w).toEqual({ view: 'week', start: '2026-04-13', end: '2026-04-20', timezone: 'UTC' });
  });
});

describe('computeViewWindow — week (Sunday-start)', () => {
  it('Wednesday cursor anchors to the prior Sunday', () => {
    const cursor = Temporal.PlainDate.from('2026-04-15');
    const w = computeViewWindow({ view: 'week', cursor, firstDayOfWeek: 0, timezone: 'UTC' });
    expect(w).toEqual({ view: 'week', start: '2026-04-12', end: '2026-04-19', timezone: 'UTC' });
  });
});

describe('computeViewWindow — month', () => {
  it('full 6×7 grid window (42 days)', () => {
    // April 2026 starts on a Wednesday (Apr 1 is Wed).
    // Monday-start: grid leading days = Mon Mar 30, Tue Mar 31, Wed Apr 1, …
    const cursor = Temporal.PlainDate.from('2026-04-15');
    const w = computeViewWindow({ view: 'month', cursor, firstDayOfWeek: 1, timezone: 'UTC' });
    expect(w.start).toBe('2026-03-30');
    // 42 days from Mar 30 (Mon) → Apr 30 + leading + trailing = May 10 (Sun).
    // start + 42 days → next day after window end.
    const span = Temporal.PlainDate.from(w.end).since(
      Temporal.PlainDate.from(w.start),
      { largestUnit: 'days' },
    ).days;
    expect(span).toBe(42);
  });
});

describe('computeViewWindow — agenda', () => {
  it('default 30-day window forward', () => {
    const cursor = Temporal.PlainDate.from('2026-04-15');
    const w = computeViewWindow({ view: 'agenda', cursor, firstDayOfWeek: 1, timezone: 'UTC' });
    expect(w).toEqual({
      view: 'agenda',
      start: '2026-04-15',
      end: '2026-05-15',
      timezone: 'UTC',
    });
  });
  it('custom length', () => {
    const cursor = Temporal.PlainDate.from('2026-04-15');
    const w = computeViewWindow({
      view: 'agenda',
      cursor,
      firstDayOfWeek: 1,
        timezone: 'UTC',
      agendaLengthDays: 7,
    });
    expect(w.end).toBe('2026-04-22');
  });
});

// ─── Property tests ─────────────────────────────────────────────────

const dateArb = fc.integer({ min: 0, max: 365 * 30 }).map((n) =>
  Temporal.PlainDate.from('2010-01-01').add({ days: n }),
);
const fdowArb = fc.integer({ min: 0, max: 6 });
const viewArb: fc.Arbitrary<CalendarView> = fc.constantFrom(
  'day',
  'week',
  'month',
  'agenda',
);

describe('computeViewWindow — properties', () => {
  it('window always contains the cursor', () => {
    fc.assert(
      fc.property(viewArb, dateArb, fdowArb, (view, cursor, fdow) => {
        const w = computeViewWindow({
          view,
          cursor,
          firstDayOfWeek: fdow as DayOfWeek,
          timezone: 'UTC',
        });
        expect(windowContainsDate(w, cursor)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('end is strictly after start', () => {
    fc.assert(
      fc.property(viewArb, dateArb, fdowArb, (view, cursor, fdow) => {
        const w = computeViewWindow({
          view,
          cursor,
          firstDayOfWeek: fdow as DayOfWeek,
          timezone: 'UTC',
        });
        expect(
          Temporal.PlainDate.compare(
            Temporal.PlainDate.from(w.start),
            Temporal.PlainDate.from(w.end),
          ),
        ).toBeLessThan(0);
      }),
      { numRuns: 200 },
    );
  });

  it('week-view start aligns to firstDayOfWeek', () => {
    fc.assert(
      fc.property(dateArb, fdowArb, (cursor, fdow) => {
        const w = computeViewWindow({
          view: 'week',
          cursor,
          firstDayOfWeek: fdow as DayOfWeek,
          timezone: 'UTC',
        });
        const start = Temporal.PlainDate.from(w.start);
        expect(temporalDowToCalendarDow(start.dayOfWeek)).toBe(fdow);
      }),
      { numRuns: 200 },
    );
  });

  it('month-view start aligns to firstDayOfWeek', () => {
    fc.assert(
      fc.property(dateArb, fdowArb, (cursor, fdow) => {
        const w = computeViewWindow({
          view: 'month',
          cursor,
          firstDayOfWeek: fdow as DayOfWeek,
          timezone: 'UTC',
        });
        const start = Temporal.PlainDate.from(w.start);
        expect(temporalDowToCalendarDow(start.dayOfWeek)).toBe(fdow);
      }),
      { numRuns: 200 },
    );
  });

  it('month-view window is exactly 42 days', () => {
    fc.assert(
      fc.property(dateArb, fdowArb, (cursor, fdow) => {
        const w = computeViewWindow({
          view: 'month',
          cursor,
          firstDayOfWeek: fdow as DayOfWeek,
          timezone: 'UTC',
        });
        expect(windowDayCount(w)).toBe(42);
      }),
      { numRuns: 200 },
    );
  });

  it('week-view window is exactly 7 days', () => {
    fc.assert(
      fc.property(dateArb, fdowArb, (cursor, fdow) => {
        const w = computeViewWindow({
          view: 'week',
          cursor,
          firstDayOfWeek: fdow as DayOfWeek,
          timezone: 'UTC',
        });
        expect(windowDayCount(w)).toBe(7);
      }),
      { numRuns: 200 },
    );
  });

  it('day-view window is exactly 1 day', () => {
    fc.assert(
      fc.property(dateArb, fdowArb, (cursor, fdow) => {
        const w = computeViewWindow({
          view: 'day',
          cursor,
          firstDayOfWeek: fdow as DayOfWeek,
          timezone: 'UTC',
        });
        expect(windowDayCount(w)).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('month-view contains every day of the cursor\'s calendar month', () => {
    fc.assert(
      fc.property(dateArb, fdowArb, (cursor, fdow) => {
        const w = computeViewWindow({
          view: 'month',
          cursor,
          firstDayOfWeek: fdow as DayOfWeek,
          timezone: 'UTC',
        });
        const ym = Temporal.PlainYearMonth.from({
          year: cursor.year,
          month: cursor.month,
        });
        for (let day = 1; day <= ym.daysInMonth; day++) {
          expect(windowContainsDate(w, ym.toPlainDate({ day }))).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Window utilities ───────────────────────────────────────────────

describe('daysInWindow', () => {
  it('iterates each day inclusive of start, exclusive of end', () => {
    const w = computeViewWindow({
      view: 'day',
      cursor: Temporal.PlainDate.from('2026-04-15'),
      firstDayOfWeek: 1,
        timezone: 'UTC',
    });
    const days = [...daysInWindow(w)];
    expect(days.map((d) => d.toString())).toEqual(['2026-04-15']);
  });
  it('count matches windowDayCount across all views', () => {
    fc.assert(
      fc.property(viewArb, dateArb, fdowArb, (view, cursor, fdow) => {
        const w = computeViewWindow({
          view,
          cursor,
          firstDayOfWeek: fdow as DayOfWeek,
          timezone: 'UTC',
        });
        expect([...daysInWindow(w)].length).toBe(windowDayCount(w));
      }),
      { numRuns: 100 },
    );
  });
});

describe('windowContainsDate — boundary cases', () => {
  it('start is included, end is excluded', () => {
    const w = computeViewWindow({
      view: 'week',
      cursor: Temporal.PlainDate.from('2026-04-15'),
      firstDayOfWeek: 1,
        timezone: 'UTC',
    });
    expect(windowContainsDate(w, Temporal.PlainDate.from(w.start))).toBe(true);
    expect(windowContainsDate(w, Temporal.PlainDate.from(w.end))).toBe(false);
    // Last contained day is end - 1.
    const lastIncluded = Temporal.PlainDate.from(w.end).subtract({ days: 1 });
    expect(windowContainsDate(w, lastIncluded)).toBe(true);
  });
});

// ─── navigateCursor ─────────────────────────────────────────────────

describe('navigateCursor', () => {
  it('day: ±1 day', () => {
    const c = Temporal.PlainDate.from('2026-04-15');
    expect(navigateCursor('day', c, 'next').toString()).toBe('2026-04-16');
    expect(navigateCursor('day', c, 'prev').toString()).toBe('2026-04-14');
  });
  it('week: ±7 days', () => {
    const c = Temporal.PlainDate.from('2026-04-15');
    expect(navigateCursor('week', c, 'next').toString()).toBe('2026-04-22');
    expect(navigateCursor('week', c, 'prev').toString()).toBe('2026-04-08');
  });
  it('month: ±1 calendar month', () => {
    const c = Temporal.PlainDate.from('2026-04-15');
    expect(navigateCursor('month', c, 'next').toString()).toBe('2026-05-15');
    expect(navigateCursor('month', c, 'prev').toString()).toBe('2026-03-15');
  });
  it('month: end-of-month clamping when target month is shorter', () => {
    // Jan 31 → Feb 28 (or 29 in leap years). Temporal clamps automatically.
    const c = Temporal.PlainDate.from('2026-01-31');
    const r = navigateCursor('month', c, 'next');
    expect(r.month).toBe(2);
    expect(r.day).toBeLessThanOrEqual(28);
  });
  it('agenda: ± lengthDays', () => {
    const c = Temporal.PlainDate.from('2026-04-15');
    expect(navigateCursor('agenda', c, 'next', 14).toString()).toBe('2026-04-29');
    expect(navigateCursor('agenda', c, 'prev', 14).toString()).toBe('2026-04-01');
  });

  it('next-then-prev returns to original cursor', () => {
    fc.assert(
      fc.property(viewArb, dateArb, (view, cursor) => {
        const next = navigateCursor(view, cursor, 'next');
        const back = navigateCursor(view, next, 'prev');
        // For most views and cursors this round-trips exactly.
        // The exception is end-of-month clamping in month view:
        // Jan 31 → Feb 28 → Jan 28 (loses 3 days).
        if (view === 'month' && cursor.day > 28) return;
        expect(back.toString()).toBe(cursor.toString());
      }),
      { numRuns: 100 },
    );
  });
});
