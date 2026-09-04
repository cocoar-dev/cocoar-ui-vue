/**
 * Behaviour ported from `Cocoar.Calendar.iOS` 5.x so web and iOS
 * agree:
 *
 *   - agenda `empty` slot: only when the list draws nothing, never
 *     next to empty-day headers, never while a load is in flight,
 *     no default rendering
 *   - `eventTextContrast('apca')` flips the text colour on saturated
 *     mid-tones; `meta.textColor` overrides either policy
 *   - all-day band lane cap: "+N" markers beyond `allDayMaxVisibleLanes`,
 *     expand / collapse, and `allDayBandMode` height rules
 */

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarAgendaView from '../CoarAgendaView.vue';
import CoarCalendar from '../CoarCalendar.vue';
import CoarMonthView from '../CoarMonthView.vue';
import CoarDayView from '../CoarDayView.vue';
import type { CalendarEvent } from '../../core';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

const newBuilder = (events: CalendarEvent[] = []) =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref(events));

const EMPTY_SLOT = { empty: '<p class="host-empty">Keine Termine</p>' };

describe('agenda empty state', () => {
  it('renders the slot when there is nothing to draw', () => {
    const w = mount(CoarAgendaView, {
      props: { builder: newBuilder().view('agenda') },
      slots: EMPTY_SLOT,
    });
    expect(w.find('.coar-agenda-view__empty .host-empty').exists()).toBe(true);
    // The virtualized surface stays mounted underneath.
    expect(w.find('.coar-agenda-view__surface').exists()).toBe(true);
  });

  it('renders nothing without the slot (no default)', () => {
    const w = mount(CoarAgendaView, { props: { builder: newBuilder().view('agenda') } });
    expect(w.find('.coar-agenda-view__empty').exists()).toBe(false);
  });

  it('stays hidden next to empty-day headers (showEmptyDays)', () => {
    const w = mount(CoarAgendaView, {
      props: { builder: newBuilder().view('agenda').showEmptyDays(true) },
      slots: EMPTY_SLOT,
    });
    expect(w.find('.coar-agenda-view__empty').exists()).toBe(false);
  });

  it('stays hidden while there are events', () => {
    const events: CalendarEvent[] = [
      { id: 'a', start: pd('2026-06-16'), end: pd('2026-06-17'), meta: { title: 'A' } },
    ];
    const w = mount(CoarAgendaView, {
      props: { builder: newBuilder(events).view('agenda') },
      slots: EMPTY_SLOT,
    });
    expect(w.find('.coar-agenda-view__empty').exists()).toBe(false);
  });

  it('stays hidden while a load is in flight, appears once it resolves empty', async () => {
    let resolve!: (events: CalendarEvent[]) => void;
    const pending = new Promise<CalendarEvent[]>((r) => (resolve = r));
    const b = CalendarBuilder.create()
      .timezone('Europe/Vienna')
      .date(Temporal.PlainDate.from('2026-06-15'))
      .view('agenda')
      .eventsLoader(() => pending);
    const w = mount(CoarAgendaView, { props: { builder: b }, slots: EMPTY_SLOT });
    // Debounced loader → let it start.
    await new Promise((r) => setTimeout(r, 80));
    expect(b.api.loading.value).toBe(true);
    expect(w.find('.coar-agenda-view__empty').exists()).toBe(false);
    resolve([]);
    await vi.waitFor(() => expect(b.api.loading.value).toBe(false));
    await nextTick();
    expect(w.find('.coar-agenda-view__empty').exists()).toBe(true);
  });

  it('is reachable from the shell as `agendaEmpty`', () => {
    const w = mount(CoarCalendar, {
      props: { builder: newBuilder().view('agenda') },
      slots: { agendaEmpty: '<p class="host-empty">Nichts</p>' },
    });
    expect(w.find('.coar-agenda-view__empty .host-empty').text()).toBe('Nichts');
  });
});

