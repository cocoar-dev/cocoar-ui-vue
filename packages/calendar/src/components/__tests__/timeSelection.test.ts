/**
 * Time-range selection, hover indicator, draft and background bands on
 * the time grids (`timeRangeSelect`, `hoverIndicator`, `selectionPolicy`,
 * `onTimeRangeSelect`, `draft`, `backgrounds`), both orientations.
 *
 * Geometry under happy-dom (zero rects unless stubbed):
 *   - vertical: the columns container is stubbed to 700 px wide (seven
 *     100 px columns, Monday first) at (0, 0); 1 px per minute, plus the
 *     15 min render buffer: y = minutes + 15.
 *   - horizontal: the rows body sits at (0, 0), the label column is
 *     132 px, 1 px per minute: x = 132 + minutes; rows are 44 px.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { h, nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarWeekView from '../CoarWeekView.vue';
import {
  gapOrDurationPolicy,
  type CalendarEvent,
  type CalendarTimeGridOrientation,
  type TimeSelectionContext,
} from '../../core';
import type { CalendarBand, CalendarDraft, TimeRangeSelectPayload } from '../../builders/types';
import { zdt } from '../../__test-utils__/event-fixtures';

const LABEL = 132;
const BUFFER = 15;
const hm = (h: number, m = 0) => h * 60 + m;

const timed = (id: string, start: string, end: string): CalendarEvent => ({
  id,
  start: zdt(start, 'UTC'),
  end: zdt(end, 'UTC'),
  meta: { title: id },
});

function newBuilder(events: CalendarEvent[], orientation: CalendarTimeGridOrientation) {
  return CalendarBuilder.create()
    .timezone('UTC')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-10-21'))
    .timeRange({ startMinutes: 0, endMinutes: 24 * 60 })
    .pixelsPerHour(60)
    .slotDuration(30)
    .swipeNavigation(true)
    .timeGridOrientation(orientation)
    .events(ref(events))
    .view('week');
}
type Builder = ReturnType<typeof newBuilder>;

const mounted: Array<{ unmount(): void }> = [];
afterEach(() => {
  vi.useRealTimers();
  while (mounted.length) mounted.pop()!.unmount();
});

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function mountWeek(b: Builder, slots: Record<string, unknown> = {}) {
  const w = mount(CoarWeekView, {
    props: { builder: b },
    slots: slots as never,
    attachTo: document.body,
  });
  mounted.push(w);
  const cols = w.find('.coar-time-grid__columns');
  if (cols.exists()) {
    (cols.element as HTMLElement).getBoundingClientRect = () => rect(0, 0, 700, 24 * 60 + 30);
  }
  return w;
}

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

/** Vertical: a point in the column of weekday `col` (0 = Monday) at a minute of the day. */
const vAt = (col: number, minute: number) => ({ x: col * 100 + 50, y: minute + BUFFER });
/** Horizontal: a point in row `row` (0 = Monday) at a minute of the day. */
const hAt = (row: number, minute: number) => ({ x: LABEL + minute, y: row * 44 + 10 });

const px = (style: string | undefined, prop: string) =>
  Number(new RegExp(`${prop}: (-?[\\d.]+)px`).exec(style ?? '')?.[1]);

const hhmm = (z: Temporal.ZonedDateTime) => z.toPlainTime().toString().slice(0, 5);
/** Pills (start, end) then the duration of an axis range mark. */
const markText = (marker: { findAll(s: string): Array<{ text(): string }> }) => [
  ...marker.findAll('.coar-time-axis-marker__pill').map((p) => p.text()),
  ...marker.findAll('.coar-time-axis-marker__duration').map((p) => p.text()),
];

