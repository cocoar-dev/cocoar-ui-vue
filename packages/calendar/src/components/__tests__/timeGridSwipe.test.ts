/**
 * Touch paging on the time grid (`useTimeGridSwipe` through
 * `<CoarDayView>`).
 *
 * happy-dom reports a zero-width columns container, so the commit
 * threshold is the 40 px floor and the settle animation is skipped
 * (nothing would move) — commits are synchronous on release.
 */

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarDayView from '../CoarDayView.vue';
import CoarWeekView from '../CoarWeekView.vue';

const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref([]));

interface PointerInit {
  pointerId?: number;
  pointerType?: string;
  clientX?: number;
  clientY?: number;
}

/** Build a pointer event that carries `pointerType` even where PointerEvent is missing. */
function pointer(type: string, init: PointerInit): Event {
  const base = { bubbles: true, cancelable: true, clientX: 0, clientY: 0, ...init };
  const Ctor = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  const e = new Ctor(type, base as MouseEventInit);
  for (const key of ['pointerId', 'pointerType'] as const) {
    if ((e as unknown as Record<string, unknown>)[key] !== init[key]) {
      Object.defineProperty(e, key, { value: init[key], configurable: true });
    }
  }
  return e;
}

async function swipeOn(el: Element, from: number, to: number, opts: { dy?: number } = {}) {
  el.dispatchEvent(
    pointer('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: from, clientY: 100 }),
  );
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const x = from + ((to - from) * i) / steps;
    const y = 100 + ((opts.dy ?? 0) * i) / steps;
    window.dispatchEvent(
      pointer('pointermove', { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y }),
    );
  }
  window.dispatchEvent(
    pointer('pointerup', {
      pointerId: 7,
      pointerType: 'touch',
      clientX: to,
      clientY: 100 + (opts.dy ?? 0),
    }),
  );
  await nextTick();
}

describe('time grid touch paging', () => {
  it('a leftward pan past the threshold pages to the next day', async () => {
    const b = newBuilder().view('day');
    const w = mount(CoarDayView, { props: { builder: b } });
    await swipeOn(w.find('.coar-time-grid-column').element, 200, 100);
    expect(b.state.date.value.toString()).toBe('2026-06-16');
  });

  it('a rightward pan pages to the previous day', async () => {
    const b = newBuilder().view('day');
    const w = mount(CoarDayView, { props: { builder: b } });
    await swipeOn(w.find('.coar-time-grid-column').element, 100, 200);
    expect(b.state.date.value.toString()).toBe('2026-06-14');
  });

  it('week grid pages by a week', async () => {
    const b = newBuilder().view('week');
    const w = mount(CoarWeekView, { props: { builder: b } });
    await swipeOn(w.find('.coar-time-grid-column').element, 300, 100);
    expect(b.state.date.value.toString()).toBe('2026-06-22');
  });

  it('a short pan settles back without paging', async () => {
    const b = newBuilder().view('day');
    const w = mount(CoarDayView, { props: { builder: b } });
    await swipeOn(w.find('.coar-time-grid-column').element, 200, 180);
    expect(b.state.date.value.toString()).toBe('2026-06-15');
    expect(w.find('.coar-time-grid').attributes('style') ?? '').toContain(
      '--coar-time-grid-swipe-x: 0px',
    );
  });

  it('a vertical-first move is left to native scrolling', async () => {
    const b = newBuilder().view('day');
    const w = mount(CoarDayView, { props: { builder: b } });
    await swipeOn(w.find('.coar-time-grid-column').element, 200, 100, { dy: 300 });
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });

  it('a touch tap reaches onTimeClick on release — not on press, and not after a pan', async () => {
    const onTimeClick = vi.fn();
    const b = newBuilder().view('day').onTimeClick(onTimeClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    const col = w.find('.coar-time-grid-column').element;
    col.dispatchEvent(
      pointer('pointerdown', { pointerId: 3, pointerType: 'touch', clientX: 50, clientY: 90 }),
    );
    expect(onTimeClick).not.toHaveBeenCalled();
    window.dispatchEvent(
      pointer('pointerup', { pointerId: 3, pointerType: 'touch', clientX: 52, clientY: 91 }),
    );
    expect(onTimeClick).toHaveBeenCalledTimes(1);
    expect(onTimeClick.mock.calls[0][0].date.toString()).toBe('2026-06-15');

    await swipeOn(col, 200, 100);
    expect(onTimeClick).toHaveBeenCalledTimes(1);
  });

  it('mouse keeps click-on-press semantics', async () => {
    const onTimeClick = vi.fn();
    const b = newBuilder().view('day').onTimeClick(onTimeClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    w.find('.coar-time-grid-column').element.dispatchEvent(
      pointer('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 90 }),
    );
    expect(onTimeClick).toHaveBeenCalledTimes(1);
  });

  it('swipeNavigation(false): no paging, touch press fires onTimeClick immediately', async () => {
    const onTimeClick = vi.fn();
    const b = newBuilder().view('day').swipeNavigation(false).onTimeClick(onTimeClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    const col = w.find('.coar-time-grid-column').element;
    col.dispatchEvent(
      pointer('pointerdown', { pointerId: 9, pointerType: 'touch', clientX: 50, clientY: 90 }),
    );
    expect(onTimeClick).toHaveBeenCalledTimes(1);
    await swipeOn(col, 200, 100);
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });
});
