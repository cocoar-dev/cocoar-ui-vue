/**
 * `<CoarPagedMonthView>`: one month at a time, turned by swiping.
 *
 * happy-dom reports a zero width, so the commit threshold is the 40 px
 * floor and the settle animation is skipped.
 */

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarCalendar from '../CoarCalendar.vue';
import CoarPagedMonthView from '../CoarPagedMonthView.vue';
import type { CalendarEvent } from '../../core';
import { pd } from '../../__test-utils__/event-fixtures';

const newBuilder = (events: CalendarEvent[] = []) =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .view('month')
    .monthPresentation('paged')
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref(events));

function pointer(type: string, init: { clientX: number; clientY: number; pointerType?: string }): Event {
  const base = { bubbles: true, cancelable: true, ...init };
  const Ctor = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  const e = new Ctor(type, base as MouseEventInit);
  Object.defineProperty(e, 'pointerId', { value: 7, configurable: true });
  Object.defineProperty(e, 'pointerType', { value: init.pointerType ?? 'touch', configurable: true });
  return e;
}

function press(el: Element, x: number, y = 100) {
  el.dispatchEvent(pointer('pointerdown', { clientX: x, clientY: y }));
}
function moveTo(x: number, y = 100) {
  window.dispatchEvent(pointer('pointermove', { clientX: x, clientY: y }));
}
async function release(x: number, y = 100) {
  window.dispatchEvent(pointer('pointerup', { clientX: x, clientY: y }));
  await nextTick();
}
async function swipe(el: Element, from: number, to: number, dy = 0) {
  press(el, from);
  for (let i = 1; i <= 4; i++) moveTo(from + ((to - from) * i) / 4, 100 + (dy * i) / 4);
  await release(to, 100 + dy);
}

const cell = (w: ReturnType<typeof mount>, key: string) =>
  w.find(`[data-day-key="${key}"]`).element;

describe('CoarPagedMonthView', () => {
  it('turns to the next and previous month', async () => {
    const b = newBuilder();
    const w = mount(CoarPagedMonthView, { props: { builder: b } });
    await swipe(cell(w, '2026-06-15'), 300, 100);
    expect(b.state.date.value.toString()).toBe('2026-07-15');
    await swipe(cell(w, '2026-07-15'), 100, 300);
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });

  it('stays below the threshold and on a vertical pan', async () => {
    const b = newBuilder();
    const w = mount(CoarPagedMonthView, { props: { builder: b } });
    await swipe(cell(w, '2026-06-15'), 300, 280);
    await swipe(cell(w, '2026-06-15'), 300, 310, 200);
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });

  it('mounts inert neighbours only while a gesture runs', async () => {
    const w = mount(CoarPagedMonthView, { props: { builder: newBuilder() } });
    expect(w.findAll('.coar-paged-month-view__page')).toHaveLength(1);
    press(cell(w, '2026-06-15'), 300);
    await nextTick();
    const pages = w.findAll('.coar-paged-month-view__page');
    expect(pages.map((p) => p.attributes('data-month-key'))).toEqual(['2026-05', '2026-06', '2026-07']);
    expect(pages[0].attributes('aria-hidden')).toBe('true');
    expect(pages[0].attributes('inert')).toBeDefined();
    expect(pages[1].attributes('inert')).toBeUndefined();
    await release(300);
  });

  it('loads the neighbouring months with the visible window', async () => {
    const b = newBuilder();
    mount(CoarPagedMonthView, { props: { builder: b } });
    await nextTick();
    const range = b.api.visibleRange.value!;
    expect(range.start <= '2026-05-01').toBe(true);
    expect(range.end >= '2026-08-01').toBe(true);
  });

  it('keeps all rows equal, whatever the month carries', () => {
    const bars: CalendarEvent[] = Array.from({ length: 4 }, (_, i) => ({
      id: `b${i}`,
      start: pd('2026-06-15'),
      end: pd('2026-06-18'),
      meta: { title: 'Bar' },
    }));
    const w = mount(CoarPagedMonthView, { props: { builder: newBuilder(bars) } });
    const heights = w.findAll('.coar-month-row').map((r) => (r.element as HTMLElement).style.height);
    expect(new Set(heights).size).toBe(1);
  });

  it('a tap on a neighbouring day reaches onDateClick and does not turn the page', async () => {
    const onDateClick = vi.fn();
    const b = newBuilder().onDateClick(onDateClick);
    const w = mount(CoarPagedMonthView, { props: { builder: b } });
    const el = cell(w, '2026-07-01');
    press(el, 200);
    await release(200);
    window.dispatchEvent(new MouseEvent('click'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onDateClick).toHaveBeenCalledOnce();
    expect(onDateClick.mock.calls[0][0].date.toString()).toBe('2026-07-01');
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });

  it('does not take a swipe that starts on an event', async () => {
    const b = newBuilder([{ id: 'e', start: pd('2026-06-15'), end: pd('2026-06-16'), meta: { title: 'E' } }]);
    const w = mount(CoarPagedMonthView, { props: { builder: b } });
    await swipe(w.find('[data-event-id]').element, 300, 100);
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });
});

describe('CoarCalendar with monthPresentation', () => {
  it('shows the paged month and keeps the continuous one as default', async () => {
    const paged = mount(CoarCalendar, { props: { builder: newBuilder() } });
    expect(paged.find('.coar-paged-month-view').exists()).toBe(true);
    expect(paged.find('.coar-continuous-month-view').exists()).toBe(false);
    const b = newBuilder().monthPresentation('continuous');
    const continuous = mount(CoarCalendar, { props: { builder: b } });
    expect(continuous.find('.coar-continuous-month-view').exists()).toBe(true);
    expect(continuous.find('.coar-paged-month-view').exists()).toBe(false);
  });

  it('the range label follows the paged month', async () => {
    const b = newBuilder();
    const w = mount(CoarCalendar, { props: { builder: b } });
    b.api.next();
    await nextTick();
    await nextTick();
    expect(w.find('.coar-calendar__range-label').text()).toMatch(/Juli|July/);
  });
});