describe('vertical: mouse selection', () => {
  function setup(events: CalendarEvent[] = []) {
    const calls: string[] = [];
    const onTimeClick = vi.fn(() => calls.push('time'));
    const onTimeRangeSelect = vi.fn((p: TimeRangeSelectPayload) => calls.push(`range:${p.source}`));
    const b = newBuilder(events, 'vertical')
      .timeRangeSelect(true)
      .onTimeClick(onTimeClick)
      .onTimeRangeSelect(onTimeRangeSelect);
    const w = mountWeek(b);
    const column = (i: number) => w.findAll('.coar-time-grid-column')[i].element;
    return { w, b, calls, onTimeClick, onTimeRangeSelect, column };
  }

  it('a drag on free space selects the snapped range on the day pressed', async () => {
    const { w, onTimeClick, onTimeRangeSelect, column } = setup();
    column(1).dispatchEvent(pointer('pointerdown', vAt(1, hm(9, 10))));
    // Drift into Thursday's column: the day stays Tuesday.
    window.dispatchEvent(pointer('pointermove', vAt(3, hm(11, 50))));
    await nextTick();
    const preview = w.findAll('.coar-time-grid-column')[1].find('[data-time-selection]');
    expect(preview.exists()).toBe(true);
    expect(px(preview.attributes('style'), 'top')).toBe(hm(9) + BUFFER);
    expect(px(preview.attributes('style'), 'height')).toBe(180);
    window.dispatchEvent(pointer('pointerup', vAt(3, hm(11, 50))));
    expect(onTimeRangeSelect).toHaveBeenCalledTimes(1);
    const p = onTimeRangeSelect.mock.calls[0][0];
    expect(p.source).toBe('drag');
    expect(p.date.toString()).toBe('2026-10-20');
    expect([hhmm(p.start), hhmm(p.end)]).toEqual(['09:00', '12:00']);
    expect(p.start.timeZoneId).toBe('UTC');
    // A drag is not a click.
    expect(onTimeClick).not.toHaveBeenCalled();
    await nextTick();
    expect(w.find('[data-time-selection]').exists()).toBe(false);
  });

  it('a click fires onTimeClick on release, then the policy range', () => {
    const { calls, onTimeClick, onTimeRangeSelect, column } = setup();
    column(2).dispatchEvent(pointer('pointerdown', vAt(2, hm(14, 10))));
    expect(onTimeClick).not.toHaveBeenCalled();
    window.dispatchEvent(pointer('pointerup', vAt(2, hm(14, 11))));
    expect(calls).toEqual(['time', 'range:click']);
    const p = onTimeRangeSelect.mock.calls[0][0];
    expect(p.date.toString()).toBe('2026-10-21');
    expect([hhmm(p.start), hhmm(p.end)]).toEqual(['14:00', '14:30']);
  });

  it('Escape cancels a drag without a call', async () => {
    const { w, onTimeRangeSelect, onTimeClick, column } = setup();
    column(1).dispatchEvent(pointer('pointerdown', vAt(1, hm(9))));
    window.dispatchEvent(pointer('pointermove', vAt(1, hm(11))));
    await nextTick();
    expect(w.find('[data-time-selection]').exists()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    window.dispatchEvent(pointer('pointerup', vAt(1, hm(11))));
    await nextTick();
    expect(onTimeRangeSelect).not.toHaveBeenCalled();
    expect(onTimeClick).not.toHaveBeenCalled();
    expect(w.find('[data-time-selection]').exists()).toBe(false);
  });

  it('a press on an event never starts a selection', () => {
    const onEventClick = vi.fn();
    const { w, b, onTimeRangeSelect } = setup([
      timed('a', '2026-10-20T09:00:00', '2026-10-20T10:00:00'),
    ]);
    b.onEventClick(onEventClick);
    const card = w.find('[data-event-id="a"]').element;
    card.dispatchEvent(pointer('pointerdown', vAt(1, hm(9, 20))));
    window.dispatchEvent(pointer('pointerup', vAt(1, hm(9, 20))));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onTimeRangeSelect).not.toHaveBeenCalled();
  });

  it('without timeRangeSelect: onTimeClick at press as before, no range', () => {
    const onTimeClick = vi.fn();
    const onTimeRangeSelect = vi.fn();
    const b = newBuilder([], 'vertical')
      .onTimeClick(onTimeClick)
      .onTimeRangeSelect(onTimeRangeSelect);
    const w = mountWeek(b);
    w.findAll('.coar-time-grid-column')[1].element.dispatchEvent(
      pointer('pointerdown', vAt(1, hm(9))),
    );
    expect(onTimeClick).toHaveBeenCalledTimes(1);
    window.dispatchEvent(pointer('pointerup', vAt(1, hm(9))));
    expect(onTimeRangeSelect).not.toHaveBeenCalled();
  });
});

