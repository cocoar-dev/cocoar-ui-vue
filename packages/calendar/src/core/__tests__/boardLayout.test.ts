import { describe, expect, it } from 'vitest';
import { Temporal } from '../temporal';
import {
  BOARD_ALL_DAY_ROW,
  BOARD_UNASSIGNED_ROW,
  layoutBoard,
  resourceWeekRows,
  weekBoardRows,
  yearWallColumns,
  yearWallRows,
  type BoardRow,
} from '../boardLayout';
import type { CalendarPeriod } from '../occupancy';
import type { CalendarEvent } from '../types';

const ZONE = 'Europe/Vienna';
const zdt = (s: string) => Temporal.PlainDateTime.from(s).toZonedDateTime(ZONE);
const pd = (s: string) => Temporal.PlainDate.from(s);
const week = Array.from({ length: 7 }, (_, i) => pd('2026-11-16').add({ days: i }));
const PERIODS: CalendarPeriod[] = [
  { key: 'morning', startMinutes: 0, endMinutes: 12 * 60 },
  { key: 'afternoon', startMinutes: 12 * 60, endMinutes: 18 * 60 },
  { key: 'evening', startMinutes: 18 * 60, endMinutes: 24 * 60 },
];
type Meta = { who: string[] };
const timed = (id: string, start: string, end: string, who: string[] = []): CalendarEvent<Meta> => ({
  id,
  start: zdt(start),
  end: zdt(end),
  meta: { who },
});
const allDay = (id: string, start: string, end: string, who: string[] = []): CalendarEvent<Meta> => ({
  id,
  start: pd(start),
  end: pd(end),
  meta: { who },
});

describe('order in a cell', () => {
  it('sorts the events of a cell by start, whatever order they arrive in', () => {
    const at = (id: string, time: string): CalendarEvent => ({
      id,
      start: Temporal.ZonedDateTime.from(`2026-11-19T${time}[Europe/Vienna]`),
      end: Temporal.ZonedDateTime.from(`2026-11-19T${time}[Europe/Vienna]`).add({ minutes: 30 }),
      meta: {},
    });
    const allDay: CalendarEvent = {
      id: 'day',
      start: Temporal.PlainDate.from('2026-11-19'),
      end: Temporal.PlainDate.from('2026-11-20'),
      meta: {},
    };
    const [row] = layoutBoard([at('late', '17:00'), allDay, at('early', '15:30')], {
      rows: [{ key: 'r', label: 'R', kind: 'cells', dates: [Temporal.PlainDate.from('2026-11-19')] }],
      timezone: 'Europe/Vienna',
    });
    expect(row.cells[0].events.map((e) => e.id)).toEqual(['day', 'early', 'late']);
  });
});

describe('weekBoardRows + layoutBoard', () => {
  const layout = (events: CalendarEvent<Meta>[]) =>
    layoutBoard(events, {
      rows: weekBoardRows<Meta>({ dates: week, periods: PERIODS, timezone: ZONE, extraRows: ['meals'] }),
      timezone: ZONE,
    });
  const row = (l: ReturnType<typeof layout>, key: string) => l.find((r) => r.row.key === key)!;

  it('builds the all-day row, the periods and the extra rows in order', () => {
    expect(layout([]).map((r) => r.row.key)).toEqual([BOARD_ALL_DAY_ROW, 'morning', 'afternoon', 'evening', 'meals']);
  });

  it('puts a timed event in the period it starts in, even when it runs on', () => {
    const l = layout([timed('a', '2026-11-19T17:00', '2026-11-19T19:00')]);
    expect(row(l, 'afternoon').cells[3].events.map((e) => e.id)).toEqual(['a']);
    expect(row(l, 'evening').cells[3].events).toEqual([]);
  });

  it('runs all-day and multi-day events as bars in the all-day row only', () => {
    const l = layout([
      allDay('week', '2026-11-16', '2026-11-21'),
      timed('trip', '2026-11-20T15:00', '2026-11-21T10:00'),
    ]);
    const bars = row(l, BOARD_ALL_DAY_ROW).bars;
    expect(bars.find((b) => b.event.id === 'week')).toMatchObject({ startCol: 0, endCol: 4 });
    expect(bars.find((b) => b.event.id === 'trip')).toMatchObject({ startCol: 4, endCol: 5 });
    expect(row(l, 'afternoon').cells.flatMap((c) => c.events)).toEqual([]);
  });

  it('clips a bar that leaves the visible week and stacks overlaps in lanes', () => {
    const l = layout([
      allDay('long', '2026-11-10', '2026-11-18'),
      allDay('short', '2026-11-17', '2026-11-19'),
    ]);
    const bars = row(l, BOARD_ALL_DAY_ROW);
    expect(bars.laneCount).toBe(2);
    expect(bars.bars.find((b) => b.event.id === 'long')).toMatchObject({ clippedStart: true, clippedEnd: false });
  });

  it('never loses a timed event outside every period', () => {
    const rows = weekBoardRows<Meta>({
      dates: week,
      periods: [{ key: 'day', startMinutes: 8 * 60, endMinutes: 16 * 60 }],
      timezone: ZONE,
    });
    const l = layoutBoard([timed('late', '2026-11-19T22:00', '2026-11-19T23:00')], { rows, timezone: ZONE });
    expect(l.find((r) => r.row.key === 'day')!.cells[3].events).toHaveLength(1);
  });
});

