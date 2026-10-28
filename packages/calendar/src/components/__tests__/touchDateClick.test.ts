/**
 * `onDateClick` on touch screens — a tap, not the start of a scroll.
 *
 * Pins:
 *   - mouse: `onDateClick` fires on press, as before
 *   - touch / pen: nothing on press; on a lift in place, the hook
 *     fires only after the click that follows (so that click cannot
 *     land on an overlay the handler opens)
 *   - a move past the slop or a `pointercancel` (the browser took the
 *     touch for scrolling) drops it
 *   - no click after the lift (some WebViews): it fires after a wait
 *   - the same for the time grid's all-day band
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { CalendarEvent } from '../../core';
import { pd } from '../../__test-utils__/event-fixtures';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarMonthView from '../CoarMonthView.vue';
import CoarDayView from '../CoarDayView.vue';
import { CLICK_WAIT_MS } from '../internal/surfaceTap';

// An all-day event so the day view renders its all-day band.
const events = (): CalendarEvent[] => [
  { id: 'offsite', start: pd('2026-06-15'), end: pd('2026-06-16'), meta: { title: 'Offsite' } },
];

const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref(events()));

// Attached, so the click on a cell bubbles to `window` as in a browser.
const mounted: Array<{ unmount(): void }> = [];

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

const down = (el: Element, pointerType: string, x = 20, y = 20) =>
  el.dispatchEvent(pointer('pointerdown', { pointerId: 5, pointerType, clientX: x, clientY: y }));
const move = (pointerType: string, x: number, y: number) =>
  window.dispatchEvent(
    pointer('pointermove', { pointerId: 5, pointerType, clientX: x, clientY: y }),
  );
const up = (pointerType: string, x = 20, y = 20) =>
  window.dispatchEvent(pointer('pointerup', { pointerId: 5, pointerType, clientX: x, clientY: y }));
const cancel = (pointerType: string) =>
  window.dispatchEvent(pointer('pointercancel', { pointerId: 5, pointerType }));
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

afterEach(() => {
  vi.useRealTimers();
  while (mounted.length) mounted.pop()!.unmount();
});

function mountMonth() {
  const onDateClick = vi.fn();
  const w = mount(CoarMonthView, {
    props: { builder: newBuilder().view('month').onDateClick(onDateClick) },
    attachTo: document.body,
  });
  mounted.push(w);
  const cell = w.find('[data-day-key="2026-06-17"]').element;
  return { onDateClick, cell };
}

describe('month grid — onDateClick by pointer type', () => {
  it('mouse: fires on press', () => {
    const { onDateClick, cell } = mountMonth();
    down(cell, 'mouse');
    expect(onDateClick).toHaveBeenCalledTimes(1);
    expect(onDateClick.mock.calls[0][0].date.toString()).toBe('2026-06-17');
  });

  it('touch tap: nothing on press or lift, fires after the following click', () => {
    vi.useFakeTimers();
    const { onDateClick, cell } = mountMonth();
    down(cell, 'touch');
    expect(onDateClick).not.toHaveBeenCalled();
    move('touch', 24, 23); // jitter within the slop
    up('touch', 24, 23);
    expect(onDateClick).not.toHaveBeenCalled();
    click(cell);
    // Still not inside the click's own dispatch …
    expect(onDateClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    // … but in the task right after it.
    expect(onDateClick).toHaveBeenCalledTimes(1);
    const payload = onDateClick.mock.calls[0][0];
    expect(payload.date.toString()).toBe('2026-06-17');
    expect(payload.native.type).toBe('pointerdown');
    // A later stray click does not fire it again.
    click(cell);
    vi.advanceTimersByTime(CLICK_WAIT_MS * 2);
    expect(onDateClick).toHaveBeenCalledTimes(1);
  });

  it('pen behaves like touch', () => {
    vi.useFakeTimers();
    const { onDateClick, cell } = mountMonth();
    down(cell, 'pen');
    expect(onDateClick).not.toHaveBeenCalled();
    up('pen');
    click(cell);
    vi.advanceTimersByTime(0);
    expect(onDateClick).toHaveBeenCalledTimes(1);
  });

  it('touch scroll (pointercancel): never fires', () => {
    vi.useFakeTimers();
    const { onDateClick, cell } = mountMonth();
    down(cell, 'touch');
    move('touch', 20, 26);
    cancel('touch');
    vi.advanceTimersByTime(CLICK_WAIT_MS * 2);
    expect(onDateClick).not.toHaveBeenCalled();
  });

  it('touch moved past the slop: never fires, even if a click follows', () => {
    vi.useFakeTimers();
    const { onDateClick, cell } = mountMonth();
    down(cell, 'touch');
    move('touch', 20, 60);
    up('touch', 20, 60);
    click(cell);
    vi.advanceTimersByTime(CLICK_WAIT_MS * 2);
    expect(onDateClick).not.toHaveBeenCalled();
  });

  it('touch tap without a following click: fires after the wait', () => {
    vi.useFakeTimers();
    const { onDateClick, cell } = mountMonth();
    down(cell, 'touch');
    up('touch');
    vi.advanceTimersByTime(CLICK_WAIT_MS - 1);
    expect(onDateClick).not.toHaveBeenCalled();
    // The wait, then the task after it (fake timers place a 0 ms timer
    // set during a tick 1 ms later).
    vi.advanceTimersByTime(2);
    expect(onDateClick).toHaveBeenCalledTimes(1);
  });
});

describe('time grid all-day band — onDateClick by pointer type', () => {
  function mountDay() {
    const onDateClick = vi.fn();
    const w = mount(CoarDayView, {
      props: { builder: newBuilder().view('day').onDateClick(onDateClick) },
      attachTo: document.body,
    });
    mounted.push(w);
    const cell = w.find('.coar-time-grid-all-day-band__cell').element;
    return { onDateClick, cell };
  }

  it('mouse: fires on press', () => {
    const { onDateClick, cell } = mountDay();
    down(cell, 'mouse');
    expect(onDateClick).toHaveBeenCalledTimes(1);
    expect(onDateClick.mock.calls[0][0].date.toString()).toBe('2026-06-15');
  });

  it('touch: only a tap fires, after its click', () => {
    vi.useFakeTimers();
    const { onDateClick, cell } = mountDay();
    down(cell, 'touch');
    cancel('touch');
    vi.advanceTimersByTime(CLICK_WAIT_MS * 2);
    expect(onDateClick).not.toHaveBeenCalled();

    down(cell, 'touch');
    expect(onDateClick).not.toHaveBeenCalled();
    up('touch');
    click(cell);
    vi.advanceTimersByTime(0);
    expect(onDateClick).toHaveBeenCalledTimes(1);
  });
});