describe('hover proposal and indicator', () => {
  it('draws the policy proposal under the mouse, nothing over an event', async () => {
    const b = newBuilder([timed('a', '2026-10-20T12:00:00', '2026-10-20T13:00:00')], 'vertical')
      .timeRangeSelect(true)
      .selectionPolicy(gapOrDurationPolicy({ minutes: 60 }));
    const w = mountWeek(b);
    const cols = w.find('.coar-time-grid__columns').element;
    cols.dispatchEvent(pointer('pointermove', vAt(1, hm(9, 10))));
    await nextTick();
    const block = w.findAll('.coar-time-grid-column')[1].find('[data-time-selection]');
    expect(block.classes()).toContain('coar-time-selection--hover');
    expect(px(block.attributes('style'), 'top')).toBe(hm(9) + BUFFER);
    expect(px(block.attributes('style'), 'height')).toBe(60);
    // Right before the event: up to its start.
    cols.dispatchEvent(pointer('pointermove', vAt(1, hm(11, 40))));
    await nextTick();
    const before = w.find('[data-time-selection]');
    expect(px(before.attributes('style'), 'top')).toBe(hm(11, 30) + BUFFER);
    expect(px(before.attributes('style'), 'height')).toBe(30);
    // Over the card: nothing.
    w.find('[data-event-id="a"]').element.dispatchEvent(pointer('pointermove', vAt(1, hm(12, 20))));
    await nextTick();
    expect(w.find('[data-time-selection]').exists()).toBe(false);
    cols.dispatchEvent(new PointerEvent('pointerleave'));
    await nextTick();
    expect(w.find('[data-time-selection]').exists()).toBe(false);
  });

  it('hoverIndicator: the snapped time on the axis and a line across the days, not for touch', async () => {
    const b = newBuilder([], 'vertical').hoverIndicator(true);
    const w = mountWeek(b);
    const cols = w.find('.coar-time-grid__columns').element;
    cols.dispatchEvent(pointer('pointermove', vAt(4, hm(9, 50))));
    await nextTick();
    expect(w.find('.coar-time-grid__hour-axis [data-time-axis-marker]').text()).toBe('10:00');
    expect(px(w.find('.coar-time-grid__hover-line').attributes('style'), 'top')).toBe(
      hm(10) + BUFFER,
    );
    // No proposal without timeRangeSelect.
    expect(w.find('[data-time-selection]').exists()).toBe(false);
    cols.dispatchEvent(new PointerEvent('pointerleave'));
    cols.dispatchEvent(pointer('pointermove', { ...vAt(4, hm(9)), pointerType: 'touch' }));
    await nextTick();
    expect(w.find('[data-time-axis-marker]').exists()).toBe(false);
    expect(w.find('.coar-time-grid__hover-line').exists()).toBe(false);
  });

  it('while dragging, the axis shows start, duration and end', async () => {
    const b = newBuilder([], 'vertical').timeRangeSelect(true).hoverIndicator(true);
    const w = mountWeek(b);
    w.findAll('.coar-time-grid-column')[0].element.dispatchEvent(
      pointer('pointerdown', vAt(0, hm(12))),
    );
    window.dispatchEvent(pointer('pointermove', vAt(0, hm(14, 15))));
    await nextTick();
    const marker = w.find('[data-time-axis-marker]');
    expect(marker.classes()).toContain('coar-time-axis-marker--selection');
    expect(markText(marker)).toEqual(['12:00', '14:30', '2:30 h']);
    window.dispatchEvent(pointer('pointerup', vAt(0, hm(14, 15))));
  });
});

