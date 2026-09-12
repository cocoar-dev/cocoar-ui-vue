/**
 * Tests for `core/monthGridLayout.ts`.
 *
 * Edge cases the month view depends on:
 *   - Multi-day events spanning across week-row boundaries → split
 *     into multiple bars, each clipped to its row.
 *   - Single-day events → pills on their start day.
 *   - Timed events → pinned to the start day as pills (we don't
 *     render times in month view).
 *   - All-day events with end-exclusive (RFC 5545) → end day is
 *     `end - 1 day`.
 *   - Same id appearing twice → deduped.
 *
 * Property tests prove invariants over 100s of random inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Temporal, monthGridDates, dateKey } from '../temporal';
import {
  layoutMonthGrid,
  capMonthCellPills,
  capMonthRowLanes,
  monthCellPillLimit,
  MONTH_COMPACT_VISIBLE_PILLS,
  MONTH_STACKED_VISIBLE_PILLS,
  type MonthCellPill,
} from '../monthGridLayout';
import type { CalendarEvent } from '../types';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

const APRIL_2026 = Temporal.PlainYearMonth.from({ year: 2026, month: 4 });
// Monday-start grid for April 2026:
//   Apr 1 is Wed → leading days = Mar 30 (Mon), Mar 31 (Tue)
//   42 cells from Mon Mar 30 to Sun May 10
const GRID = monthGridDates(APRIL_2026, 1);

function evTimed(id: string, start: string, end?: string): CalendarEvent {
  return { id, start: zdt(start), end: end ? zdt(end) : undefined };
}
function evAllDay(id: string, start: string, end?: string): CalendarEvent {
  return { id, start: pd(start), end: end ? pd(end) : undefined };
}

// ─── Specific cases ─────────────────────────────────────────────────

describe('layoutMonthGrid — basic shape', () => {
  it('always returns 6 week rows', () => {
    const r = layoutMonthGrid([], { gridDates: GRID, timezone: 'UTC' });
    expect(r.weekRows.length).toBe(6);
  });

  it('rejects gridDates with wrong length', () => {
    expect(() => layoutMonthGrid([], { gridDates: GRID.slice(0, 41), timezone: 'UTC' })).toThrow(
      RangeError,
    );
  });

  it('each row carries its 7 days in column order', () => {
    const r = layoutMonthGrid([], { gridDates: GRID, timezone: 'UTC' });
    for (let i = 0; i < 6; i++) {
      const row = r.weekRows[i];
      expect(row.days.length).toBe(7);
      for (let c = 0; c < 7; c++) {
        expect(row.days[c].toString()).toBe(GRID[i * 7 + c].toString());
      }
    }
  });
});

describe('layoutMonthGrid — single-day events as cell pills', () => {
  it('places a date-only event as a pill on its day', () => {
    const r = layoutMonthGrid([evAllDay('a', '2026-04-15')], {
      gridDates: GRID,
      timezone: 'UTC',
    });
    // Row containing Apr 15 is row index 2 (rows: 0=Mar30-Apr5,
    // 1=Apr6-12, 2=Apr13-19, ...)
    const pillRow = r.weekRows.find((row) => row.days.some((d) => d.toString() === '2026-04-15'))!;
    const pills = pillRow.cellPills.get('2026-04-15') ?? [];
    expect(pills.length).toBe(1);
    expect(pills[0].event.id).toBe('a');
    expect(pillRow.multiDayBars.length).toBe(0);
  });

  it('timed event ends up as a pill on its start day (no bar)', () => {
    const r = layoutMonthGrid([evTimed('mtg', '2026-04-15T09:00:00', '2026-04-15T10:00:00')], {
      gridDates: GRID,
      timezone: 'UTC',
    });
    const pillRow = r.weekRows.find((row) => row.days.some((d) => d.toString() === '2026-04-15'))!;
    expect(pillRow.cellPills.get('2026-04-15')!.length).toBe(1);
    expect(pillRow.multiDayBars.length).toBe(0);
  });

  it('multiple events on the same day get sequential `order`', () => {
    const r = layoutMonthGrid(
      [
        evAllDay('a', '2026-04-15'),
        evTimed('b', '2026-04-15T09:00:00'),
        evTimed('c', '2026-04-15T14:00:00'),
      ],
      { gridDates: GRID, timezone: 'UTC' },
    );
    const pillRow = r.weekRows.find((row) => row.days.some((d) => d.toString() === '2026-04-15'))!;
    const pills = pillRow.cellPills.get('2026-04-15')!;
    expect(pills.length).toBe(3);
    expect(pills.map((p) => p.order)).toEqual([0, 1, 2]);
  });
});

describe('layoutMonthGrid — multi-day events as bars', () => {
  it('Mon-Wed conference renders as one bar in row 2 (Mon-Wed)', () => {
    // 2026-04-13 (Mon) → 2026-04-16 (exclusive) = inclusive Wed.
    const r = layoutMonthGrid([evAllDay('conf', '2026-04-13', '2026-04-16')], {
      gridDates: GRID,
      timezone: 'UTC',
    });
    const row = r.weekRows[2];
    expect(row.multiDayBars.length).toBe(1);
    const bar = row.multiDayBars[0];
    expect(bar.event.id).toBe('conf');
    expect(bar.startCol).toBe(0); // Mon
    expect(bar.endCol).toBe(2); // Wed
    expect(bar.clippedStart).toBe(false);
    expect(bar.clippedEnd).toBe(false);
  });

  it('event spanning two week rows becomes two bars (clipped per row)', () => {
    // Apr 17 (Fri row 2) → Apr 22 (exclusive) = inclusive Apr 21
    // (Tue row 3). Expect:
    //   row 2: Fri-Sun (cols 4-6), clippedEnd=true
    //   row 3: Mon-Tue (cols 0-1), clippedStart=true
    const r = layoutMonthGrid([evAllDay('long', '2026-04-17', '2026-04-22')], {
      gridDates: GRID,
      timezone: 'UTC',
    });
    const row2 = r.weekRows[2];
    const row3 = r.weekRows[3];
    expect(row2.multiDayBars.length).toBe(1);
    expect(row3.multiDayBars.length).toBe(1);

    expect(row2.multiDayBars[0].startCol).toBe(4);
    expect(row2.multiDayBars[0].endCol).toBe(6);
    expect(row2.multiDayBars[0].clippedStart).toBe(false);
    expect(row2.multiDayBars[0].clippedEnd).toBe(true);

    expect(row3.multiDayBars[0].startCol).toBe(0);
    expect(row3.multiDayBars[0].endCol).toBe(1);
    expect(row3.multiDayBars[0].clippedStart).toBe(true);
    expect(row3.multiDayBars[0].clippedEnd).toBe(false);
  });

  it('event entirely outside the grid is excluded', () => {
    // Grid is Mar 30 - May 10. An event in February:
    const r = layoutMonthGrid([evAllDay('feb', '2026-02-15', '2026-02-20')], {
      gridDates: GRID,
      timezone: 'UTC',
    });
    expect(r.weekRows.every((row) => row.multiDayBars.length === 0)).toBe(true);
  });

  it('event partly in grid: leading days from prior month covered', () => {
    // Mar 28 (Sat) → Apr 3 (Fri exclusive) = inclusive Apr 2 (Thu).
    // Grid starts Mar 30 (Mon). Visible portion: Mar 30 - Apr 2.
    const r = layoutMonthGrid([evAllDay('crossing', '2026-03-28', '2026-04-03')], {
      gridDates: GRID,
      timezone: 'UTC',
    });
    // Row 0 = Mar 30 - Apr 5. Bar should span Mon-Thu, cols 0-3.
    const row0 = r.weekRows[0];
    expect(row0.multiDayBars.length).toBe(1);
    expect(row0.multiDayBars[0].startCol).toBe(0); // Mon Mar 30
    expect(row0.multiDayBars[0].endCol).toBe(3); // Thu Apr 2
    expect(row0.multiDayBars[0].clippedStart).toBe(true);
    expect(row0.multiDayBars[0].clippedEnd).toBe(false);
  });

  it('overlapping multi-day bars in one row get separate lanes', () => {
    const r = layoutMonthGrid(
      [
        evAllDay('a', '2026-04-13', '2026-04-16'), // Mon-Wed
        evAllDay('b', '2026-04-14', '2026-04-17'), // Tue-Thu
      ],
      { gridDates: GRID, timezone: 'UTC' },
    );
    const row2 = r.weekRows[2];
    expect(row2.multiDayBars.length).toBe(2);
    const lanes = new Set(row2.multiDayBars.map((b) => b.lane));
    expect(lanes.size).toBe(2);
    expect(row2.multiDayBars[0].laneCount).toBe(2);
  });

  it('non-overlapping multi-day bars share lane 0', () => {
    const r = layoutMonthGrid(
      [
        evAllDay('a', '2026-04-13', '2026-04-15'), // Mon-Tue
        evAllDay('b', '2026-04-16', '2026-04-18'), // Thu-Fri
      ],
      { gridDates: GRID, timezone: 'UTC' },
    );
    const row2 = r.weekRows[2];
    expect(row2.multiDayBars.length).toBe(2);
    expect(row2.multiDayBars.every((b) => b.lane === 0)).toBe(true);
    expect(row2.multiDayBars.every((b) => b.laneCount === 1)).toBe(true);
  });

  it('lane assignment is per-row (a busy row 2 does not widen row 3)', () => {
    const r = layoutMonthGrid(
      [
        evAllDay('a', '2026-04-13', '2026-04-16'), // row 2 — busy
        evAllDay('b', '2026-04-13', '2026-04-16'),
        evAllDay('c', '2026-04-13', '2026-04-16'),
        evAllDay('solo', '2026-04-20', '2026-04-22'), // row 3 — solo
      ],
      { gridDates: GRID, timezone: 'UTC' },
    );
    expect(r.weekRows[2].multiDayBars[0].laneCount).toBe(3);
    expect(r.weekRows[3].multiDayBars[0].laneCount).toBe(1);
  });
});

describe('layoutMonthGrid — defensive', () => {
  it('dedupes events with the same id', () => {
    const r = layoutMonthGrid([evAllDay('dup', '2026-04-15'), evAllDay('dup', '2026-04-15')], {
      gridDates: GRID,
      timezone: 'UTC',
    });
    const pillRow = r.weekRows.find((row) => row.days.some((d) => d.toString() === '2026-04-15'))!;
    expect(pillRow.cellPills.get('2026-04-15')!.length).toBe(1);
  });
});

// ─── Property tests ────────────────────────────────────────────────

describe('layoutMonthGrid — properties', () => {
  // Generate dates inside the visible grid (Mar 30 - May 10 = 42 days).
  const dayInGridArb = fc.integer({ min: 0, max: 41 }).map((n) => GRID[n]);

  // Single-day all-day events.
  const dayPillArb = fc
    .tuple(fc.integer({ min: 0, max: 1_000_000 }), dayInGridArb)
    .map(([n, day]): CalendarEvent => ({ id: `e-${n}`, start: day }));

  // Multi-day all-day events; spans 1-7 days inside the grid.
  const multiDayArb = fc
    .tuple(
      fc.integer({ min: 0, max: 1_000_000 }),
      fc.integer({ min: 0, max: 35 }),
      fc.integer({ min: 1, max: 7 }),
    )
    .map(([n, startN, span]): CalendarEvent => {
      const startD = GRID[startN];
      const endD = startD.add({ days: span });
      return {
        id: `m-${n}`,
        start: startD,
        end: endD,
      };
    });

  it('always 6 rows for any input', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(dayPillArb, multiDayArb), { maxLength: 50 }), (events) => {
        const r = layoutMonthGrid(events, { gridDates: GRID, timezone: 'UTC' });
        expect(r.weekRows.length).toBe(6);
      }),
      { numRuns: 100 },
    );
  });

  it('every cell pill is on a date present in its row', () => {
    fc.assert(
      fc.property(fc.array(dayPillArb, { maxLength: 30 }), (events) => {
        const r = layoutMonthGrid(events, { gridDates: GRID, timezone: 'UTC' });
        for (const row of r.weekRows) {
          const rowKeys = new Set(row.days.map((d) => dateKey(d)));
          for (const [key] of row.cellPills) {
            expect(rowKeys.has(key)).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('multi-day bars stay within their row [startCol, endCol] in [0, 7)', () => {
    fc.assert(
      fc.property(fc.array(multiDayArb, { maxLength: 30 }), (events) => {
        const r = layoutMonthGrid(events, { gridDates: GRID, timezone: 'UTC' });
        for (const row of r.weekRows) {
          for (const bar of row.multiDayBars) {
            expect(bar.startCol).toBeGreaterThanOrEqual(0);
            expect(bar.startCol).toBeLessThanOrEqual(bar.endCol);
            expect(bar.endCol).toBeLessThan(7);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('no two bars in the same row share a (lane, column) cell', () => {
    fc.assert(
      fc.property(fc.array(multiDayArb, { maxLength: 30 }), (events) => {
        const byId = new Map<string, CalendarEvent>();
        for (const e of events) byId.set(e.id, e);
        const r = layoutMonthGrid([...byId.values()], {
          gridDates: GRID,
          timezone: 'UTC',
        });
        for (const row of r.weekRows) {
          const bars = row.multiDayBars;
          for (let i = 0; i < bars.length; i++) {
            for (let j = i + 1; j < bars.length; j++) {
              if (bars[i].lane !== bars[j].lane) continue;
              const overlap =
                bars[i].startCol <= bars[j].endCol && bars[j].startCol <= bars[i].endCol;
              expect(overlap).toBe(false);
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Per-cell pill cap ───────────────────────────────────────────────

describe('capMonthCellPills — "+N" overflow (iOS parity)', () => {
  const pills = (n: number): MonthCellPill[] =>
    Array.from({ length: n }, (_, i) => ({
      event: { id: `e${i}`, start: pd('2026-04-15'), meta: {} } as CalendarEvent,
      order: i,
    }));

  it('shows every pill and no marker while at or under the limit', () => {
    expect(capMonthCellPills(pills(0), 2)).toEqual({ visible: [], hidden: 0 });
    const two = pills(2);
    expect(capMonthCellPills(two, 2)).toEqual({ visible: two, hidden: 0 });
  });

  it('keeps the first `limit` pills and counts the rest — never "swaps in" a third', () => {
    const three = pills(3);
    const r = capMonthCellPills(three, 2);
    expect(r.visible.map((p) => p.event.id)).toEqual(['e0', 'e1']);
    expect(r.hidden).toBe(1);
    expect(capMonthCellPills(pills(20), 2).hidden).toBe(18);
  });

  it('treats a non-finite or negative limit as "no cap" and floors fractions', () => {
    const five = pills(5);
    expect(capMonthCellPills(five, Number.POSITIVE_INFINITY).hidden).toBe(0);
    expect(capMonthCellPills(five, -1).hidden).toBe(0);
    expect(capMonthCellPills(five, 2.9)).toEqual({ visible: five.slice(0, 2), hidden: 3 });
    expect(capMonthCellPills(five, 0)).toEqual({ visible: [], hidden: 5 });
  });

  it('is pure: same input, same split', () => {
    fc.assert(
      fc.property(fc.nat({ max: 40 }), fc.nat({ max: 10 }), (n, limit) => {
        const input = pills(n);
        const a = capMonthCellPills(input, limit);
        const b = capMonthCellPills(input, limit);
        expect(a).toEqual(b);
        expect(a.visible.length + a.hidden).toBe(n);
        expect(a.visible.length).toBeLessThanOrEqual(limit);
      }),
      { numRuns: 200 },
    );
  });
});

describe('monthCellPillLimit — per-density visible limit', () => {
  it('Details honours maxEventsPerCell; Stacked / Compact use the fixed iOS counts', () => {
    expect(monthCellPillLimit('details', 2)).toBe(2);
    expect(monthCellPillLimit('details', 5)).toBe(5);
    expect(monthCellPillLimit('stacked', 5)).toBe(MONTH_STACKED_VISIBLE_PILLS);
    expect(monthCellPillLimit('compact', 5)).toBe(MONTH_COMPACT_VISIBLE_PILLS);
    expect(MONTH_STACKED_VISIBLE_PILLS).toBe(2);
    expect(MONTH_COMPACT_VISIBLE_PILLS).toBe(6);
  });
});

describe('capMonthRowLanes — multi-day lane cap (month rows)', () => {
  const week = monthGridDates(Temporal.PlainYearMonth.from('2026-06'), 1).slice(7, 14);
  // Four all-day spans inside Mon 8 – Sun 14 June 2026 (end exclusive).
  const spans: CalendarEvent[] = [
    { id: 'A', start: pd('2026-06-08'), end: pd('2026-06-13'), meta: { title: 'A Mo–Fr' } },
    { id: 'B', start: pd('2026-06-09'), end: pd('2026-06-12'), meta: { title: 'B Di–Do' } },
    { id: 'C', start: pd('2026-06-08'), end: pd('2026-06-15'), meta: { title: 'C Mo–So' } },
    { id: 'D', start: pd('2026-06-10'), end: pd('2026-06-14'), meta: { title: 'D Mi–Sa' } },
  ];
  const bars = () =>
    layoutMonthGrid(spans, { gridDates: week, timezone: 'UTC' }).weekRows[0].multiDayBars;

  it('shows every lane with `null` / non-finite / negative caps', () => {
    for (const cap of [null, Number.POSITIVE_INFINITY, -1]) {
      const r = capMonthRowLanes(bars(), cap);
      expect(r.visible).toHaveLength(4);
      expect(r.hidden).toHaveLength(0);
      expect(r.laneCount).toBe(4);
      expect(r.hiddenPerColumn).toEqual([0, 0, 0, 0, 0, 0, 0]);
    }
  });

  it('keeps bars with lane < cap and counts the folded ones per covered column', () => {
    const r = capMonthRowLanes(bars(), 2);
    expect(r.laneCount).toBe(2);
    expect(r.visible.every((b) => b.lane < 2)).toBe(true);
    expect(r.hidden.every((b) => b.lane >= 2)).toBe(true);
    expect(r.visible.length + r.hidden.length).toBe(4);
    const expected = [0, 0, 0, 0, 0, 0, 0];
    for (const b of r.hidden) for (let c = b.startCol; c <= b.endCol; c++) expected[c]++;
    expect(r.hiddenPerColumn).toEqual(expected);
    expect(Math.max(...r.hiddenPerColumn)).toBeGreaterThan(0);
  });

  const laneArb = fc
    .tuple(
      fc.integer({ min: 0, max: 1_000_000 }),
      fc.integer({ min: 0, max: 35 }),
      fc.integer({ min: 1, max: 7 }),
    )
    .map(
      ([n, startN, span]): CalendarEvent => ({
        id: `m-${n}`,
        start: GRID[startN],
        end: GRID[startN].add({ days: span }),
      }),
    );

  it('never clips a bar mid-row — a bar is fully visible or fully folded', () => {
    fc.assert(
      fc.property(fc.array(laneArb, { maxLength: 20 }), fc.nat({ max: 5 }), (events, cap) => {
        const byId = new Map<string, CalendarEvent>();
        for (const e of events) byId.set(e.id, e);
        const layoutRows = layoutMonthGrid([...byId.values()], {
          gridDates: GRID,
          timezone: 'UTC',
        });
        for (const row of layoutRows.weekRows) {
          const r = capMonthRowLanes(row.multiDayBars, cap);
          expect(r.visible.length + r.hidden.length).toBe(row.multiDayBars.length);
          expect(r.laneCount).toBeLessThanOrEqual(cap);
          for (const b of r.visible) expect(b.lane).toBeLessThan(cap);
        }
      }),
      { numRuns: 100 },
    );
  });
});
