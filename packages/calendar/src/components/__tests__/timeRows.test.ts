/**
 * The horizontal time grid (`builder.timeGridOrientation('horizontal')`)
 * through `<CoarWeekView>` / `<CoarDayView>`.
 *
 * Pins:
 *   - the orientation switches the surface (rows vs. columns), at runtime too
 *   - one row per day, cards placed by minutes along x (1 px/min here),
 *     overlaps as lanes stacked downwards, rows growing with their lanes
 *   - an event over midnight shows in both rows
 *   - all-day events as chips in the label cell of every covered day
 *   - hooks: onTimeClick (x → snapped time), onDateClick (label),
 *     onEventClick (card / chip), mouse at once, touch after the tap
 *   - drag: move to another row (other day), resize the end, keyboard
 *     (→ = later, ↓ = next day, Enter commits)
 *   - eventRenderer ctx carries `orientation: 'horizontal'`
 *
 * happy-dom reports zero rects: the body sits at (0, 0), the label column
 * is 132 px, so x = 132 + minutes and y = the row offsets the layout computes.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { h, nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarWeekView from '../CoarWeekView.vue';
import CoarDayView from '../CoarDayView.vue';
import type { CalendarEvent, CalendarTimeGridOrientation } from '../../core';
import type { EventRendererCtx } from '../../builders/types';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

const LABEL = 132;

const timed = (id: string, start: string, end?: string, title = id): CalendarEvent => ({
  id,
  start: zdt(start, 'UTC'),
  end: end ? zdt(end, 'UTC') : undefined,
  meta: { title },
});

function newBuilder(
  events: CalendarEvent[],
  orientation: CalendarTimeGridOrientation = 'horizontal',
) {
  return CalendarBuilder.create()
    .timezone('UTC')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-10-21'))
    .timeRange({ startMinutes: 0, endMinutes: 24 * 60 })
    .pixelsPerHour(60)
    .slotDuration(30)
    .timeGridOrientation(orientation)
    .events(ref(events));
}

const mounted: Array<{ unmount(): void }> = [];
afterEach(() => {
  vi.useRealTimers();
  while (mounted.length) mounted.pop()!.unmount();
});
function mountWeek(b: ReturnType<typeof newBuilder>) {
  const w = mount(CoarWeekView, { props: { builder: b.view('week') }, attachTo: document.body });
  mounted.push(w);
  return w;
}

const px = (style: string | undefined, prop: string) =>
  Number(new RegExp(`${prop}: (-?[\\d.]+)px`).exec(style ?? '')?.[1]);

/** Pointer event that carries pointerType / pointerId under happy-dom. */
function pointer(type: string, init: { x: number; y: number; pointerType?: string; id?: number }) {
  const e = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.x,
    clientY: init.y,
    button: 0,
  });
  Object.defineProperty(e, 'pointerId', { value: init.id ?? 1 });
  Object.defineProperty(e, 'pointerType', { value: init.pointerType ?? 'mouse' });
  return e;
}
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

describe('orientation', () => {
  it('horizontal renders rows, vertical the classic columns — switchable at runtime', async () => {
    const o = ref<CalendarTimeGridOrientation>('horizontal');
    const b = newBuilder([]).timeGridOrientation(o);
    const w = mountWeek(b);
    expect(w.find('.coar-time-rows').exists()).toBe(true);
    expect(w.find('.coar-time-grid').exists()).toBe(false);
    b.api.setTimeGridOrientation('vertical');
    await nextTick();
    expect(o.value).toBe('vertical');
    expect(w.find('.coar-time-rows').exists()).toBe(false);
    expect(w.find('.coar-time-grid').exists()).toBe(true);
  });
});