describe('policy', () => {
  it('is asked per phase with the day, the slot, the bounds and the busy minutes', async () => {
    const seen: TimeSelectionContext[] = [];
    const b = newBuilder([timed('a', '2026-10-20T08:00:00', '2026-10-20T09:00:00')], 'vertical')
      .timeRange({ startMinutes: 6 * 60, endMinutes: 20 * 60 })
      .timeRangeSelect(true)
      .selectionPolicy((ctx) => {
        seen.push(ctx);
        return { start: 10 * 60, end: 11 * 60 };
      })
      .onTimeRangeSelect(() => {});
    const w = mountWeek(b);
    const cols = w.find('.coar-time-grid__columns').element;
    // Range starts at 06:00 → y = minutes − 360 + buffer.
    const at = (col: number, minute: number) => ({ x: col * 100 + 50, y: minute - 360 + BUFFER });
    cols.dispatchEvent(pointer('pointermove', at(1, hm(9, 30))));
    await nextTick();
    w.findAll('.coar-time-grid-column')[1].element.dispatchEvent(
      pointer('pointerdown', at(1, hm(9, 30))),
    );
    window.dispatchEvent(pointer('pointerup', at(1, hm(9, 30))));
    w.findAll('.coar-time-grid-column')[1].element.dispatchEvent(
      pointer('pointerdown', at(1, hm(13))),
    );
    window.dispatchEvent(pointer('pointermove', at(1, hm(15))));
    window.dispatchEvent(pointer('pointerup', at(1, hm(15))));
    const phases = new Set(seen.map((c) => c.phase));
    expect(phases).toEqual(new Set(['hover', 'click', 'drag']));
    const hover = seen.find((c) => c.phase === 'hover')!;
    expect(hover.date.toString()).toBe('2026-10-20');
    expect(hover.minute).toBeCloseTo(hm(9, 30));
    expect(hover.slotDuration).toBe(30);
    expect(hover.bounds).toEqual({ start: 360, end: 1200 });
    expect(hover.busy.map((x) => [x.event.id, x.start, x.end])).toEqual([['a', 480, 540]]);
    const drag = seen.filter((c) => c.phase === 'drag').pop()!;
    expect(drag.anchorMinute).toBeCloseTo(hm(13));
    expect(drag.minute).toBeCloseTo(hm(15));
  });
});

