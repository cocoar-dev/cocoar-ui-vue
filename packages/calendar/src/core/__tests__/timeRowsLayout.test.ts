/**
 * Tests for `core/timeRowsLayout.ts` — the horizontal time grid's
 * rows. The per-day projection is `layoutDayEvents` (pinned in its
 * own suite); these pin what the rows add: one row per day, lanes
 * stacked downwards, row heights from the lane count, cumulative row
 * offsets, fit-to-width and the y → row lookup.
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '../temporal';
import {
  layoutTimeRows,
  rowIndexAtY,
  timeRowHeightPx,
  timeRowLaneTopPx,
  timeRowsPxPerMinute,
  type TimeRowsGeometry,
} from '../timeRowsLayout';
import type { CalendarEvent } from '../types';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

const G: TimeRowsGeometry = { laneHeightPx: 24, laneGapPx: 2, rowPaddingPx: 4, minRowHeightPx: 40 };
const MON = Temporal.PlainDate.from('2026-10-19');
const TUE = MON.add({ days: 1 });
const WED = MON.add({ days: 2 });

const timed = (id: string, start: string, end?: string): CalendarEvent => ({
  id,
  start: zdt(start),
  end: end ? zdt(end) : undefined,
});

describe('timeRowHeightPx / timeRowLaneTopPx', () => {
  it('one lane: the minimum row height wins over the content', () => {
    // 4 + 24 + 4 = 32 < 40
    expect(timeRowHeightPx(1, G)).toBe(40);
  });
  it('more lanes: padding + lanes + gaps', () => {
    // 4 + 3·24 + 2·2 + 4 = 84
    expect(timeRowHeightPx(3, G)).toBe(84);
  });
  it('lane 0 sits below the padding, each further lane one card + gap lower', () => {
    expect(timeRowLaneTopPx(0, G)).toBe(4);
    expect(timeRowLaneTopPx(2, G)).toBe(4 + 2 * 26);
  });
});

describe('layoutTimeRows', () => {
  it('one row per day, in order, even without events', () => {
    const r = layoutTimeRows([], {
      ...G,
      days: [MON, TUE, WED],
      timeRange: [0, 24],
      timezone: 'UTC',
    });
    expect(r.rows.map((row) => row.date.toString())).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
    ]);
    expect(r.rows.every((row) => row.laneCount === 1 && row.heightPx === 40)).toBe(true);
    expect(r.rows.map((row) => row.topPx)).toEqual([0, 40, 80]);
    expect(r.totalHeightPx).toBe(120);
  });

  it('overlaps become lanes and make only their own row taller', () => {
    const events = [
      timed('a', '2026-10-20T09:00:00Z', '2026-10-20T11:00:00Z'),
      timed('b', '2026-10-20T10:00:00Z', '2026-10-20T12:00:00Z'),
      timed('c', '2026-10-20T10:30:00Z', '2026-10-20T10:45:00Z'),
    ];
    const r = layoutTimeRows(events, {
      ...G,
      days: [MON, TUE, WED],
      timeRange: [0, 24],
      timezone: 'UTC',
    });
    const tue = r.rows[1];
    expect(tue.laneCount).toBe(3);
    expect(new Set(tue.positioned.map((p) => p.lane))).toEqual(new Set([0, 1, 2]));
    expect(tue.heightPx).toBe(84);
    expect(r.rows.map((row) => row.topPx)).toEqual([0, 40, 124]);
    expect(r.totalHeightPx).toBe(164);
  });

  it('an event over midnight becomes one segment in each of its two rows', () => {
    const events = [timed('night', '2026-10-19T23:00:00Z', '2026-10-20T01:00:00Z')];
    const r = layoutTimeRows(events, {
      ...G,
      days: [MON, TUE],
      timeRange: [0, 24],
      timezone: 'UTC',
    });
    const [mon, tue] = r.rows.map((row) => row.positioned[0]);
    expect(mon).toMatchObject({ startMinutes: 23 * 60, endMinutes: 24 * 60, clippedBottom: true });
    expect(tue).toMatchObject({ startMinutes: 0, endMinutes: 60, clippedTop: true });
  });

  it('minutes are relative to the time range, in the display zone', () => {
    // 09:00 UTC = 11:00 in Vienna (CEST); range starts at 07:00 → 240 min.
    const events = [timed('x', '2026-10-19T09:00:00Z', '2026-10-19T10:00:00Z')];
    const r = layoutTimeRows(events, {
      ...G,
      days: [MON],
      timeRange: [7, 19],
      timezone: 'Europe/Vienna',
    });
    expect(r.rows[0].positioned[0]).toMatchObject({ startMinutes: 240, endMinutes: 300 });
  });

  it('all-day events are not part of the timed rows', () => {
    const events: CalendarEvent[] = [{ id: 'ad', start: pd('2026-10-19'), end: pd('2026-10-20') }];
    const r = layoutTimeRows(events, { ...G, days: [MON], timeRange: [0, 24], timezone: 'UTC' });
    expect(r.rows[0].positioned).toEqual([]);
  });
});

describe('timeRowsPxPerMinute', () => {
  it('keeps pixelsPerHour when the range is wider than the container', () => {
    // 24 h × 60 px = 1440 px > 800 px
    expect(timeRowsPxPerMinute(60, 24, 800)).toBe(1);
  });
  it('stretches a narrow range to fill the container', () => {
    // 10 h × 60 px = 600 px < 1200 px → 2 px / min
    expect(timeRowsPxPerMinute(60, 10, 1200)).toBe(2);
  });
  it('keeps pixelsPerHour before the container is measured', () => {
    expect(timeRowsPxPerMinute(90, 10, 0)).toBe(1.5);
  });
});

describe('rowIndexAtY', () => {
  const rows = [
    { topPx: 0, heightPx: 40 },
    { topPx: 40, heightPx: 84 },
    { topPx: 124, heightPx: 40 },
  ];
  it('finds the row by its top / bottom edges', () => {
    expect(rowIndexAtY(rows, 0)).toBe(0);
    expect(rowIndexAtY(rows, 39.9)).toBe(0);
    expect(rowIndexAtY(rows, 40)).toBe(1);
    expect(rowIndexAtY(rows, 163)).toBe(2);
  });
  it('null outside the rows', () => {
    expect(rowIndexAtY(rows, -1)).toBeNull();
    expect(rowIndexAtY(rows, 164)).toBeNull();
  });
});
