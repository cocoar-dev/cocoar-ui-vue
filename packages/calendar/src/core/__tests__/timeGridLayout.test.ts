/**
 * Tests for `core/timeGridLayout.ts`.
 *
 * Specific cases pin down boundaries (events at exactly the start /
 * end of the time range, multi-day clipping, all-day skip, default
 * 30-min duration).
 *
 * Property tests verify the lane-assignment invariants the consumer
 * depends on: no two visible events share a (lane × minute) cell,
 * and the lane count is at most the maximum overlap depth.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Temporal } from '../temporal';
import { layoutDayEvents, layoutAllDayBand } from '../timeGridLayout';
import type { CalendarEvent } from '../types';

const DAY = Temporal.PlainDate.from('2026-04-15');
const RANGE_FULL: [number, number] = [0, 24];
const RANGE_BUSINESS: [number, number] = [6, 22];

function ev(id: string, start: string, end?: string, allDay?: boolean): CalendarEvent {
  return { id, start, end, allDay };
}

// ─── Specific cases ────────────────────────────────────────────────

describe('layoutDayEvents — basics', () => {
  it('empty input → empty output', () => {
    const r = layoutDayEvents([], { day: DAY, timeRange: RANGE_FULL, timezone: 'UTC' });
    expect(r).toEqual([]);
  });

  it('skips all-day events', () => {
    const r = layoutDayEvents(
      [ev('a', '2026-04-15', '2026-04-16'), ev('b', '2026-04-15T09:00:00Z')],
      { day: DAY, timeRange: RANGE_FULL, timezone: 'UTC' },
    );
    expect(r.map((p) => p.event.id)).toEqual(['b']);
  });

  it('default 30-min duration when end is missing', () => {
    const r = layoutDayEvents(
      [ev('a', '2026-04-15T09:00:00Z')],
      { day: DAY, timeRange: RANGE_FULL, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
    expect(r[0].startMinutes).toBe(540); // 9 * 60
    expect(r[0].endMinutes).toBe(570); // 540 + 30
  });

  it('event at top of business range starts at 0', () => {
    const r = layoutDayEvents(
      [ev('a', '2026-04-15T06:00:00Z', '2026-04-15T07:00:00Z')],
      { day: DAY, timeRange: RANGE_BUSINESS, timezone: 'UTC' },
    );
    expect(r[0].startMinutes).toBe(0);
    expect(r[0].endMinutes).toBe(60);
  });

  it('event at bottom of business range ends at totalMin', () => {
    const r = layoutDayEvents(
      [ev('a', '2026-04-15T21:00:00Z', '2026-04-15T22:00:00Z')],
      { day: DAY, timeRange: RANGE_BUSINESS, timezone: 'UTC' },
    );
    expect(r[0].startMinutes).toBe(15 * 60); // 21:00 - 06:00 = 15h
    expect(r[0].endMinutes).toBe(16 * 60); // 22:00 - 06:00 = 16h
  });

  it('event entirely below range is skipped', () => {
    const r = layoutDayEvents(
      [ev('a', '2026-04-15T03:00:00Z', '2026-04-15T05:00:00Z')],
      { day: DAY, timeRange: RANGE_BUSINESS, timezone: 'UTC' },
    );
    expect(r).toEqual([]);
  });

  it('event entirely above range is skipped', () => {
    const r = layoutDayEvents(
      [ev('a', '2026-04-15T22:30:00Z', '2026-04-15T23:30:00Z')],
      { day: DAY, timeRange: RANGE_BUSINESS, timezone: 'UTC' },
    );
    expect(r).toEqual([]);
  });

  it('event clipped at the top sets clippedTop', () => {
    // Event 04:00-08:00 with range 06-22 → visible 06-08, clippedTop.
    const r = layoutDayEvents(
      [ev('a', '2026-04-15T04:00:00Z', '2026-04-15T08:00:00Z')],
      { day: DAY, timeRange: RANGE_BUSINESS, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
    expect(r[0].startMinutes).toBe(0);
    expect(r[0].endMinutes).toBe(120); // 06:00-08:00 = 120 min
    expect(r[0].clippedTop).toBe(true);
    expect(r[0].clippedBottom).toBe(false);
  });

  it('event clipped at the bottom sets clippedBottom', () => {
    const r = layoutDayEvents(
      [ev('a', '2026-04-15T20:00:00Z', '2026-04-15T23:30:00Z')],
      { day: DAY, timeRange: RANGE_BUSINESS, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
    expect(r[0].startMinutes).toBe(14 * 60); // 20:00 - 06:00 = 14h
    expect(r[0].endMinutes).toBe(16 * 60); // capped at end of range
    expect(r[0].clippedTop).toBe(false);
    expect(r[0].clippedBottom).toBe(true);
  });

  it('event spanning across midnight is clipped to the day end', () => {
    // 23:00 → 02:00 next day, range full 0-24 → visible 23:00-24:00 only.
    const r = layoutDayEvents(
      [ev('a', '2026-04-15T23:00:00Z', '2026-04-16T02:00:00Z')],
      { day: DAY, timeRange: RANGE_FULL, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
    expect(r[0].startMinutes).toBe(23 * 60);
    expect(r[0].endMinutes).toBe(24 * 60);
    expect(r[0].clippedBottom).toBe(true);
  });

  it('multi-day event whose start was yesterday begins at top of today', () => {
    // 22:00 yesterday → 06:00 today, looking at today.
    const r = layoutDayEvents(
      [ev('a', '2026-04-14T22:00:00Z', '2026-04-15T06:00:00Z')],
      { day: DAY, timeRange: RANGE_FULL, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
    expect(r[0].startMinutes).toBe(0);
    expect(r[0].endMinutes).toBe(6 * 60);
    expect(r[0].clippedTop).toBe(true);
  });
});

describe('layoutDayEvents — overlap & lanes', () => {
  it('non-overlapping events get lane 0', () => {
    const r = layoutDayEvents(
      [
        ev('a', '2026-04-15T09:00:00Z', '2026-04-15T10:00:00Z'),
        ev('b', '2026-04-15T11:00:00Z', '2026-04-15T12:00:00Z'),
      ],
      { day: DAY, timeRange: RANGE_FULL, timezone: 'UTC' },
    );
    expect(r.every((p) => p.lane === 0)).toBe(true);
    expect(r.every((p) => p.laneCount === 1)).toBe(true);
  });

  it('two overlapping events get separate lanes', () => {
    const r = layoutDayEvents(
      [
        ev('a', '2026-04-15T09:00:00Z', '2026-04-15T10:30:00Z'),
        ev('b', '2026-04-15T10:00:00Z', '2026-04-15T11:00:00Z'),
      ],
      { day: DAY, timeRange: RANGE_FULL, timezone: 'UTC' },
    );
    expect(r.length).toBe(2);
    expect(r[0].lane).not.toBe(r[1].lane);
    expect(r[0].laneCount).toBe(2);
    expect(r[1].laneCount).toBe(2);
  });

  it('events touching at a shared boundary do NOT count as overlapping', () => {
    // a ends 10:00, b starts 10:00 → no conflict.
    const r = layoutDayEvents(
      [
        ev('a', '2026-04-15T09:00:00Z', '2026-04-15T10:00:00Z'),
        ev('b', '2026-04-15T10:00:00Z', '2026-04-15T11:00:00Z'),
      ],
      { day: DAY, timeRange: RANGE_FULL, timezone: 'UTC' },
    );
    expect(r.every((p) => p.lane === 0)).toBe(true);
    expect(r[0].laneCount).toBe(1);
  });

  it('three deeply-overlapping events get three lanes', () => {
    const r = layoutDayEvents(
      [
        ev('a', '2026-04-15T09:00:00Z', '2026-04-15T12:00:00Z'),
        ev('b', '2026-04-15T10:00:00Z', '2026-04-15T11:00:00Z'),
        ev('c', '2026-04-15T10:30:00Z', '2026-04-15T13:00:00Z'),
      ],
      { day: DAY, timeRange: RANGE_FULL, timezone: 'UTC' },
    );
    expect(r.length).toBe(3);
    const lanes = new Set(r.map((p) => p.lane));
    expect(lanes.size).toBe(3);
    expect(r[0].laneCount).toBe(3);
  });
});

// ─── Property tests ────────────────────────────────────────────────

describe('layoutDayEvents — properties', () => {
  // Generate events on a fixed day, with start/end inside [0, 24h].
  const eventArb = fc
    .tuple(
      fc.integer({ min: 0, max: 1440 }),
      fc.integer({ min: 0, max: 1440 }),
      fc.integer({ min: 0, max: 1_000_000 }),
    )
    .map(([a, b, n]): CalendarEvent => {
      const startMin = Math.min(a, b);
      const endMin = Math.max(a, b);
      const startH = String(Math.floor(startMin / 60)).padStart(2, '0');
      const startM = String(startMin % 60).padStart(2, '0');
      const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
      const endM = String(endMin % 60).padStart(2, '0');
      // 24:00 → use 23:59 to keep ISO valid
      const fixHour = (h: string, m: string): [string, string] =>
        h === '24' ? ['23', '59'] : [h, m];
      const [sh, sm] = fixHour(startH, startM);
      const [eh, em] = fixHour(endH, endM);
      return {
        id: `e-${n}`,
        start: `2026-04-15T${sh}:${sm}:00Z`,
        end: `2026-04-15T${eh}:${em}:00Z`,
      };
    });

  it('no two events on the same lane overlap in minutes', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        const r = layoutDayEvents(events, {
          day: DAY,
          timeRange: RANGE_FULL,
          timezone: 'UTC',
        });
        for (let i = 0; i < r.length; i++) {
          for (let j = i + 1; j < r.length; j++) {
            const a = r[i];
            const b = r[j];
            if (a.lane !== b.lane) continue;
            // Overlap in [start, end) → lane assignment violated.
            const overlap =
              a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
            expect(overlap).toBe(false);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('every event with an in-range visible portion is reported', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 20 }), (events) => {
        const byId = new Map<string, CalendarEvent>();
        for (const e of events) byId.set(e.id, e);
        const r = layoutDayEvents([...byId.values()], {
          day: DAY,
          timeRange: RANGE_FULL,
          timezone: 'UTC',
        });
        // Skipped events: start === end (zero-duration). Everything
        // else (with a positive minute span on the day) should be
        // present.
        const expected = [...byId.values()].filter((e) => {
          const s = e.start.slice(11, 13) + e.start.slice(14, 16);
          const eMin = (e.end as string).slice(11, 13) + (e.end as string).slice(14, 16);
          return s !== eMin;
        });
        expect(r.length).toBe(expected.length);
      }),
      { numRuns: 100 },
    );
  });

  it('startMinutes < endMinutes for every output', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 20 }), (events) => {
        const r = layoutDayEvents(events, {
          day: DAY,
          timeRange: RANGE_FULL,
          timezone: 'UTC',
        });
        for (const p of r) expect(p.startMinutes).toBeLessThan(p.endMinutes);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── layoutAllDayBand ───────────────────────────────────────────────

const WEEK_DAYS = [
  Temporal.PlainDate.from('2026-04-13'), // Mon
  Temporal.PlainDate.from('2026-04-14'),
  Temporal.PlainDate.from('2026-04-15'),
  Temporal.PlainDate.from('2026-04-16'),
  Temporal.PlainDate.from('2026-04-17'),
  Temporal.PlainDate.from('2026-04-18'),
  Temporal.PlainDate.from('2026-04-19'), // Sun
];

describe('layoutAllDayBand — basics', () => {
  it('empty input → empty output', () => {
    const r = layoutAllDayBand([], { days: WEEK_DAYS, timezone: 'UTC' });
    expect(r).toEqual([]);
  });

  it('single date-only event lands on its column', () => {
    const r = layoutAllDayBand(
      [{ id: 'a', start: '2026-04-15' }],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
    expect(r[0].startCol).toBe(2); // 2026-04-15 is the 3rd day (index 2)
    expect(r[0].endCol).toBe(2);
    expect(r[0].lane).toBe(0);
  });

  it('multi-day all-day event spans multiple columns', () => {
    // Mon-Wed conference: end 2026-04-16 (exclusive) = inclusive Wed.
    // Wait: end exclusive 2026-04-16 means inclusive last day 2026-04-15 (Wed).
    // For Mon-Wed inclusive we need end '2026-04-16' (Tue exclusive).
    // Let me use end '2026-04-16' which means [Mon Apr 13, Apr 16) → Mon, Tue, Wed.
    const r = layoutAllDayBand(
      [{ id: 'conf', start: '2026-04-13', end: '2026-04-16' }],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
    expect(r[0].startCol).toBe(0); // Mon
    expect(r[0].endCol).toBe(2); // Wed (inclusive)
  });

  it('event entirely before the visible week is excluded', () => {
    const r = layoutAllDayBand(
      [{ id: 'past', start: '2026-04-01', end: '2026-04-05' }],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r).toEqual([]);
  });

  it('event entirely after the visible week is excluded', () => {
    const r = layoutAllDayBand(
      [{ id: 'future', start: '2026-04-25' }],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r).toEqual([]);
  });

  it('event overlapping the start of the week is clipped', () => {
    // Apr 11 (Sat before) → Apr 14 (Tue, exclusive) = Sat, Sun, Mon inclusive.
    const r = layoutAllDayBand(
      [{ id: 'spans-in', start: '2026-04-11', end: '2026-04-14' }],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
    expect(r[0].startCol).toBe(0); // clipped to Mon
    expect(r[0].endCol).toBe(0); // last visible day was Apr 13 (Mon)
    expect(r[0].clippedStart).toBe(true);
    expect(r[0].clippedEnd).toBe(false);
  });

  it('event overlapping the end of the week is clipped', () => {
    // Apr 18 → Apr 25 (exclusive) = Apr 18-24 inclusive. Visible: 18, 19.
    const r = layoutAllDayBand(
      [{ id: 'spans-out', start: '2026-04-18', end: '2026-04-25' }],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
    expect(r[0].startCol).toBe(5); // Sat
    expect(r[0].endCol).toBe(6); // Sun (last visible)
    expect(r[0].clippedStart).toBe(false);
    expect(r[0].clippedEnd).toBe(true);
  });

  it('event with allDay=true on a timed start is treated as all-day', () => {
    const r = layoutAllDayBand(
      [
        { id: 'a', start: '2026-04-15T09:00:00Z', allDay: true, end: '2026-04-16T17:00:00Z' },
      ],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r.length).toBe(1);
  });

  it('timed events without allDay are excluded', () => {
    const r = layoutAllDayBand(
      [{ id: 'meeting', start: '2026-04-15T09:00:00Z', end: '2026-04-15T10:00:00Z' }],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r).toEqual([]);
  });
});

describe('layoutAllDayBand — overlap & lanes', () => {
  it('non-overlapping all-day events get lane 0', () => {
    const r = layoutAllDayBand(
      [
        { id: 'a', start: '2026-04-13' },
        { id: 'b', start: '2026-04-15' },
        { id: 'c', start: '2026-04-17' },
      ],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r.every((b) => b.lane === 0)).toBe(true);
  });

  it('two events on the same day get separate lanes', () => {
    const r = layoutAllDayBand(
      [
        { id: 'a', start: '2026-04-15' },
        { id: 'b', start: '2026-04-15' },
      ],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r.length).toBe(2);
    const lanes = new Set(r.map((b) => b.lane));
    expect(lanes.size).toBe(2);
    expect(r[0].laneCount).toBe(2);
  });

  it('multi-day overlap gets proper lanes', () => {
    const r = layoutAllDayBand(
      [
        { id: 'mon-wed', start: '2026-04-13', end: '2026-04-16' },
        { id: 'tue-fri', start: '2026-04-14', end: '2026-04-18' },
      ],
      { days: WEEK_DAYS, timezone: 'UTC' },
    );
    expect(r.length).toBe(2);
    const lanes = new Set(r.map((b) => b.lane));
    expect(lanes.size).toBe(2); // overlap on Tue, Wed
  });
});

describe('layoutAllDayBand — properties', () => {
  const eventArb = fc
    .tuple(fc.integer({ min: 0, max: 20 }), fc.integer({ min: 0, max: 20 }), fc.integer({ min: 0, max: 1_000_000 }))
    .map(([a, b, n]): CalendarEvent => {
      const startN = Math.min(a, b);
      const endN = Math.max(a, b) + 1; // exclusive end
      const epoch = new Date('2026-04-10T00:00:00Z');
      const startDate = new Date(epoch.getTime() + startN * 86400_000);
      const endDate = new Date(epoch.getTime() + endN * 86400_000);
      return {
        id: `e-${n}`,
        start: startDate.toISOString().slice(0, 10),
        end: endDate.toISOString().slice(0, 10),
      };
    });

  it('every output has startCol <= endCol within [0, days.length)', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 20 }), (events) => {
        const r = layoutAllDayBand(events, { days: WEEK_DAYS, timezone: 'UTC' });
        for (const bar of r) {
          expect(bar.startCol).toBeGreaterThanOrEqual(0);
          expect(bar.startCol).toBeLessThanOrEqual(bar.endCol);
          expect(bar.endCol).toBeLessThan(WEEK_DAYS.length);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('no two bars share a (lane, column) cell', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        const byId = new Map<string, CalendarEvent>();
        for (const e of events) byId.set(e.id, e);
        const r = layoutAllDayBand([...byId.values()], { days: WEEK_DAYS, timezone: 'UTC' });
        for (let i = 0; i < r.length; i++) {
          for (let j = i + 1; j < r.length; j++) {
            const a = r[i];
            const b = r[j];
            if (a.lane !== b.lane) continue;
            const overlap = a.startCol <= b.endCol && b.startCol <= a.endCol;
            expect(overlap).toBe(false);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
