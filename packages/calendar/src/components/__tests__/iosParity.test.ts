/**
 * Behaviour ported from `Cocoar.Calendar.iOS` 5.x so web and iOS
 * agree:
 *
 *   - agenda `empty` slot: only when the list draws nothing, never
 *     next to empty-day headers, never while a load is in flight,
 *     no default rendering
 *   - `eventTextContrast('apca')` flips the text colour on saturated
 *     mid-tones; `meta.textColor` overrides either policy
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