describe('eventTextContrast policy + meta.textColor', () => {
  const red = (meta: Record<string, unknown> = {}): CalendarEvent[] => [
    {
      id: 'red',
      start: zdt('2026-06-15T09:00:00', 'Europe/Vienna'),
      end: zdt('2026-06-15T10:00:00', 'Europe/Vienna'),
      meta: { title: 'Red', color: '#e03131', ...meta },
    },
    {
      id: 'redbar',
      start: pd('2026-06-15'),
      end: pd('2026-06-17'),
      meta: { title: 'Bar', color: '#e03131', ...meta },
    },
  ];
  const ink = (w: ReturnType<typeof mount>, selector: string) =>
    (w.find(selector).attributes('style') ?? '').match(/--event-ink:\s*([^;]+)/)?.[1].trim();

  it('WCAG (default) paints black on #e03131 in the month grid', () => {
    const w = mount(CoarMonthView, { props: { builder: newBuilder(red()).view('month') } });
    expect(ink(w, '.coar-month-pill[data-event-id="red"]')).toBe('#000000');
    expect(ink(w, '.coar-month-bar[data-event-id="redbar"]')).toBe('#000000');
  });

  it('APCA paints white on #e03131 — pills, bars, cards, all-day bars', () => {
    const b = newBuilder(red()).eventTextContrast('apca');
    const month = mount(CoarMonthView, { props: { builder: b.view('month') } });
    expect(ink(month, '.coar-month-pill[data-event-id="red"]')).toBe('#ffffff');
    expect(ink(month, '.coar-month-bar[data-event-id="redbar"]')).toBe('#ffffff');
    const day = mount(CoarDayView, { props: { builder: b.view('day') } });
    expect(ink(day, '.coar-time-grid-event[data-event-id="red"]')).toBe('#ffffff');
    expect(ink(day, '.coar-time-grid-all-day-bar[data-event-id="redbar"]')).toBe('#ffffff');
  });

  it('is reactive (C7): switching the policy repaints', async () => {
    const policy = ref<'wcag' | 'apca'>('wcag');
    const w = mount(CoarMonthView, {
      props: { builder: newBuilder(red()).view('month').eventTextContrast(policy) },
    });
    expect(ink(w, '.coar-month-pill[data-event-id="red"]')).toBe('#000000');
    policy.value = 'apca';
    await nextTick();
    expect(ink(w, '.coar-month-pill[data-event-id="red"]')).toBe('#ffffff');
  });

  it('meta.textColor wins over either policy', () => {
    const b = newBuilder(red({ textColor: '#fde68a' })).eventTextContrast('apca');
    const w = mount(CoarMonthView, { props: { builder: b.view('month') } });
    expect(ink(w, '.coar-month-pill[data-event-id="red"]')).toBe('#fde68a');
  });
});

