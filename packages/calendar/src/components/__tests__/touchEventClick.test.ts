/**
 * `onEventClick` on touch screens — after the tap's click, not on
 * `pointerup` / `pointerdown`.
 *
 * Pins:
 *   - drag runtime (month pill, time-grid card): a press-and-release
 *     below the drag threshold is a click. Mouse: on release, as before.
 *     Touch / pen: in the task after the click that follows the lift, so
 *     that click cannot land on a sheet the handler just opened.
 *   - agenda / month-list rows (and agenda day headers for
 *     `onDateClick`) reacted on `pointerdown`, i.e. at the start of every
 *     scroll on a phone. Mouse: still on press. Touch: only for a tap.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarMonthView from '../CoarMonthView.vue';
import CoarDayView from '../CoarDayView.vue';
import CoarAgendaView from '../CoarAgendaView.vue';
import CoarMonthListView from '../CoarMonthListView.vue';
import type { CalendarEvent } from '../../core';
import { zdt } from '../../__test-utils__/event-fixtures';
import { CLICK_WAIT_MS } from '../../composables/surfaceTap';

const events = (): CalendarEvent[] => [
  {
    id: 'standup',
    start: zdt('2026-06-15T09:00:00', 'Europe/Vienna'),
    end: zdt('2026-06-15T09:30:00', 'Europe/Vienna'),
    meta: { title: 'Daily Standup' },
  },
];

const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref(events()));

interface PointerInit {
  pointerId?: number;
  pointerType?: string;
  clientX?: number;
  clientY?: number;
}

/** Build a pointer event that carries `pointerType` even where PointerEvent is missing. */
function pointer(type: string, init: PointerInit): Event {
  const base = { bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 0, ...init };
  const Ctor = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  const e = new Ctor(type, base as MouseEventInit);
  for (const key of ['pointerId', 'pointerType'] as const) {
    if ((e as unknown as Record<string, unknown>)[key] !== init[key]) {
      Object.defineProperty(e, key, { value: init[key], configurable: true });
    }
  }
  return e;
}

const down = (el: Element, pointerType: string) =>
  el.dispatchEvent(pointer('pointerdown', { pointerId: 4, pointerType, clientX: 20, clientY: 20 }));
const up = (pointerType: string) =>
  window.dispatchEvent(
    pointer('pointerup', { pointerId: 4, pointerType, clientX: 20, clientY: 20 }),
  );
const cancel = (pointerType: string) =>
  window.dispatchEvent(pointer('pointercancel', { pointerId: 4, pointerType }));
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

const mounted: Array<{ unmount(): void }> = [];
afterEach(() => {
  vi.useRealTimers();
  while (mounted.length) mounted.pop()!.unmount();
});

type Surface = 'month' | 'day' | 'agenda' | 'monthList';

function mountWith(surface: Surface) {
  const onEventClick = vi.fn();
  const onDateClick = vi.fn();
  const b = newBuilder().onEventClick(onEventClick).onDateClick(onDateClick);
  // Attached, so the click on an element bubbles to `window` as in a browser.
  const w =
    surface === 'month'
      ? mount(CoarMonthView, { props: { builder: b.view('month') }, attachTo: document.body })
      : surface === 'day'
        ? mount(CoarDayView, { props: { builder: b.view('day') }, attachTo: document.body })
        : surface === 'agenda'
          ? mount(CoarAgendaView, { props: { builder: b.view('agenda') }, attachTo: document.body })
          : mount(CoarMonthListView, {
              props: { builder: b.view('monthList') },
              attachTo: document.body,
            });
  mounted.push(w);
  const selector = {
    month: '.coar-month-pill[data-event-id="standup"]',
    day: '.coar-time-grid-event[data-event-id="standup"]',
    agenda: '.coar-agenda-event',
    monthList: '.coar-agenda-event',
  }[surface];
  const el = w.find(selector);
  expect(el.exists()).toBe(true);
  return { onEventClick, onDateClick, w, el: el.element };
}

describe.each(['month', 'day'] as const)('drag runtime (%s) — onEventClick', (surface) => {
  it('mouse: fires on release', () => {
    const { onEventClick, el } = mountWith(surface);
    down(el, 'mouse');
    expect(onEventClick).not.toHaveBeenCalled();
    up('mouse');
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick.mock.calls[0][0].event.id).toBe('standup');
  });

  it('touch: not on release — in the task after the following click', () => {
    vi.useFakeTimers();
    const { onEventClick, el } = mountWith(surface);
    down(el, 'touch');
    up('touch');
    expect(onEventClick).not.toHaveBeenCalled();
    click(el);
    expect(onEventClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick.mock.calls[0][0].native.pointerType).toBe('touch');
  });

  it('touch without a following click: fires after the wait', () => {
    vi.useFakeTimers();
    const { onEventClick, el } = mountWith(surface);
    down(el, 'touch');
    up('touch');
    vi.advanceTimersByTime(CLICK_WAIT_MS + 2);
    expect(onEventClick).toHaveBeenCalledTimes(1);
  });

  it('touch taken for scrolling (pointercancel): never fires', () => {
    vi.useFakeTimers();
    const { onEventClick, el } = mountWith(surface);
    down(el, 'touch');
    cancel('touch');
    vi.advanceTimersByTime(CLICK_WAIT_MS * 2);
    expect(onEventClick).not.toHaveBeenCalled();
  });
});

describe.each(['agenda', 'monthList'] as const)('%s rows — onEventClick', (surface) => {
  it('mouse: fires on press', () => {
    const { onEventClick, el } = mountWith(surface);
    down(el, 'mouse');
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick.mock.calls[0][0].event.id).toBe('standup');
  });

  it('touch: nothing on press; only a tap fires, after its click', () => {
    vi.useFakeTimers();
    const { onEventClick, el } = mountWith(surface);
    down(el, 'touch');
    expect(onEventClick).not.toHaveBeenCalled();
    cancel('touch'); // the list took the touch for scrolling
    vi.advanceTimersByTime(CLICK_WAIT_MS * 2);
    expect(onEventClick).not.toHaveBeenCalled();

    down(el, 'touch');
    up('touch');
    click(el);
    vi.advanceTimersByTime(0);
    expect(onEventClick).toHaveBeenCalledTimes(1);
  });
});

describe('agenda day header — onDateClick', () => {
  it('mouse on press, touch only after a tap', () => {
    vi.useFakeTimers();
    const { onDateClick, w } = mountWith('agenda');
    const header = w.find('.coar-agenda-day-header').element;
    down(header, 'mouse');
    expect(onDateClick).toHaveBeenCalledTimes(1);

    down(header, 'touch');
    expect(onDateClick).toHaveBeenCalledTimes(1);
    up('touch');
    click(header);
    vi.advanceTimersByTime(0);
    expect(onDateClick).toHaveBeenCalledTimes(2);
  });
});
