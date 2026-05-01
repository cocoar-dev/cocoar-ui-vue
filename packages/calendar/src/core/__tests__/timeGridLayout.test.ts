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
import { layoutDayEvents } from '../timeGridLayout';
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
