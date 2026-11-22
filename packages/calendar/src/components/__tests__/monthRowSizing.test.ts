/**
 * Month rows of a fixed height, and the day cell's own content.
 *
 * Pins:
 *   - `auto` stays the default: a row grows with its lanes
 *   - `uniform` keeps every row equal, what does not fit folds into "+N"
 *   - `fill` hands the height to CSS, a continuous month treats it as `uniform`
 *   - `#dayNumber`, `#dayContent` and `dayClass` reach the neighbouring days
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarMonthView from '../CoarMonthView.vue';
import { fitMonthRow, type CalendarEvent, type CalendarMonthRowSizing } from '../../core';
import { pd } from '../../__test-utils__/event-fixtures';

const bars = (count: number): CalendarEvent[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `bar${i}`,
    start: pd('2026-06-15'),
    end: pd('2026-06-18'),
    meta: { title: `Bar ${i}` },
  }));

function newBuilder(events: CalendarEvent[], sizing?: CalendarMonthRowSizing) {
  const b = CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .view('month')
    .date(Temporal.PlainDate.from('2026-06-15'))
    .monthMaxVisibleLanes(null)
    .events(ref(events));
  if (sizing) b.monthRowSizing(sizing);
  return b;
}

const rowHeights = (w: ReturnType<typeof mount>) =>
  w.findAll('.coar-month-row').map((r) => (r.element as HTMLElement).style.height);

describe('fitMonthRow', () => {
  const base = {
    rowHeight: 94,
    dayNumberHeight: 24,
    pillsPaddingTop: 3,
    pillsPaddingBottom: 4,
    markerHeight: 18,
    barHeight: 18,
    barGap: 2,
    pillHeight: 18,
    pillGap: 2,
    laneCount: 0,
    maxLanes: 2,
    pillLimit: 2,
  };

  it('gives an empty row its full pill limit', () => {
    expect(fitMonthRow(base)).toMatchObject({ maxLanes: 2, pillLimit: 2 });
  });

  it('lets bars take the room of the pills', () => {
    expect(fitMonthRow({ ...base, laneCount: 2 })).toMatchObject({ maxLanes: 2, pillLimit: 0 });
  });

  it('never exceeds what the row can hold, whatever the cap says', () => {
    expect(fitMonthRow({ ...base, rowHeight: 60, maxLanes: null, laneCount: 5 }).maxLanes).toBe(0);
  });

  it('gives a cell without "+N" the room of that row', () => {
    const fit = fitMonthRow({ ...base, rowHeight: 90, pillHeight: 15, pillLimit: 3 });
    expect(fit.pillLimit).toBe(2);
    expect(fit.pillLimitWithoutMarker).toBe(3);
  });
});

describe('monthRowSizing', () => {
  it('auto: the row with lanes grows', () => {
    const w = mount(CoarMonthView, { props: { builder: newBuilder(bars(3)) } });
    expect(new Set(rowHeights(w)).size).toBeGreaterThan(1);
  });

  it('uniform: all rows are equal and hidden bars fold into "+N"', () => {
    const w = mount(CoarMonthView, { props: { builder: newBuilder(bars(5), 'uniform') } });
    expect(new Set(rowHeights(w)).size).toBe(1);
    expect(w.find('[data-day-key="2026-06-15"] .coar-month-cell__overflow').exists()).toBe(true);
  });

  it('fill: the rows take their height from CSS', () => {
    const w = mount(CoarMonthView, { props: { builder: newBuilder(bars(1), 'fill') } });
    expect(w.classes()).toContain('coar-month-view--rows-fill');
    expect(rowHeights(w).every((h) => h === '')).toBe(true);
  });

  it('fill in a continuous section behaves as uniform', () => {
    const w = mount(CoarMonthView, {
      props: { builder: newBuilder(bars(1), 'fill'), continuousSection: true, manageViewWindow: false },
    });
    expect(w.classes()).toContain('coar-month-view--rows-uniform');
  });
});

describe('maxEventsPerCell in a row of fixed height', () => {
  const sameDay = (count: number): CalendarEvent[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `e${i}`,
      start: pd('2026-06-16'),
      end: pd('2026-06-17'),
      meta: { title: `Event ${i}` },
    }));
  const cell = (w: ReturnType<typeof mount>) => w.find('[data-day-key="2026-06-16"]');

  it('shows all events that fit, without a "+N" in their place', () => {
    const b = newBuilder(sameDay(3), 'uniform').maxEventsPerCell(3);
    const w = mount(CoarMonthView, { props: { builder: b } });
    expect(cell(w).findAll('.coar-month-pill')).toHaveLength(3);
    expect(cell(w).find('.coar-month-cell__overflow').exists()).toBe(false);
  });

  it('gives a day without a bar the lines of the bars elsewhere in its week', () => {
    const friday = Array.from({ length: 5 }, (_, i) => ({
      id: `f${i}`,
      start: pd('2026-06-19'),
      end: pd('2026-06-20'),
      meta: { title: `Friday ${i}` },
    }));
    const b = newBuilder([...bars(1), ...friday], 'uniform').maxEventsPerCell(3);
    const w = mount(CoarMonthView, { props: { builder: b } });
    const free = w.find('[data-day-key="2026-06-19"]');
    expect(free.findAll('.coar-month-pill')).toHaveLength(3);
    expect((free.find('.coar-month-cell__pills').element as HTMLElement).style.marginTop).toBe('0px');
  });

  it('keeps one band for the whole week in a row that follows its content', () => {
    const friday: CalendarEvent = { id: 'f', start: pd('2026-06-19'), end: pd('2026-06-20'), meta: { title: 'F' } };
    const w = mount(CoarMonthView, { props: { builder: newBuilder([...bars(1), friday]) } });
    const pills = w.find('[data-day-key="2026-06-19"] .coar-month-cell__pills').element as HTMLElement;
    expect(pills.style.marginTop).not.toBe('0px');
  });

  it('keeps the limit and folds the rest into "+N"', () => {
    const b = newBuilder(sameDay(5), 'uniform').maxEventsPerCell(3);
    const w = mount(CoarMonthView, { props: { builder: b } });
    expect(cell(w).findAll('.coar-month-pill').length).toBeLessThanOrEqual(3);
    expect(cell(w).find('.coar-month-cell__overflow').exists()).toBe(true);
  });
});

describe('day cell content', () => {
  it('renders #dayNumber and #dayContent with the neighbouring-month flag', () => {
    const w = mount(CoarMonthView, {
      props: { builder: newBuilder([]) },
      slots: {
        dayNumber: `<template #dayNumber="{ date }"><i class="num">{{ date.day }}</i></template>`,
        dayContent: `<template #dayContent="{ isOtherMonth }"><b class="marks" :data-other="isOtherMonth" /></template>`,
      },
    });
    expect(w.find('[data-day-key="2026-06-15"] .num').text()).toBe('15');
    expect(w.find('[data-day-key="2026-06-15"] .marks').attributes('data-other')).toBe('false');
    expect(w.find('[data-day-key="2026-07-01"] .marks').attributes('data-other')).toBe('true');
    expect(w.find('.coar-month-cell__day-number').exists()).toBe(false);
  });

  it('adds the classes of dayClass per day', () => {
    const b = newBuilder([]).dayClass((d) => (d.day === 20 ? 'is-free' : null));
    const w = mount(CoarMonthView, { props: { builder: b } });
    expect(w.find('[data-day-key="2026-06-20"]').classes()).toContain('is-free');
    expect(w.find('[data-day-key="2026-06-21"]').classes()).not.toContain('is-free');
  });
});