describe('all-day band lane cap', () => {
  const allDay = (n: number): CalendarEvent[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `ad${i}`,
      start: pd('2026-06-15'),
      end: pd('2026-06-16'),
      meta: { title: `All-day ${i}` },
    }));
  const bandHeight = (w: ReturnType<typeof mount>) =>
    Number.parseInt(
      (w.find('.coar-time-grid-all-day-band').attributes('style') ?? '').match(
        /min-height:\s*(\d+)px/,
      )?.[1] ?? '-1',
      10,
    );

  it('shows every lane while the layout fits the cap', () => {
    const w = mount(CoarDayView, { props: { builder: newBuilder(allDay(3)).view('day') } });
    expect(w.findAll('.coar-time-grid-all-day-bar')).toHaveLength(3);
    expect(w.findAll('.coar-time-grid-all-day-overflow')).toHaveLength(0);
  });

  it('folds lanes beyond the cap into a "+N" marker, expands on click, collapses again', async () => {
    const w = mount(CoarDayView, { props: { builder: newBuilder(allDay(5)).view('day') } });
    // cap 3 → lanes 0,1 as bars, lane 2 = marker "+3"
    expect(w.findAll('.coar-time-grid-all-day-bar')).toHaveLength(2);
    const marker = w.find('.coar-time-grid-all-day-overflow');
    expect(marker.text()).toBe('+3');
    expect(marker.attributes('aria-label')).toContain('3');
    expect(w.find('.coar-time-grid-all-day-band__collapse').exists()).toBe(false);
    const cappedHeight = bandHeight(w);

    await marker.trigger('click');
    expect(w.findAll('.coar-time-grid-all-day-bar')).toHaveLength(5);
    expect(w.findAll('.coar-time-grid-all-day-overflow')).toHaveLength(0);
    expect(bandHeight(w)).toBeGreaterThan(cappedHeight);

    await w.find('.coar-time-grid-all-day-band__collapse').trigger('click');
    expect(w.findAll('.coar-time-grid-all-day-bar')).toHaveLength(2);
    expect(bandHeight(w)).toBe(cappedHeight);
  });

  it('a marker click never bubbles into the empty-cell hooks', async () => {
    const onDateClick = vi.fn();
    const onDateDoubleClick = vi.fn();
    const w = mount(CoarDayView, {
      props: {
        builder: newBuilder(allDay(5))
          .view('day')
          .onDateClick(onDateClick)
          .onDateDoubleClick(onDateDoubleClick),
      },
    });
    const marker = w.find('.coar-time-grid-all-day-overflow');
    await marker.trigger('pointerdown');
    await marker.trigger('dblclick');
    expect(onDateClick).not.toHaveBeenCalled();
    expect(onDateDoubleClick).not.toHaveBeenCalled();
  });

  it('allDayMaxVisibleLanes(null) shows everything', () => {
    const w = mount(CoarDayView, {
      props: { builder: newBuilder(allDay(6)).view('day').allDayMaxVisibleLanes(null) },
    });
    expect(w.findAll('.coar-time-grid-all-day-bar')).toHaveLength(6);
  });

  it('is reactive (C7): raising the cap unfolds the band', async () => {
    const cap = ref<number | null>(3);
    const w = mount(CoarDayView, {
      props: { builder: newBuilder(allDay(5)).view('day').allDayMaxVisibleLanes(cap) },
    });
    expect(w.findAll('.coar-time-grid-all-day-bar')).toHaveLength(2);
    cap.value = 10;
    await nextTick();
    expect(w.findAll('.coar-time-grid-all-day-bar')).toHaveLength(5);
  });

  it('fitsContent: no band without all-day events', () => {
    const w = mount(CoarDayView, { props: { builder: newBuilder([]).view('day') } });
    expect(w.find('.coar-time-grid-all-day-band').exists()).toBe(false);
  });

  it('alwaysOneLane: an empty band keeps one lane of height', () => {
    const w = mount(CoarDayView, {
      props: { builder: newBuilder([]).view('day').allDayBandMode('alwaysOneLane') },
    });
    expect(w.find('.coar-time-grid-all-day-band').exists()).toBe(true);
    const one = bandHeight(w);
    const two = bandHeight(
      mount(CoarDayView, {
        props: { builder: newBuilder(allDay(2)).view('day').allDayBandMode('alwaysOneLane') },
      }),
    );
    expect(one).toBeGreaterThan(0);
    expect(two).toBeGreaterThan(one);
  });

  it('reservesCap: the band is cap-tall regardless of content, grows only when expanded', async () => {
    const empty = mount(CoarDayView, {
      props: { builder: newBuilder([]).view('day').allDayBandMode('reservesCap') },
    });
    const one = mount(CoarDayView, {
      props: { builder: newBuilder(allDay(1)).view('day').allDayBandMode('reservesCap') },
    });
    const five = mount(CoarDayView, {
      props: { builder: newBuilder(allDay(5)).view('day').allDayBandMode('reservesCap') },
    });
    expect(bandHeight(empty)).toBe(bandHeight(one));
    expect(bandHeight(five)).toBe(bandHeight(one));
    await five.find('.coar-time-grid-all-day-overflow').trigger('click');
    expect(bandHeight(five)).toBeGreaterThan(bandHeight(one));
  });
});
