/**
 * The day-name strip is a paging handle for every pointer type. Pins:
 *   - a mouse drag across the header pages the grid
 *   - a mouse drag on the columns does NOT (drag-and-drop / slot
 *     click territory), and the slot click still fires on press
 *   - a plain header click never pages
 *   - the grab affordance follows `swipeNavigation`
 */

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarWeekView from '../CoarWeekView.vue';
import CoarDayView from '../CoarDayView.vue';

const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref([]));

function mouse(type: string, x: number, button = 0): Event {
  const Ctor = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  const e = new Ctor(type, { bubbles: true, cancelable: true, clientX: x, clientY: 40, button });
  Object.defineProperty(e, 'pointerId', { value: 1, configurable: true });
  Object.defineProperty(e, 'pointerType', { value: 'mouse', configurable: true });
  return e;
}

async function dragOn(el: Element, from: number, to: number) {
  el.dispatchEvent(mouse('pointerdown', from));
  window.dispatchEvent(mouse('pointermove', from + (to - from) / 2));
  window.dispatchEvent(mouse('pointermove', to));
  window.dispatchEvent(mouse('pointerup', to));
  await nextTick();
}

describe('mouse drag on the day-name strip', () => {
  it('pages the week grid', async () => {
    const b = newBuilder().view('week');
    const w = mount(CoarWeekView, { props: { builder: b } });
    const strip = w.find('.coar-time-grid-header__cells');
    expect(strip.classes()).toContain('coar-time-grid-header__cells--swipeable');
    await dragOn(strip.element, 300, 100);
    expect(b.state.date.value.toString()).toBe('2026-06-22');
    await dragOn(strip.element, 100, 300);
    await dragOn(strip.element, 100, 300);
    expect(b.state.date.value.toString()).toBe('2026-06-08');
  });

  it('a plain click on the strip does not page', async () => {
    const b = newBuilder().view('week');
    const w = mount(CoarWeekView, { props: { builder: b } });
    const strip = w.find('.coar-time-grid-header__cells').element;
    strip.dispatchEvent(mouse('pointerdown', 200));
    window.dispatchEvent(mouse('pointerup', 202));
    await nextTick();
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });

  it('a secondary-button drag is ignored', async () => {
    const b = newBuilder().view('week');
    const w = mount(CoarWeekView, { props: { builder: b } });
    const strip = w.find('.coar-time-grid-header__cells').element;
    strip.dispatchEvent(mouse('pointerdown', 300, 2));
    window.dispatchEvent(mouse('pointermove', 100, 2));
    window.dispatchEvent(mouse('pointerup', 100, 2));
    await nextTick();
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });

  it('on the columns a mouse drag does not page and the slot click fires on press', async () => {
    const onTimeClick = vi.fn();
    const b = newBuilder().view('day').onTimeClick(onTimeClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    const col = w.find('.coar-time-grid-column').element;
    await dragOn(col, 300, 100);
    expect(onTimeClick).toHaveBeenCalledTimes(1);
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });

  it('swipeNavigation(false) removes the affordance and the gesture', async () => {
    const b = newBuilder().view('week').swipeNavigation(false);
    const w = mount(CoarWeekView, { props: { builder: b } });
    const strip = w.find('.coar-time-grid-header__cells');
    expect(strip.classes()).not.toContain('coar-time-grid-header__cells--swipeable');
    await dragOn(strip.element, 300, 100);
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });
});