describe('resourceWeekRows', () => {
  const rows = resourceWeekRows<Meta>({
    dates: week,
    resources: ['anna', 'ben'],
    resourcesOf: (e) => e.meta?.who ?? [],
    extraRows: ['free'],
  });

  it('shows a shared event in the row of each resource', () => {
    const l = layoutBoard([timed('s', '2026-11-19T09:00', '2026-11-19T10:00', ['anna', 'ben'])], { rows, timezone: ZONE });
    expect(l[0].cells[3].events).toHaveLength(1);
    expect(l[1].cells[3].events).toHaveLength(1);
  });

  it('adds the unassigned row only when an event needs it', () => {
    expect(layoutBoard([], { rows, timezone: ZONE }).map((r) => r.row.key)).toEqual(['anna', 'ben', 'free']);
    const l = layoutBoard([timed('n', '2026-11-19T09:00', '2026-11-19T10:00')], { rows, timezone: ZONE });
    expect(l.map((r) => r.row.key)).toEqual(['anna', 'ben', BOARD_UNASSIGNED_ROW, 'free']);
  });
});

describe('yearWallRows', () => {
  const rows = yearWallRows<Meta>({ year: 2026, locale: 'en-GB' });

  it('has twelve rows of 31 columns, with no day where a month ends', () => {
    expect(rows).toHaveLength(12);
    expect(rows.every((r) => r.dates.length === 31)).toBe(true);
    expect(rows[1].dates[27]?.toString()).toBe('2026-02-28');
    expect(rows[1].dates[28]).toBeNull();
    expect(rows[1].label).toBe('Feb');
    expect(yearWallColumns()[30]).toEqual({ key: '31', label: '31' });
  });

  it('runs a band through its months, clipped at each month end', () => {
    const l = layoutBoard([allDay('summer', '2026-07-04', '2026-08-08')], { rows, timezone: ZONE });
    expect(l[6].bars[0]).toMatchObject({ startCol: 3, endCol: 30, clippedStart: false, clippedEnd: true });
    expect(l[7].bars[0]).toMatchObject({ startCol: 0, endCol: 6, clippedStart: true, clippedEnd: false });
  });

  it('keeps a single-day event in its cell, for a dot', () => {
    const l = layoutBoard([allDay('birthday', '2026-03-12', '2026-03-13')], { rows, timezone: ZONE });
    expect(l[2].bars).toHaveLength(0);
    expect(l[2].cells[11].events.map((e) => e.id)).toEqual(['birthday']);
    expect(l[2].row.showCellEvents).toBe(false);
  });
});

describe('layoutBoard with missing days', () => {
  it('splits a bar at a column without a day', () => {
    const dates = [pd('2026-02-27'), pd('2026-02-28'), null, pd('2026-03-02')];
    const row: BoardRow<Meta> = { key: 'r', dates, kind: 'bars' };
    const l = layoutBoard([allDay('x', '2026-02-27', '2026-03-03')], { rows: [row], timezone: ZONE });
    expect(l[0].bars.map((b) => [b.startCol, b.endCol])).toEqual([[0, 1], [3, 3]]);
  });
});
