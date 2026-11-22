import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarCalendarBoard from '../CoarCalendarBoard.vue';
import { weekBoardRows, type CalendarEvent, type CalendarPeriod } from '../../core';
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
    await event.trigger('pointerdown');
    await event.trigger('pointerup');
    expect(onDateClick).toHaveBeenCalledOnce();
    expect(onEventClick).toHaveBeenCalledOnce();
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
