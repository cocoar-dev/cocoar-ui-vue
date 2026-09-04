/**
 * `onDateDoubleClick` / `onTimeDoubleClick` — the empty-slot
 * companions to `onEventDoubleClick`.
 *
 * Pins:
 *   - month cell dblclick → date hook with the cell's date
 *   - time-grid column dblclick → time hook, snapped like onTimeClick
 *   - all-day cell dblclick → date hook
 *   - dblclick ON AN EVENT never reaches the date/time hooks (event
 *     elements stop propagation and route to onEventDoubleClick)
 *   - the kebab trigger swallows dblclick
 */

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, toValue } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarMonthView from '../CoarMonthView.vue';
import CoarDayView from '../CoarDayView.vue';
import type { CalendarEvent } from '../../core';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

const events = (): CalendarEvent[] => [
  {
    id: 'standup',
    start: zdt('2026-06-15T09:00:00', 'Europe/Vienna'),
    end: zdt('2026-06-15T09:30:00', 'Europe/Vienna'),
    meta: { title: 'Daily Standup' },
  },
  { id: 'offsite', start: pd('2026-06-15'), end: pd('2026-06-16'), meta: { title: 'Offsite' } },
];

const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref(events()));

describe('onDateDoubleClick — month grid', () => {
  it('fires with the cell date on an empty cell', async () => {
    const onDateDoubleClick = vi.fn();
    const b = newBuilder().view('month').onDateDoubleClick(onDateDoubleClick);
    const w = mount(CoarMonthView, { props: { builder: b } });
    const cell = w.find('[data-day-key="2026-06-17"]');
    expect(cell.exists()).toBe(true);
    await cell.trigger('dblclick');
    expect(onDateDoubleClick).toHaveBeenCalledTimes(1);
    const payload = onDateDoubleClick.mock.calls[0][0];
    expect(payload.date.toString()).toBe('2026-06-17');
    expect(payload.native).toBeInstanceOf(MouseEvent);
  });

  it('does not fire when the double-click lands on an event pill', async () => {
    const onDateDoubleClick = vi.fn();
    const onEventDoubleClick = vi.fn();
    const b = newBuilder()
      .view('month')
      .onDateDoubleClick(onDateDoubleClick)
      .onEventDoubleClick(onEventDoubleClick);
    const w = mount(CoarMonthView, { props: { builder: b } });
    const pill = w.find('.coar-month-pill[data-event-id="standup"]');
    expect(pill.exists()).toBe(true);
    await pill.trigger('dblclick');
    expect(onEventDoubleClick).toHaveBeenCalledTimes(1);
    expect(onDateDoubleClick).not.toHaveBeenCalled();
  });

  it('does not fire from the per-cell kebab trigger', async () => {
    const onDateDoubleClick = vi.fn();
    const b = newBuilder().view('month').onDateDoubleClick(onDateDoubleClick);
    const w = mount(CoarMonthView, { props: { builder: b } });
    await w.find('.coar-month-cell__menu-trigger').trigger('dblclick');
    expect(onDateDoubleClick).not.toHaveBeenCalled();
  });

  it('single clicks keep reaching onDateClick alongside', async () => {
    const onDateClick = vi.fn();
    const onDateDoubleClick = vi.fn();
    const b = newBuilder()
      .view('month')
      .onDateClick(onDateClick)
      .onDateDoubleClick(onDateDoubleClick);
    const w = mount(CoarMonthView, { props: { builder: b } });
    const cell = w.find('[data-day-key="2026-06-17"]');
    await cell.trigger('pointerdown');
    await cell.trigger('pointerdown');
    await cell.trigger('dblclick');
    expect(onDateClick).toHaveBeenCalledTimes(2);
    expect(onDateDoubleClick).toHaveBeenCalledTimes(1);
  });
});

