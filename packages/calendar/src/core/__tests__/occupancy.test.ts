import { describe, expect, it } from 'vitest';
import { Temporal } from '../temporal';
import { computeOccupancy, findDayGaps, type CalendarPeriod } from '../occupancy';
import type { CalendarEvent } from '../types';

const ZONE = 'Europe/Vienna';
const zdt = (s: string, zone = ZONE) => Temporal.PlainDateTime.from(s).toZonedDateTime(zone);
const day = (s: string) => Temporal.PlainDate.from(s);

const PERIODS: CalendarPeriod[] = [
  { key: 'morning', startMinutes: 0, endMinutes: 12 * 60 },
  { key: 'afternoon', startMinutes: 12 * 60, endMinutes: 18 * 60 },
  { key: 'evening', startMinutes: 18 * 60, endMinutes: 24 * 60 },
];

type Meta = { who: string[] };
const timed = (id: string, start: string, end: string, who: string[]): CalendarEvent<Meta> => ({
  id,
  start: zdt(start),
  end: zdt(end),
  meta: { who },
});

const occupancy = (events: CalendarEvent<Meta>[], dates = ['2026-11-19']) =>
  computeOccupancy(events, {
    dates: dates.map(day),
    periods: PERIODS,
    resources: ['anna', 'ben', 'cleo'],
    timezone: ZONE,
    resourcesOf: (e) => e.meta?.who ?? [],
  });

describe('computeOccupancy', () => {
  const d = day('2026-11-19');

  it('an event ending at 18:00 leaves the evening free', () => {
    const o = occupancy([timed('a', '2026-11-19T15:30', '2026-11-19T18:00', ['anna'])]);
    expect(o.busyResources(d, 'afternoon')).toEqual(['anna']);
    expect(o.busyResources(d, 'evening')).toEqual([]);
  });

  it('an event crossing a boundary fills both periods', () => {
    const o = occupancy([timed('a', '2026-11-19T11:00', '2026-11-19T13:00', ['anna'])]);
    expect(o.busyResources(d, 'morning')).toEqual(['anna']);
    expect(o.busyResources(d, 'afternoon')).toEqual(['anna']);
  });

  it('reports resources in their order and answers for a group', () => {
    const o = occupancy([
      timed('a', '2026-11-19T19:00', '2026-11-19T20:00', ['cleo']),
      timed('b', '2026-11-19T19:00', '2026-11-19T20:00', ['anna']),
    ]);
    expect(o.busyResources(d, 'evening')).toEqual(['anna', 'cleo']);
    expect(o.isFree(d, 'evening', ['ben'])).toBe(true);
    expect(o.isFree(d, 'evening', ['ben', 'cleo'])).toBe(false);
  });

  it('a timed event over midnight reaches both days', () => {
    const o = occupancy([timed('a', '2026-11-19T22:00', '2026-11-20T01:00', ['ben'])], [
      '2026-11-19',
      '2026-11-20',
    ]);
    expect(o.busyResources(d, 'evening')).toEqual(['ben']);
    expect(o.busyResources(day('2026-11-20'), 'morning')).toEqual(['ben']);
  });

  it('all-day events do not count unless the host says so', () => {
    const allDay: CalendarEvent<Meta> = {
      id: 'x',
      start: day('2026-11-19'),
      end: day('2026-11-20'),
      meta: { who: ['anna'] },
    };
    expect(occupancy([allDay]).busyResources(d, 'morning')).toEqual([]);
    const o = computeOccupancy([allDay], {
      dates: [d],
      periods: PERIODS,
      resources: ['anna'],
      timezone: ZONE,
      resourcesOf: (e) => e.meta?.who ?? [],
      counts: () => true,
    });
    expect(o.busyResources(d, 'morning')).toEqual(['anna']);
    expect(o.busyResources(d, 'evening')).toEqual(['anna']);
  });

  it('ignores resources it does not know and events without one', () => {
    const o = occupancy([
      timed('a', '2026-11-19T09:00', '2026-11-19T10:00', ['stranger']),
      timed('b', '2026-11-19T09:00', '2026-11-19T10:00', []),
    ]);
    expect(o.busyResources(d, 'morning')).toEqual([]);
  });

  it('reads periods in the display zone, not the event zone', () => {
    const event: CalendarEvent<Meta> = {
      id: 'ny',
      // 13:00 in New York is 19:00 in Vienna.
      start: zdt('2026-11-19T13:00', 'America/New_York'),
      end: zdt('2026-11-19T14:00', 'America/New_York'),
      meta: { who: ['anna'] },
    };
    const o = occupancy([event]);
    expect(o.busyResources(d, 'afternoon')).toEqual([]);
    expect(o.busyResources(d, 'evening')).toEqual(['anna']);
  });

  it('keeps wall-clock periods on the DST days', () => {
    const spring = day('2026-03-29');
    const o = occupancy([timed('a', '2026-03-29T12:30', '2026-03-29T13:00', ['anna'])], [
      '2026-03-29',
    ]);
    expect(o.busyResources(spring, 'morning')).toEqual([]);
    expect(o.busyResources(spring, 'afternoon')).toEqual(['anna']);
  });
});

describe('findDayGaps', () => {
  const date = day('2026-11-19');
  const entry = (start: string, end: string) => ({
    start: zdt(`2026-11-19T${start}`),
    end: zdt(`2026-11-19T${end}`),
  });

  it('finds the gaps between entries, not at the edges', () => {
    const gaps = findDayGaps([entry('09:00', '10:00'), entry('12:00', '13:00')], {
      date,
      timezone: ZONE,
    });
    expect(gaps.map((g) => g.minutes)).toEqual([120]);
    expect(gaps[0].start.toPlainTime().toString()).toBe('10:00:00');
    expect(gaps[0].end.toPlainTime().toString()).toBe('12:00:00');
  });

  it('merges overlaps, also a long entry around a short one', () => {
    const gaps = findDayGaps(
      [entry('09:00', '13:00'), entry('10:00', '11:00'), entry('14:00', '15:00')],
      { date, timezone: ZONE },
    );
    expect(gaps.map((g) => g.minutes)).toEqual([60]);
  });

  it('honours the minimum and the part of the day', () => {
    const entries = [entry('09:00', '10:00'), entry('10:30', '11:00'), entry('20:00', '21:00')];
    expect(findDayGaps(entries, { date, timezone: ZONE, minMinutes: 60 }).map((g) => g.minutes)).toEqual([
      540,
    ]);
    expect(findDayGaps(entries, { date, timezone: ZONE, toMinutes: 12 * 60 }).map((g) => g.minutes)).toEqual([
      30,
    ]);
  });

  it('ignores all-day entries', () => {
    const gaps = findDayGaps(
      [{ start: date, end: date.add({ days: 1 }) }, entry('09:00', '10:00'), entry('11:00', '12:00')],
      { date, timezone: ZONE },
    );
    expect(gaps.map((g) => g.minutes)).toEqual([60]);
  });

  it('counts elapsed minutes across a DST change', () => {
    const spring = day('2026-03-29');
    const gaps = findDayGaps(
      [
        { start: zdt('2026-03-29T01:00'), end: zdt('2026-03-29T01:30') },
        { start: zdt('2026-03-29T03:30'), end: zdt('2026-03-29T04:00') },
      ],
      { date: spring, timezone: ZONE },
    );
    expect(gaps.map((g) => g.minutes)).toEqual([60]);
  });
});