describe('rows and cards', () => {
  it('one row per day of the week, in order', () => {
    const w = mountWeek(newBuilder([]));
    expect(w.findAll('.coar-time-rows__row').map((r) => r.attributes('data-day-key'))).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });

  it('places a card by its minutes along x and spans its duration', () => {
    const w = mountWeek(newBuilder([timed('a', '2026-10-20T09:00:00', '2026-10-20T10:30:00')]));
    const card = w.find('[data-day-key="2026-10-20"] .coar-time-rows-event');
    const style = card.attributes('style');
    expect(px(style, 'left')).toBe(9 * 60 + 1);
    expect(px(style, 'width')).toBe(90 - 2);
  });

  it('stacks overlaps as lanes and grows only that row', () => {
    const w = mountWeek(
      newBuilder([
        timed('a', '2026-10-20T09:00:00', '2026-10-20T11:00:00'),
        timed('b', '2026-10-20T10:00:00', '2026-10-20T12:00:00'),
      ]),
    );
    const tops = w
      .findAll('[data-day-key="2026-10-20"] .coar-time-rows-event')
      .map((c) => px(c.attributes('style'), 'top'))
      .sort((x, y) => x - y);
    expect(tops).toEqual([4, 32]);
    const heights = w
      .findAll('.coar-time-rows__row')
      .map((r) => px(r.attributes('style'), 'height'));
    expect(heights[1]).toBeGreaterThan(heights[0]);
    expect(heights[0]).toBe(heights[2]);
  });

  it('an event over midnight shows in both rows', () => {
    const w = mountWeek(newBuilder([timed('n', '2026-10-20T23:00:00', '2026-10-21T01:00:00')]));
    expect(w.find('[data-day-key="2026-10-20"] .coar-time-rows-event').exists()).toBe(true);
    expect(w.find('[data-day-key="2026-10-21"] .coar-time-rows-event').exists()).toBe(true);
  });

  it('all-day events become chips in the label cell of every covered day', () => {
    const offsite: CalendarEvent = {
      id: 'off',
      start: pd('2026-10-20'),
      end: pd('2026-10-22'),
      meta: { title: 'Offsite' },
    };
    const w = mountWeek(newBuilder([offsite]));
    const days = w
      .findAll('.coar-time-rows__chip')
      .map((c) => c.element.closest('[data-day-key]')!.getAttribute('data-day-key'));
    expect(days).toEqual(['2026-10-20', '2026-10-21']);
    expect(w.find('.coar-time-rows__chip').text()).toBe('Offsite');
  });

  it('a day view renders a single row', () => {
    const b = newBuilder([]).view('day');
    const w = mount(CoarDayView, { props: { builder: b } });
    mounted.push(w);
    expect(w.findAll('.coar-time-rows__row')).toHaveLength(1);
  });
});

