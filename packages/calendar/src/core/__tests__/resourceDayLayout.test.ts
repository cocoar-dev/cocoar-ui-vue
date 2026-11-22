import { describe, expect, it } from 'vitest';
import { Temporal } from '../temporal';
import { UNASSIGNED_RESOURCE, layoutResourceDay } from '../resourceDayLayout';
import type { CalendarEvent } from '../types';

const ZONE = 'Europe/Vienna';
const zdt = (t: string, d = '2026-11-19') =>
  Temporal.PlainDateTime.from(`${d}T${t}`).toZonedDateTime(ZONE);
type Meta = { who: string[] };
const timed = (id: string, start: string, end: string, who: string[]): CalendarEvent<Meta> => ({
  id,
  start: zdt(start),
  end: zdt(end),
  meta: { who },
});
const layout = (events: CalendarEvent<Meta>[]) =>
  layoutResourceDay(events, {
    day: Temporal.PlainDate.from('2026-11-19'),
    resources: ['j', 'l', 's', 'e'],
    resourcesOf: (e) => e.meta?.who ?? [],
    timeRange: [0, 24],
    timezone: ZONE,
  });
const spans = (l: ReturnType<typeof layout>, id: string) =>
  l.blocks.filter((b) => b.event.id === id).map((b) => [b.startCol, b.endCol]);

describe('layoutResourceDay', () => {
  it('draws one block across neighbouring columns', () => {
    expect(spans(layout([timed('a', '09:00', '10:00', ['l', 's'])]), 'a')).toEqual([[1, 2]]);
  });

  it('gives columns that are not neighbours separate blocks', () => {
    expect(spans(layout([timed('a', '09:00', '10:00', ['j', 's'])]), 'a')).toEqual([[0, 0], [2, 2]]);
  });

  it('falls apart where something overlaps in one column', () => {
    const l = layout([
      timed('shared', '09:00', '10:00', ['l', 's']),
      timed('own', '09:30', '10:30', ['s']),
    ]);
    expect(spans(l, 'shared')).toEqual([[1, 1], [2, 2]]);
    const inS = l.blocks.filter((b) => b.startCol === 2);
    expect(inS.map((b) => b.laneCount)).toEqual([2, 2]);
    expect(new Set(inS.map((b) => b.lane)).size).toBe(2);
  });

  it('stays whole when another event in its column does not overlap', () => {
    const l = layout([
      timed('shared', '09:00', '10:00', ['l', 's']),
      timed('later', '10:00', '11:00', ['s']),
    ]);
    expect(spans(l, 'shared')).toEqual([[1, 2]]);
  });

  it('adds a column for events without a resource only when needed', () => {
    expect(layout([]).columns).toEqual(['j', 'l', 's', 'e']);
    const l = layout([timed('n', '09:00', '10:00', [])]);
    expect(l.columns).toEqual(['j', 'l', 's', 'e', UNASSIGNED_RESOURCE]);
    expect(spans(l, 'n')).toEqual([[4, 4]]);
  });

  it('runs all-day events across their columns in lanes', () => {
    const allDay = (id: string, who: string[]): CalendarEvent<Meta> => ({
      id,
      start: Temporal.PlainDate.from('2026-11-18'),
      end: Temporal.PlainDate.from('2026-11-21'),
      meta: { who },
    });
    const l = layout([allDay('a', ['j', 'l']), allDay('b', ['l', 's'])]);
    expect(l.allDayLaneCount).toBe(2);
    expect(l.allDay.find((b) => b.event.id === 'a')).toMatchObject({
      startCol: 0,
      endCol: 1,
      clippedStart: true,
      clippedEnd: true,
    });
  });

  it('clips a timed event over midnight to the day', () => {
    const event: CalendarEvent<Meta> = {
      id: 'night',
      start: zdt('22:00'),
      end: zdt('02:00', '2026-11-20'),
      meta: { who: ['e'] },
    };
    expect(layout([event]).blocks[0]).toMatchObject({ startCol: 3, clippedBottom: true });
  });
});
