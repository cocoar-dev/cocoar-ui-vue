import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarCalendarBoard from '../CoarCalendarBoard.vue';
import {
  weekBoardRows,
  yearWallColumns,
  yearWallRows,
  type CalendarEvent,
  type CalendarPeriod,
} from '../../core';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

const PERIODS: CalendarPeriod[] = [
  { key: 'morning', startMinutes: 0, endMinutes: 12 * 60 },
  { key: 'evening', startMinutes: 12 * 60, endMinutes: 24 * 60 },
];

const sample = (): CalendarEvent[] => [
  {
    id: 'training',
    start: zdt('2026-11-19T15:30:00', 'Europe/Vienna'),
    end: zdt('2026-11-19T17:00:00', 'Europe/Vienna'),
    meta: { title: 'Training', color: '#2f855a' },
  },
  { id: 'camp', start: pd('2026-11-17'), end: pd('2026-11-20'), meta: { title: 'Camp' } },
];

const newBuilder = (events = sample()) =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-11-19'))
    .events(ref(events));

const rows = (ctx: { dates: Temporal.PlainDate[]; timezone: string }) =>
  weekBoardRows({ dates: ctx.dates, periods: PERIODS, timezone: ctx.timezone, extraRows: ['meals'] });

describe('CoarCalendarBoard', () => {
  it('draws the week with its rows, events and bars', () => {
    const w = mount(CoarCalendarBoard, { props: { builder: newBuilder(), rows } });
    expect(w.findAll('.coar-calendar-board__column-header')).toHaveLength(7);
    expect(w.findAll('[data-row-key]').map((r) => r.attributes('data-row-key'))).toEqual([
      '__all-day',
      'morning',
      'evening',
      'meals',
    ]);
    const cell = w.find('[data-row-key="evening"] [data-day-key="2026-11-19"]');
    expect(cell.text()).toContain('Training');
    const bar = w.find('.coar-calendar-board__bar');
    expect(bar.text()).toBe('Camp');
    expect((bar.element as HTMLElement).style.gridColumn).toBe('2 / 5');
  });

  it('follows the cursor', async () => {
    const b = newBuilder();
    const w = mount(CoarCalendarBoard, { props: { builder: b, rows } });
    b.api.goTo(Temporal.PlainDate.from('2026-11-26'));
    await nextTick();
    expect(w.find('[data-day-key="2026-11-26"]').exists()).toBe(true);
    expect(w.text()).not.toContain('Training');
  });

  it('fills a custom row and the label through slots', () => {
    const w = mount(CoarCalendarBoard, {
      props: { builder: newBuilder(), rows },
      slots: {
        cell: `<template #cell="{ row, date }"><i v-if="row.key === 'meals'" class="meal">{{ date.day }}</i></template>`,
        rowLabel: `<template #rowLabel="{ row }"><b class="label">{{ row.key.toUpperCase() }}</b></template>`,
      },
    });
    expect(w.find('[data-row-key="meals"] [data-day-key="2026-11-19"] .meal').text()).toBe('19');
    expect(w.find('[data-row-key="meals"] .label').text()).toBe('MEALS');
  });

  it('reports a click on a day and on an event', async () => {
    const onDateClick = vi.fn();
    const onEventClick = vi.fn();
    const b = newBuilder().onDateClick(onDateClick).onEventClick(onEventClick);
    const w = mount(CoarCalendarBoard, { props: { builder: b, rows } });
    await w.find('[data-row-key="morning"] [data-day-key="2026-11-18"]').trigger('pointerdown');
    expect(onDateClick.mock.calls[0][0].date.toString()).toBe('2026-11-18');
    const event = w.find('.coar-calendar-board__event');
    await event.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 5, clientY: 5 });
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5 }));
    expect(onDateClick).toHaveBeenCalledOnce();
    expect(onEventClick).toHaveBeenCalledOnce();
  });

  /** Rows 100 px high, the body from x = 100, seven columns of 100 px. */
  function stubGeometry(w: ReturnType<typeof mount>) {
    w.findAll('[data-row-index]').forEach((row, i) => {
      const top = 100 + i * 100;
      vi.spyOn(row.element, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 100 } as DOMRect);
      vi.spyOn(row.find('.coar-calendar-board__body').element, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        right: 800,
        width: 700,
      } as DOMRect);
    });
  }
  const at = (type: string, x: number, y: number, pointerType = 'mouse') => {
    const e = new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, bubbles: true });
    Object.defineProperty(e, 'pointerType', { value: pointerType });
    return e;
  };
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  it('moves an event to another day and keeps its time', async () => {
    const onEventDrop = vi.fn();
    const b = newBuilder().onEventDrop(onEventDrop);
    const w = mount(CoarCalendarBoard, { props: { builder: b, rows } });
    stubGeometry(w);
    // Rows: all-day 100, morning 200, evening 300; Thursday is column 3.
    await w.find('.coar-calendar-board__event').trigger('pointerdown', {
      button: 0, pointerId: 1, clientX: 450, clientY: 350,
    });
    window.dispatchEvent(at('pointermove', 650, 350));
    await frame();
    window.dispatchEvent(at('pointerup', 650, 350));
    expect(onEventDrop).toHaveBeenCalledOnce();
    const payload = onEventDrop.mock.calls[0][0];
    expect(payload.next.start.toPlainDateTime().toString()).toBe('2026-11-21T15:30:00');
    expect(payload.next.end.toPlainDateTime().toString()).toBe('2026-11-21T17:00:00');
    expect(payload.target.rowKey).toBe('evening');
  });

  it('starts at the beginning of another part of the day', async () => {
    const onEventDrop = vi.fn();
    const b = newBuilder().onEventDrop(onEventDrop);
    const w = mount(CoarCalendarBoard, { props: { builder: b, rows } });
    stubGeometry(w);
    await w.find('.coar-calendar-board__event').trigger('pointerdown', {
      button: 0, pointerId: 1, clientX: 450, clientY: 350,
    });
    window.dispatchEvent(at('pointermove', 450, 250));
    await frame();
    window.dispatchEvent(at('pointerup', 450, 250));
    const payload = onEventDrop.mock.calls[0][0];
    expect(payload.next.start.toPlainDateTime().toString()).toBe('2026-11-19T00:00:00');
    expect(payload.next.end.toPlainDateTime().toString()).toBe('2026-11-19T01:30:00');
    expect(payload.target).toMatchObject({ rowKey: 'morning', sourceRowKey: 'evening' });
  });

  it('starts at the drop time a period names', async () => {
    const onEventDrop = vi.fn();
    const b = newBuilder().onEventDrop(onEventDrop);
    const withDropTime = (ctx: { dates: Temporal.PlainDate[]; timezone: string }) =>
      weekBoardRows({
        dates: ctx.dates,
        timezone: ctx.timezone,
        periods: [{ ...PERIODS[0], dropMinutes: 8 * 60 }, PERIODS[1]],
      });
    const w = mount(CoarCalendarBoard, { props: { builder: b, rows: withDropTime } });
    stubGeometry(w);
    await w.find('.coar-calendar-board__event').trigger('pointerdown', {
      button: 0, pointerId: 1, clientX: 450, clientY: 350,
    });
    window.dispatchEvent(at('pointermove', 450, 250));
    await frame();
    window.dispatchEvent(at('pointerup', 450, 250));
    expect(onEventDrop.mock.calls[0][0].next.start.toPlainTime().toString()).toBe('08:00:00');
  });

  it('honours canDrop with the row under the pointer', async () => {
    const onEventDrop = vi.fn();
    const canDrop = vi.fn((_event, target: { rowKey?: string }) => target.rowKey !== 'morning');
    const b = newBuilder().onEventDrop(onEventDrop).canDrop(canDrop);
    const w = mount(CoarCalendarBoard, { props: { builder: b, rows } });
    stubGeometry(w);
    await w.find('.coar-calendar-board__event').trigger('pointerdown', {
      button: 0, pointerId: 1, clientX: 450, clientY: 350,
    });
    window.dispatchEvent(at('pointermove', 450, 250));
    await frame();
    window.dispatchEvent(at('pointerup', 450, 250));
    expect(canDrop).toHaveBeenCalled();
    expect(onEventDrop).not.toHaveBeenCalled();
  });

  it('selects days across a row with the mouse', async () => {
    const onDateClick = vi.fn();
    const b = newBuilder().onDateClick(onDateClick);
    const w = mount(CoarCalendarBoard, { props: { builder: b, rows, selectable: true } });
    stubGeometry(w);
    const cell = w.find('[data-row-key="morning"] [data-day-key="2026-11-17"]');
    cell.element.dispatchEvent(at('pointerdown', 250, 250));
    window.dispatchEvent(at('pointermove', 450, 250));
    await nextTick();
    expect(w.findAll('.coar-calendar-board__cell--selecting')).toHaveLength(3);
    window.dispatchEvent(at('pointerup', 450, 250));
    const selection = w.emitted('rangeSelect')![0][0] as { rowKey: string; start: unknown; end: unknown };
    expect(String(selection.start)).toBe('2026-11-17');
    expect(String(selection.end)).toBe('2026-11-19');
    expect(selection.rowKey).toBe('morning');
    expect(onDateClick).not.toHaveBeenCalled();
  });

  it('a click without a drag stays a day click when selectable', () => {
    const onDateClick = vi.fn();
    const b = newBuilder().onDateClick(onDateClick);
    const w = mount(CoarCalendarBoard, { props: { builder: b, rows, selectable: true } });
    stubGeometry(w);
    const cell = w.find('[data-row-key="morning"] [data-day-key="2026-11-17"]');
    cell.element.dispatchEvent(at('pointerdown', 250, 250));
    window.dispatchEvent(at('pointerup', 250, 250));
    expect(onDateClick).toHaveBeenCalledOnce();
    expect(w.emitted('rangeSelect')).toBeUndefined();
  });

  it('a touch swipe pages the week', async () => {
    const b = newBuilder();
    const w = mount(CoarCalendarBoard, { props: { builder: b, rows } });
    const cell = w.find('[data-row-key="morning"] [data-day-key="2026-11-17"]');
    cell.element.dispatchEvent(at('pointerdown', 400, 250, 'touch'));
    for (const x of [360, 300, 240, 180]) window.dispatchEvent(at('pointermove', x, 250, 'touch'));
    window.dispatchEvent(at('pointerup', 180, 250, 'touch'));
    await nextTick();
    expect(b.state.date.value.toString()).toBe('2026-11-26');
  });

  it('draws a year wall planner with bands, dots and missing days', () => {
    const events: CalendarEvent[] = [
      { id: 'holidays', start: pd('2026-07-04'), end: pd('2026-08-08'), meta: { title: 'Summer' } },
      { id: 'birthday', start: pd('2026-03-12'), end: pd('2026-03-13'), meta: { title: 'Emma' } },
    ];
    const w = mount(CoarCalendarBoard, {
      props: {
        builder: newBuilder(events),
        range: 'year',
        columns: yearWallColumns(),
        rows: (ctx: { year: number }) => yearWallRows({ year: ctx.year, locale: 'en-GB' }),
      },
      slots: {
        cell: `<template #cell="{ events }"><i v-if="events.length" class="dot" /></template>`,
      },
    });
    expect(w.classes()).toContain('coar-calendar-board--year');
    expect(w.findAll('[data-row-key]')).toHaveLength(12);
    expect(w.findAll('.coar-calendar-board__column-header')).toHaveLength(31);
    expect(w.findAll('.coar-calendar-board__bar')).toHaveLength(2);
    expect(w.find('[data-day-key="2026-03-12"] .dot').exists()).toBe(true);
    expect(w.find('[data-day-key="2026-03-12"] .coar-calendar-board__event').exists()).toBe(false);
    expect(w.findAll('[data-row-key="2026-02"] .coar-calendar-board__cell--none')).toHaveLength(3);
  });

  it('moves the focus with the arrow keys', async () => {
    const w = mount(CoarCalendarBoard, {
      props: { builder: newBuilder(), rows },
      attachTo: document.body,
    });
    const first = w.find('[data-board-cell="0:0"]');
    expect(first.attributes('tabindex')).toBe('0');
    (first.element as HTMLElement).focus();
    await first.trigger('keydown', { key: 'ArrowRight' });
    await w.find('[data-board-cell="0:1"]').trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
    expect(w.find('[data-board-cell="1:1"]').attributes('tabindex')).toBe('0');
    w.unmount();
  });
});
