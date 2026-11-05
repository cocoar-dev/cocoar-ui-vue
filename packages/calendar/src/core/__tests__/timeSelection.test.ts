/**
 * `core/timeSelection` — selection policies and their helpers.
 *
 * The `gapOrDurationPolicy` cases replay TimeBooking's
 * `freeSlotAt` / `pickSlotAt` / `dragRange` tests (quarter-hour slots,
 * one hour default), which the policy is the general form of. The
 * only difference: the day ends at 24:00 here, not 23:59.
 */

import { describe, expect, it } from 'vitest';
import {
  Temporal,
  busyMinutesOn,
  defaultSelectionPolicy,
  freeRangeAt,
  gapOrDurationPolicy,
  minuteOfDayToZoned,
  snapToSlot,
  type CalendarEvent,
  type MinuteRange,
  type TimeSelectionContext,
} from '../index';

const hm = (h: number, m = 0) => h * 60 + m;
const r = (start: number, end: number): MinuteRange => ({ start, end });
const date = Temporal.PlainDate.from('2026-04-15');
const zone = 'Europe/Vienna';

function busy(...ranges: MinuteRange[]): TimeSelectionContext['busy'] {
  return ranges.map((x, i) => ({
    ...x,
    event: { id: `e${i}`, start: Temporal.ZonedDateTime.from(`2026-04-15T00:00[${zone}]`) },
  }));
}

function ctx(
  phase: TimeSelectionContext['phase'],
  b: TimeSelectionContext['busy'],
  minute: number,
  anchorMinute?: number,
  extra: Partial<TimeSelectionContext> = {},
): TimeSelectionContext {
  return {
    phase,
    date,
    minute,
    anchorMinute,
    slotDuration: 15,
    bounds: r(0, 24 * 60),
    busy: b,
    ...extra,
  };
}

describe('snapToSlot / freeRangeAt', () => {
  it('snaps to the nearest slot', () => {
    expect(snapToSlot(hm(9, 7), 15)).toBe(hm(9));
    expect(snapToSlot(hm(9, 8), 15)).toBe(hm(9, 15));
    expect(snapToSlot(hm(9, 8), 0)).toBe(hm(9, 8));
  });

  it('free range between, before and after events; null inside one', () => {
    const b = busy(r(hm(8), hm(12)), r(hm(12, 30), hm(16)));
    expect(freeRangeAt(b, hm(12, 10))).toEqual(r(hm(12), hm(12, 30)));
    expect(freeRangeAt(b, hm(6))).toEqual(r(0, hm(8)));
    expect(freeRangeAt(b, hm(20))).toEqual(r(hm(16), 24 * 60));
    expect(freeRangeAt(b, hm(9))).toBeNull();
    // The end of an event is free (end exclusive).
    expect(freeRangeAt(b, hm(12))).toEqual(r(hm(12), hm(12, 30)));
  });

  it('respects bounds', () => {
    expect(freeRangeAt([], hm(3), r(hm(6), hm(19)))).toEqual(r(hm(6), hm(19)));
  });
});

describe('gapOrDurationPolicy — hover / click (TimeBooking freeSlotAt, pickSlotAt)', () => {
  const policy = gapOrDurationPolicy({ minutes: 60 });

  it('before the first event: one hour from the rounded time, at most up to the event', () => {
    const b = busy(r(hm(8), hm(12)), r(hm(12, 30), hm(16)));
    expect(policy(ctx('click', b, hm(6, 20)))).toEqual(r(hm(6, 15), hm(7, 15)));
    expect(policy(ctx('click', b, hm(7, 40)))).toEqual(r(hm(7, 45), hm(8)));
    // Rounding up would reach the event: round down instead.
    expect(policy(ctx('click', b, hm(7, 55)))).toEqual(r(hm(7, 45), hm(8)));
  });

  it('after the last event: joins it within one slot', () => {
    const b = busy(r(hm(8), hm(12)), r(hm(12, 30), hm(16)));
    expect(policy(ctx('hover', b, hm(16, 5)))).toEqual(r(hm(16), hm(17)));
    expect(policy(ctx('hover', b, hm(17, 5)))).toEqual(r(hm(17), hm(18)));
    expect(policy(ctx('hover', b, hm(17, 29)))).toEqual(r(hm(17, 30), hm(18, 30)));
  });

  it('on an event nothing; an empty day; the end of the day', () => {
    const b = busy(r(hm(8), hm(12)), r(hm(12, 30), hm(16)));
    expect(policy(ctx('click', b, hm(9)))).toBeNull();
    expect(policy(ctx('click', [], hm(9, 50)))).toEqual(r(hm(9, 45), hm(10, 45)));
    expect(policy(ctx('click', [], hm(23, 30)))).toEqual(r(hm(23, 30), 24 * 60));
  });

  it('between two events: the whole gap', () => {
    const b = busy(r(hm(8), hm(12)), r(hm(12, 30), hm(14)));
    expect(policy(ctx('hover', b, hm(12, 10)))).toEqual(r(hm(12), hm(12, 30)));
    expect(policy(ctx('click', b, hm(15)))).toEqual(r(hm(15), hm(16)));
    expect(policy(ctx('click', b, hm(7)))).toEqual(r(hm(7), hm(8)));
  });

  it('stays inside the visible time range', () => {
    const bounds = r(hm(6), hm(19));
    expect(policy(ctx('click', [], hm(18, 40), undefined, { bounds }))).toEqual(
      r(hm(18, 45), hm(19)),
    );
    expect(policy(ctx('click', [], hm(18, 55), undefined, { bounds }))).toEqual(
      r(hm(18, 45), hm(19)),
    );
  });

  it('overlap: true ignores events', () => {
    const p = gapOrDurationPolicy({ minutes: 60, overlap: true });
    const b = busy(r(hm(8), hm(12)));
    expect(p(ctx('click', b, hm(9, 10)))).toEqual(r(hm(9, 15), hm(10, 15)));
    expect(p(ctx('drag', b, hm(11), hm(7)))).toEqual(r(hm(7), hm(11)));
  });
});