describe('click hooks', () => {
  it('onTimeClick: x in a track → the slot time, mouse at once', () => {
    const onTimeClick = vi.fn();
    const w = mountWeek(newBuilder([]).onTimeClick(onTimeClick));
    const track = w.find('[data-day-key="2026-10-22"] .coar-time-rows__track').element;
    track.dispatchEvent(pointer('pointerdown', { x: 14 * 60 + 40, y: 10 }));
    expect(onTimeClick).toHaveBeenCalledTimes(1);
    const { date, time } = onTimeClick.mock.calls[0][0];
    expect(date.toString()).toBe('2026-10-22');
    expect(time.toString()).toBe('14:30:00');
  });

  it('onTimeClick on touch: only after the tap and its click', () => {
    vi.useFakeTimers();
    const onTimeClick = vi.fn();
    const w = mountWeek(newBuilder([]).onTimeClick(onTimeClick));
    const track = w.find('[data-day-key="2026-10-22"] .coar-time-rows__track').element;
    track.dispatchEvent(pointer('pointerdown', { x: 600, y: 10, pointerType: 'touch' }));
    expect(onTimeClick).not.toHaveBeenCalled();
    window.dispatchEvent(pointer('pointerup', { x: 600, y: 10, pointerType: 'touch' }));
    track.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(0);
    expect(onTimeClick).toHaveBeenCalledTimes(1);
  });

  it('onDateClick from the label cell; onEventClick from a chip, not onDateClick', () => {
    const onDateClick = vi.fn();
    const onEventClick = vi.fn();
    const offsite: CalendarEvent = {
      id: 'off',
      start: pd('2026-10-20'),
      meta: { title: 'Offsite' },
    };
    const w = mountWeek(newBuilder([offsite]).onDateClick(onDateClick).onEventClick(onEventClick));
    const label = w.find('[data-day-key="2026-10-23"] .coar-time-rows__label').element;
    label.dispatchEvent(pointer('pointerdown', { x: 20, y: 10 }));
    expect(onDateClick).toHaveBeenCalledTimes(1);
    expect(onDateClick.mock.calls[0][0].date.toString()).toBe('2026-10-23');

    w.find('.coar-time-rows__chip').element.dispatchEvent(pointer('pointerdown', { x: 20, y: 30 }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick.mock.calls[0][0].event.id).toBe('off');
    expect(onDateClick).toHaveBeenCalledTimes(1);
  });

  it('a click on a card is onEventClick, not onTimeClick', () => {
    const onTimeClick = vi.fn();
    const onEventClick = vi.fn();
    const w = mountWeek(
      newBuilder([timed('a', '2026-10-20T09:00:00', '2026-10-20T10:00:00')])
        .onTimeClick(onTimeClick)
        .onEventClick(onEventClick),
    );
    const card = w.find('.coar-time-rows-event').element;
    card.dispatchEvent(pointer('pointerdown', { x: LABEL + 9 * 60 + 5, y: 50 }));
    window.dispatchEvent(pointer('pointerup', { x: LABEL + 9 * 60 + 5, y: 50 }));
    expect(onTimeClick).not.toHaveBeenCalled();
    expect(onEventClick).toHaveBeenCalledTimes(1);
  });
});

describe('drag and drop', () => {
  /** Rows without chips or overlaps are 44 px: Mon 0, Tue 44, Wed 88, … */
  const rowY = (index: number) => index * 44 + 10;

  function grab(card: Element, startMinutes: number, rowIndex: number) {
    (card as HTMLElement).getBoundingClientRect = () =>
      ({
        left: LABEL + startMinutes,
        top: rowIndex * 44 + 4,
        width: 60,
        height: 26,
        right: LABEL + startMinutes + 60,
        bottom: rowIndex * 44 + 30,
        x: LABEL + startMinutes,
        y: rowIndex * 44 + 4,
        toJSON: () => ({}),
      }) as DOMRect;
  }

  it('moves an event to another row (another day), keeping the grab point', async () => {
    const onEventDrop = vi.fn();
    const w = mountWeek(
      newBuilder([timed('a', '2026-10-20T09:00:00', '2026-10-20T10:00:00')]).onEventDrop(
        onEventDrop,
      ),
    );
    const card = w.find('.coar-time-rows-event').element;
    grab(card, 9 * 60, 1);
    // Grab 10 min into the card on Tuesday …
    card.dispatchEvent(pointer('pointerdown', { x: LABEL + 9 * 60 + 10, y: rowY(1) }));
    // … drop it on Thursday, 2 h later.
    window.dispatchEvent(pointer('pointermove', { x: LABEL + 11 * 60 + 10, y: rowY(3) }));
    await nextFrame();
    window.dispatchEvent(pointer('pointerup', { x: LABEL + 11 * 60 + 10, y: rowY(3) }));
    expect(onEventDrop).toHaveBeenCalledTimes(1);
    const payload = onEventDrop.mock.calls[0][0];
    expect(payload.target.date).toBe('2026-10-22');
    expect(payload.target.minutes).toBe(11 * 60);
    expect(payload.next.start.toString()).toContain('2026-10-22T11:00:00');
    expect(payload.next.end.toString()).toContain('2026-10-22T12:00:00');
  });

  it('resizes the end from the right handle, snapped to the slot', async () => {
    const onEventDrop = vi.fn();
    const w = mountWeek(
      newBuilder([timed('a', '2026-10-20T09:00:00', '2026-10-20T10:00:00')]).onEventDrop(
        onEventDrop,
      ),
    );
    const handle = w.find('.coar-time-rows-event__resize--end').element;
    handle.dispatchEvent(pointer('pointerdown', { x: LABEL + 10 * 60 - 2, y: rowY(1) }));
    window.dispatchEvent(pointer('pointermove', { x: LABEL + 11 * 60 + 20, y: rowY(1) }));
    await nextFrame();
    window.dispatchEvent(pointer('pointerup', { x: LABEL + 11 * 60 + 20, y: rowY(1) }));
    expect(onEventDrop).toHaveBeenCalledTimes(1);
    const payload = onEventDrop.mock.calls[0][0];
    expect(payload.next.start.toString()).toContain('2026-10-20T09:00:00');
    expect(payload.next.end.toString()).toContain('2026-10-20T11:30:00');
  });

  it('canDrop veto: the invalid ghost shows in the target row, no drop fires', async () => {
    const onEventDrop = vi.fn();
    const w = mountWeek(
      newBuilder([timed('a', '2026-10-20T09:00:00', '2026-10-20T10:00:00')])
        .canDrop((_e, target) => target.date !== '2026-10-24')
        .onEventDrop(onEventDrop),
    );
    const card = w.find('.coar-time-rows-event').element;
    grab(card, 9 * 60, 1);
    card.dispatchEvent(pointer('pointerdown', { x: LABEL + 9 * 60 + 10, y: rowY(1) }));
    window.dispatchEvent(pointer('pointermove', { x: LABEL + 9 * 60 + 10, y: rowY(5) }));
    await nextFrame();
    await nextTick();
    expect(w.find('[data-day-key="2026-10-24"] .coar-time-rows-event--invalid').exists()).toBe(
      true,
    );
    window.dispatchEvent(pointer('pointerup', { x: LABEL + 9 * 60 + 10, y: rowY(5) }));
    expect(onEventDrop).not.toHaveBeenCalled();
  });

  it.each([
    ['reject', 0],
    ['compatible', 1],
  ] as const)(
    "dstPolicy('%s'): a drop into the spring-forward gap fires %i time(s)",
    async (policy, drops) => {
      const onEventDrop = vi.fn();
      const friday: CalendarEvent = {
        id: 'f',
        start: zdt('2026-03-27T09:00:00', 'Europe/Vienna'),
        end: zdt('2026-03-27T10:00:00', 'Europe/Vienna'),
        meta: { title: 'Friday' },
      };
      const b = newBuilder([friday])
        .timezone('Europe/Vienna')
        .date(Temporal.PlainDate.from('2026-03-25'))
        .dstPolicy(policy)
        .onEventDrop(onEventDrop);
      const w = mountWeek(b);
      const card = w.find('.coar-time-rows-event').element;
      grab(card, 9 * 60, 4);
      card.dispatchEvent(pointer('pointerdown', { x: LABEL + 9 * 60, y: rowY(4) }));
      // Sunday 29 March, 02:30 — does not exist in Vienna.
      window.dispatchEvent(pointer('pointermove', { x: LABEL + 2 * 60 + 30, y: rowY(6) }));
      await nextFrame();
      window.dispatchEvent(pointer('pointerup', { x: LABEL + 2 * 60 + 30, y: rowY(6) }));
      expect(onEventDrop).toHaveBeenCalledTimes(drops);
      if (drops) expect(onEventDrop.mock.calls[0][0].target.date).toBe('2026-03-29');
    },
  );

  it('keyboard: → moves later by a slot, ↓ to the next day, Enter commits', async () => {
    const onEventDrop = vi.fn();
    const w = mountWeek(
      newBuilder([timed('a', '2026-10-20T09:00:00', '2026-10-20T10:00:00')]).onEventDrop(
        onEventDrop,
      ),
    );
    const card = w.find('.coar-time-rows-event');
    await card.trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    const ghost = () => w.find('.coar-time-rows-event--ghost');
    expect(ghost().exists()).toBe(true);
    await ghost().trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
    await ghost().trigger('keydown', { key: 'Enter' });
    expect(onEventDrop).toHaveBeenCalledTimes(1);
    const payload = onEventDrop.mock.calls[0][0];
    expect(payload.next.start.toString()).toContain('2026-10-21T09:30:00');
    expect(payload.next.end.toString()).toContain('2026-10-21T10:30:00');
  });
});

describe('eventRenderer', () => {
  it("passes orientation: 'horizontal' in the ctx", () => {
    const seen: EventRendererCtx[] = [];
    // Function form: called with the ctx once per event.
    const renderer = (ctx: EventRendererCtx) => {
      seen.push(ctx);
      return h('span', 'x');
    };
    mountWeek(
      newBuilder([timed('a', '2026-10-20T09:00:00', '2026-10-20T10:00:00')]).eventRenderer(
        renderer,
      ),
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toMatchObject({ view: 'week', orientation: 'horizontal' });
  });
});