describe('touch', () => {
  function setup(orientation: CalendarTimeGridOrientation) {
    const calls: string[] = [];
    const onTimeClick = vi.fn(() => calls.push('time'));
    const onTimeRangeSelect = vi.fn((p: TimeRangeSelectPayload) => calls.push(`range:${p.source}`));
    const onRangeChange = vi.fn();
    const b = newBuilder([], orientation)
      .timeRangeSelect(true)
      .onTimeClick(onTimeClick)
      .onTimeRangeSelect(onTimeRangeSelect);
    const w = mountWeek(b);
    b.onRangeChange(onRangeChange);
    return { w, b, calls, onTimeClick, onTimeRangeSelect, onRangeChange };
  }

  it('vertical: a tap is onTimeClick then the range, after its click', () => {
    vi.useFakeTimers();
    const { w, calls, onTimeRangeSelect } = setup('vertical');
    const col = w.findAll('.coar-time-grid-column')[2].element;
    col.dispatchEvent(pointer('pointerdown', { ...vAt(2, hm(10, 5)), pointerType: 'touch' }));
    window.dispatchEvent(pointer('pointerup', { ...vAt(2, hm(10, 5)), pointerType: 'touch' }));
    expect(calls).toEqual([]);
    window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(2);
    expect(calls).toEqual(['time', 'range:click']);
    const p = onTimeRangeSelect.mock.calls[0][0];
    expect([hhmm(p.start), hhmm(p.end)]).toEqual(['10:00', '10:30']);
  });

  it('vertical: a long press starts a drag that neither pages nor clicks', async () => {
    vi.useFakeTimers();
    const { w, calls, onTimeRangeSelect, onRangeChange } = setup('vertical');
    const col = w.findAll('.coar-time-grid-column')[2].element;
    const touch = (x: { x: number; y: number }) => ({ ...x, pointerType: 'touch' });
    col.dispatchEvent(pointer('pointerdown', touch(vAt(2, hm(10)))));
    vi.advanceTimersByTime(520);
    await nextTick();
    // Right after the long press: the click proposal is drawn.
    expect(w.findAll('.coar-time-grid-column')[2].find('[data-time-selection]').exists()).toBe(
      true,
    );
    // Sideways and down: no page turn, the range follows.
    window.dispatchEvent(pointer('pointermove', touch({ x: 400, y: hm(12) + BUFFER })));
    window.dispatchEvent(pointer('pointerup', touch({ x: 400, y: hm(12) + BUFFER })));
    window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(400);
    expect(calls).toEqual(['range:drag']);
    const p = onTimeRangeSelect.mock.calls[0][0];
    expect(p.date.toString()).toBe('2026-10-21');
    expect([hhmm(p.start), hhmm(p.end)]).toEqual(['10:00', '12:00']);
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it('vertical: a long press without moving selects the click proposal', () => {
    vi.useFakeTimers();
    const { w, calls } = setup('vertical');
    const col = w.findAll('.coar-time-grid-column')[2].element;
    col.dispatchEvent(pointer('pointerdown', { ...vAt(2, hm(10)), pointerType: 'touch' }));
    vi.advanceTimersByTime(520);
    window.dispatchEvent(pointer('pointerup', { ...vAt(2, hm(10)), pointerType: 'touch' }));
    vi.advanceTimersByTime(400);
    expect(calls).toEqual(['range:click']);
  });

  it('horizontal: moving before the long press is a scroll — nothing', () => {
    vi.useFakeTimers();
    const { w, calls } = setup('horizontal');
    const track = w.findAll('.coar-time-rows__track')[1].element;
    track.dispatchEvent(pointer('pointerdown', { ...hAt(1, hm(9)), pointerType: 'touch' }));
    window.dispatchEvent(pointer('pointermove', { ...hAt(1, hm(9) + 40), pointerType: 'touch' }));
    vi.advanceTimersByTime(600);
    window.dispatchEvent(pointer('pointerup', { ...hAt(1, hm(9) + 40), pointerType: 'touch' }));
    vi.advanceTimersByTime(400);
    expect(calls).toEqual([]);
  });

  it('the long press blocks scrolling (touchmove) only while selecting', () => {
    vi.useFakeTimers();
    const { w } = setup('horizontal');
    const track = w.findAll('.coar-time-rows__track')[1].element;
    track.dispatchEvent(pointer('pointerdown', { ...hAt(1, hm(9)), pointerType: 'touch' }));
    const early = new Event('touchmove', { cancelable: true });
    window.dispatchEvent(early);
    expect(early.defaultPrevented).toBe(false);
    vi.advanceTimersByTime(520);
    const late = new Event('touchmove', { cancelable: true });
    window.dispatchEvent(late);
    expect(late.defaultPrevented).toBe(true);
    window.dispatchEvent(pointer('pointerup', { ...hAt(1, hm(9)), pointerType: 'touch' }));
    const after = new Event('touchmove', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});

describe('horizontal: mouse selection', () => {
  it('a drag in a row keeps its day while the pointer drifts to other rows', async () => {
    const onTimeRangeSelect = vi.fn();
    const b = newBuilder([], 'horizontal')
      .timeRangeSelect(true)
      .onTimeRangeSelect(onTimeRangeSelect);
    const w = mountWeek(b);
    const track = w.findAll('.coar-time-rows__track')[1].element;
    track.dispatchEvent(pointer('pointerdown', hAt(1, hm(12))));
    window.dispatchEvent(pointer('pointermove', hAt(4, hm(14, 10))));
    await nextTick();
    const block = w.findAll('.coar-time-rows__track')[1].find('[data-time-selection]');
    expect(px(block.attributes('style'), 'left')).toBe(hm(12));
    expect(px(block.attributes('style'), 'width')).toBe(120);
    window.dispatchEvent(pointer('pointerup', hAt(4, hm(14, 10))));
    const p = onTimeRangeSelect.mock.calls[0][0] as TimeRangeSelectPayload;
    expect(p.date.toString()).toBe('2026-10-20');
    expect([hhmm(p.start), hhmm(p.end)]).toEqual(['12:00', '14:00']);
  });

  it('no hover proposal over the label column', async () => {
    const b = newBuilder([], 'horizontal').timeRangeSelect(true).hoverIndicator(true);
    const w = mountWeek(b);
    const body = w.find('.coar-time-rows__body').element;
    body.dispatchEvent(pointer('pointermove', hAt(2, hm(9, 10))));
    await nextTick();
    expect(w.findAll('.coar-time-rows__track')[2].find('[data-time-selection]').exists()).toBe(
      true,
    );
    expect(w.find('.coar-time-rows__hours [data-time-axis-marker]').text()).toBe('09:00');
    expect(px(w.find('.coar-time-rows__hover-line').attributes('style'), 'left')).toBe(
      LABEL + hm(9),
    );
    w.findAll('.coar-time-rows__label')[2].element.dispatchEvent(
      pointer('pointermove', { x: 20, y: 2 * 44 + 10 }),
    );
    await nextTick();
    expect(w.find('[data-time-selection]').exists()).toBe(false);
    expect(w.find('[data-time-axis-marker]').exists()).toBe(false);
  });
});

describe('draft', () => {
  const at = (iso: string) => Temporal.ZonedDateTime.from(`${iso}[UTC]`);

  it.each(['vertical', 'horizontal'] as const)(
    '%s: follows the Ref, splits at midnight, hides on null',
    async (orientation) => {
      const draft = ref<CalendarDraft | null>({
        start: at('2026-10-20T12:00'),
        end: at('2026-10-20T14:15'),
      });
      const w = mountWeek(newBuilder([], orientation).draft(draft));
      const dayEls = () =>
        w.findAll(orientation === 'vertical' ? '.coar-time-grid-column' : '.coar-time-rows__track');
      const pos = orientation === 'vertical' ? 'top' : 'left';
      const size = orientation === 'vertical' ? 'height' : 'width';
      const offset = orientation === 'vertical' ? BUFFER : 0;
      let block = dayEls()[1].find('[data-time-draft]');
      expect(px(block.attributes('style'), pos)).toBe(hm(12) + offset);
      expect(px(block.attributes('style'), size)).toBe(135);
      // The axis shows the draft's times while nothing is hovered.
      expect(w.find('[data-time-axis-marker]').classes()).toContain('coar-time-axis-marker--draft');
      expect(markText(w.find('[data-time-axis-marker]'))).toEqual(['12:00', '14:15', '2:15 h']);

      draft.value = { start: at('2026-10-21T22:00'), end: at('2026-10-22T01:30') };
      await nextTick();
      expect(dayEls()[1].find('[data-time-draft]').exists()).toBe(false);
      block = dayEls()[2].find('[data-time-draft]');
      expect(px(block.attributes('style'), pos)).toBe(hm(22) + offset);
      expect(block.classes()).toContain('coar-time-draft--clipped-end');
      const next = dayEls()[3].find('[data-time-draft]');
      expect(px(next.attributes('style'), pos)).toBe(offset);
      expect(px(next.attributes('style'), size)).toBe(90);
      expect(next.classes()).toContain('coar-time-draft--clipped-start');

      draft.value = null;
      await nextTick();
      expect(w.find('[data-time-draft]').exists()).toBe(false);
      expect(w.find('[data-time-axis-marker]').exists()).toBe(false);
    },
  );

  it('the #draft slot draws it yourself', () => {
    const b = newBuilder([], 'vertical').draft({
      start: at('2026-10-20T12:00'),
      end: at('2026-10-20T13:00'),
    });
    const w = mountWeek(b, {
      draft: (p: { start: Temporal.ZonedDateTime; segment: { date: Temporal.PlainDate } }) =>
        h('span', { class: 'my-draft' }, `${p.segment.date} ${hhmm(p.start)}`),
    });
    const block = w.find('[data-time-draft]');
    expect(block.classes()).toContain('coar-time-draft--custom');
    expect(block.find('.my-draft').text()).toBe('2026-10-20 12:00');
  });
});

describe('background bands', () => {
  const T = (s: string) => Temporal.PlainTime.from(s);
  const bands = (date: Temporal.PlainDate): CalendarBand[] =>
    date.dayOfWeek === 2
      ? [
          { kind: 'core', start: T('08:00'), end: T('12:00') },
          { kind: 'outside', start: T('18:00'), end: T('00:00'), appearance: 'hatch' },
          {
            kind: 'hint',
            start: T('10:00'),
            end: T('11:00'),
            appearance: 'outline',
            layer: 'above',
          },
          { kind: 'max', at: T('17:30'), label: 'max. 10:30 h', color: '#f00' },
        ]
      : [];

  it.each(['vertical', 'horizontal'] as const)(
    '%s: per day, behind or above the events, lines with a label',
    (orientation) => {
      const w = mountWeek(newBuilder([], orientation).backgrounds(bands));
      const dayEls = w.findAll(
        orientation === 'vertical' ? '.coar-time-grid-column' : '.coar-time-rows__track',
      );
      expect(dayEls[0].findAll('.coar-calendar-band')).toHaveLength(0);
      const tue = dayEls[1];
      const pos = orientation === 'vertical' ? 'top' : 'left';
      const size = orientation === 'vertical' ? 'height' : 'width';
      const offset = orientation === 'vertical' ? BUFFER : 0;
      const core = tue.find('.coar-calendar-band--core');
      expect(core.classes()).toEqual(
        expect.arrayContaining(['coar-calendar-band--tint', 'coar-calendar-band--below']),
      );
      expect(px(core.attributes('style'), pos)).toBe(hm(8) + offset);
      expect(px(core.attributes('style'), size)).toBe(240);
      // `00:00` as end = midnight at the end of the day.
      const outside = tue.find('.coar-calendar-band--outside');
      expect(outside.classes()).toContain('coar-calendar-band--hatch');
      expect(px(outside.attributes('style'), size)).toBe(360);
      expect(tue.find('.coar-calendar-band--hint').classes()).toContain(
        'coar-calendar-band--above',
      );
      const line = tue.find('.coar-calendar-band--max');
      expect(line.classes()).toContain('coar-calendar-band--line');
      expect(px(line.attributes('style'), pos)).toBe(hm(17, 30) + offset);
      expect(line.attributes('style')).toContain('--coar-calendar-band-color: #f00');
      expect(line.text()).toBe('max. 10:30 h');
      expect(core.attributes('aria-hidden')).toBe('true');
    },
  );

  it('horizontal: a line near the end of the axis puts its label to its left', () => {
    const w = mountWeek(
      newBuilder([], 'horizontal').backgrounds(() => [
        { kind: 'early', at: T('08:00'), label: 'a' },
        { kind: 'late', at: T('23:30'), label: 'b' },
      ]),
    );
    const tue = w.findAll('.coar-time-rows__track')[1];
    expect(tue.find('.coar-calendar-band--early').classes()).not.toContain(
      'coar-calendar-band--label-before',
    );
    expect(tue.find('.coar-calendar-band--late').classes()).toContain(
      'coar-calendar-band--label-before',
    );
  });

  it('a click on a band reaches the day underneath', () => {
    const onTimeClick = vi.fn();
    const w = mountWeek(newBuilder([], 'vertical').backgrounds(bands).onTimeClick(onTimeClick));
    w.find('.coar-calendar-band--core').element.dispatchEvent(
      pointer('pointerdown', vAt(1, hm(9))),
    );
    expect(onTimeClick).toHaveBeenCalledTimes(1);
    expect(onTimeClick.mock.calls[0][0].date.toString()).toBe('2026-10-20');
  });
});