describe('gapOrDurationPolicy — drag (TimeBooking dragRange)', () => {
  const policy = gapOrDurationPolicy({ minutes: 60 });
  const b = busy(r(hm(8), hm(12)), r(hm(13), hm(14)));

  it('both ends on the slot grid, either direction', () => {
    expect(policy(ctx('drag', b, hm(16, 40), hm(15, 2)))).toEqual(r(hm(15), hm(16, 45)));
    expect(policy(ctx('drag', b, hm(15, 2), hm(16, 40)))).toEqual(r(hm(15), hm(16, 45)));
  });

  it('limited to the free range around the anchor', () => {
    expect(policy(ctx('drag', b, hm(15), hm(12, 10)))).toEqual(r(hm(12, 15), hm(13)));
    expect(policy(ctx('drag', b, hm(10), hm(6)))).toEqual(r(hm(6), hm(8)));
  });

  it('empty while not dragged; nothing out of an event', () => {
    expect(policy(ctx('drag', b, hm(15, 5), hm(15)))).toBeNull();
    expect(policy(ctx('drag', b, hm(15), hm(9)))).toBeNull();
  });
});

describe('defaultSelectionPolicy', () => {
  const policy = defaultSelectionPolicy();

  it('hover / click: the slot under the pointer, events ignored', () => {
    const b = busy(r(hm(8), hm(12)));
    expect(policy(ctx('click', b, hm(9, 10), undefined, { slotDuration: 30 }))).toEqual(
      r(hm(9), hm(9, 30)),
    );
    expect(policy(ctx('hover', [], hm(23, 50)))).toEqual(r(hm(23, 45), 24 * 60));
  });

  it('drag: snapped, either direction, clamped to bounds; empty → null', () => {
    const bounds = r(hm(6), hm(19));
    expect(policy(ctx('drag', [], hm(5), hm(7, 20), { bounds }))).toEqual(r(hm(6), hm(7, 15)));
    expect(policy(ctx('drag', [], hm(20), hm(18), { bounds }))).toEqual(r(hm(18), hm(19)));
    expect(policy(ctx('drag', [], hm(9, 5), hm(9)))).toBeNull();
  });
});

describe('busyMinutesOn', () => {
  const ev = (id: string, s: string, e: string): CalendarEvent => ({
    id,
    start: Temporal.ZonedDateTime.from(`${s}[${zone}]`),
    end: Temporal.ZonedDateTime.from(`${e}[${zone}]`),
  });

  it('timed events of the day as minutes, sorted; all-day events are not busy', () => {
    const events: CalendarEvent[] = [
      ev('b', '2026-04-15T13:00', '2026-04-15T14:00'),
      ev('a', '2026-04-15T08:00', '2026-04-15T12:00'),
      ev('other-day', '2026-04-16T08:00', '2026-04-16T09:00'),
      { id: 'all-day', start: Temporal.PlainDate.from('2026-04-15') },
    ];
    expect(busyMinutesOn(events, date, zone).map((x) => [x.event.id, x.start, x.end])).toEqual([
      ['a', hm(8), hm(12)],
      ['b', hm(13), hm(14)],
    ]);
  });

  it('clips an event over midnight to each day', () => {
    const events = [ev('night', '2026-04-15T22:00', '2026-04-16T02:00')];
    expect(busyMinutesOn(events, date, zone).map((x) => [x.start, x.end])).toEqual([
      [hm(22), 24 * 60],
    ]);
    expect(
      busyMinutesOn(events, date.add({ days: 1 }), zone).map((x) => [x.start, x.end]),
    ).toEqual([[0, hm(2)]]);
  });

  it('wall-clock minutes in the display zone, also on a DST day', () => {
    const dst = Temporal.PlainDate.from('2026-03-29');
    const events = [ev('x', '2026-03-29T01:00', '2026-03-29T04:00')];
    expect(busyMinutesOn(events, dst, zone).map((x) => [x.start, x.end])).toEqual([
      [hm(1), hm(4)],
    ]);
  });
});

describe('minuteOfDayToZoned', () => {
  it('a minute of the day in the zone; 1440 is the next midnight', () => {
    expect(minuteOfDayToZoned(date, hm(9, 15), zone)?.toString()).toBe(
      '2026-04-15T09:15:00+02:00[Europe/Vienna]',
    );
    expect(minuteOfDayToZoned(date, 24 * 60, zone)?.toString()).toBe(
      '2026-04-16T00:00:00+02:00[Europe/Vienna]',
    );
  });

  it('a wall time in the spring-forward gap: compatible shifts, reject gives null', () => {
    const dst = Temporal.PlainDate.from('2026-03-29');
    expect(minuteOfDayToZoned(dst, hm(2, 30), zone, 'compatible')?.toString()).toBe(
      '2026-03-29T03:30:00+02:00[Europe/Vienna]',
    );
    expect(minuteOfDayToZoned(dst, hm(2, 30), zone, 'reject')).toBeNull();
  });
});