describe('onTimeDoubleClick / onDateDoubleClick — time grid', () => {
  it('fires with the column date and the slot-snapped time', async () => {
    const onTimeDoubleClick = vi.fn();
    const b = newBuilder().view('day').onTimeDoubleClick(onTimeDoubleClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    const column = w.find('.coar-time-grid-column');
    expect(column.exists()).toBe(true);
    // happy-dom reports a zero rect, so clientY IS the y-in-column.
    // 3 slots × (pixelsPerHour × slotDuration / 60) px → 3 slots in.
    const slotHeight = (toValue(b.state.pixelsPerHour) * toValue(b.state.slotDuration)) / 60;
    await column.trigger('dblclick', { clientY: slotHeight * 3 + 1 });
    expect(onTimeDoubleClick).toHaveBeenCalledTimes(1);
    const payload = onTimeDoubleClick.mock.calls[0][0];
    expect(payload.date.toString()).toBe('2026-06-15');
    const startMinutes = toValue(b.state.timeRange).startMinutes;
    const expected = Temporal.PlainTime.from({ hour: 0, minute: 0 }).add({
      minutes: Math.floor(startMinutes / 60) * 60 + 3 * toValue(b.state.slotDuration),
    });
    expect(payload.time.toString()).toBe(expected.toString());
  });

  it('agrees with onTimeClick on the snapped slot', async () => {
    const onTimeClick = vi.fn();
    const onTimeDoubleClick = vi.fn();
    const b = newBuilder()
      .view('day')
      .onTimeClick(onTimeClick)
      .onTimeDoubleClick(onTimeDoubleClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    const column = w.find('.coar-time-grid-column');
    await column.trigger('pointerdown', { clientY: 95 });
    await column.trigger('dblclick', { clientY: 95 });
    expect(onTimeClick.mock.calls[0][0].time.toString()).toBe(
      onTimeDoubleClick.mock.calls[0][0].time.toString(),
    );
  });

  it('does not fire when the double-click lands on an event card', async () => {
    const onTimeDoubleClick = vi.fn();
    const onEventDoubleClick = vi.fn();
    const b = newBuilder()
      .view('day')
      .onTimeDoubleClick(onTimeDoubleClick)
      .onEventDoubleClick(onEventDoubleClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    const card = w.find('.coar-time-grid-event[data-event-id="standup"]');
    expect(card.exists()).toBe(true);
    await card.trigger('dblclick');
    expect(onEventDoubleClick).toHaveBeenCalledTimes(1);
    expect(onTimeDoubleClick).not.toHaveBeenCalled();
  });

  it('all-day band cell dblclick → onDateDoubleClick with the cell date', async () => {
    const onDateDoubleClick = vi.fn();
    const b = newBuilder().view('day').onDateDoubleClick(onDateDoubleClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    const cell = w.find('.coar-time-grid-all-day-band__cell');
    expect(cell.exists()).toBe(true);
    await cell.trigger('dblclick');
    expect(onDateDoubleClick).toHaveBeenCalledTimes(1);
    expect(onDateDoubleClick.mock.calls[0][0].date.toString()).toBe('2026-06-15');
  });
});

describe('single-click hooks ignore clicks that start on an event element', () => {
  // (onEventClick itself fires on release below the drag threshold —
  // that's the drag runtime's contract, pinned in its own tests.)
  it('month: pointerdown on a pill never reaches onDateClick', async () => {
    const onDateClick = vi.fn();
    const b = newBuilder().view('month').onDateClick(onDateClick);
    const w = mount(CoarMonthView, { props: { builder: b } });
    await w.find('.coar-month-pill[data-event-id="standup"]').trigger('pointerdown');
    expect(onDateClick).not.toHaveBeenCalled();
    // …while the empty cell itself still reports.
    await w.find('[data-day-key="2026-06-17"]').trigger('pointerdown');
    expect(onDateClick).toHaveBeenCalledTimes(1);
  });

  it('time grid: pointerdown on a card never reaches onTimeClick', async () => {
    const onTimeClick = vi.fn();
    const b = newBuilder().view('day').onTimeClick(onTimeClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    await w.find('.coar-time-grid-event[data-event-id="standup"]').trigger('pointerdown');
    expect(onTimeClick).not.toHaveBeenCalled();
  });

  it('all-day band: pointerdown on a bar never reaches onDateClick', async () => {
    const onDateClick = vi.fn();
    const b = newBuilder().view('day').onDateClick(onDateClick);
    const w = mount(CoarDayView, { props: { builder: b } });
    const bar = w.find('.coar-time-grid-all-day-bar[data-event-id="offsite"]');
    expect(bar.exists()).toBe(true);
    await bar.trigger('pointerdown');
    expect(onDateClick).not.toHaveBeenCalled();
  });
});
