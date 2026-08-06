/**
 * Component-level integration tests.
 *
 * Pin: each view mounts against the builder, renders, format calls
 * route through `buildFormatOptions`, drop pipeline (C2) reaches
 * onEventDrop with C3-preserving payload.
 */

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarCalendar from '../CoarCalendar.vue';
import CoarDayView from '../CoarDayView.vue';
import CoarWeekView from '../CoarWeekView.vue';
import CoarMonthView from '../CoarMonthView.vue';
import CoarMonthListView from '../CoarMonthListView.vue';
import CoarAgendaView from '../CoarAgendaView.vue';
import type { CalendarEvent } from '../../core';
import { zdt, pd } from '../../__test-utils__/event-fixtures';

const newBuilder = (events: CalendarEvent[] = []) => {
  const b = CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-06-15'));
  if (events.length > 0) b.events(ref(events));
  return b;
};

import { ref } from 'vue';

const sampleEvents = (): CalendarEvent[] => [
  {
    id: 'standup',
    start: zdt('2026-06-15T09:00:00', 'Europe/Vienna'),
    end: zdt('2026-06-15T09:30:00', 'Europe/Vienna'),
    meta: { title: 'Daily Standup' },
  },
  {
    id: 'lunch',
    start: zdt('2026-06-16T12:00:00', 'Europe/Vienna'),
    end: zdt('2026-06-16T13:00:00', 'Europe/Vienna'),
    meta: { title: 'Lunch' },
  },
  {
    id: 'vacation',
    start: pd('2026-06-20'),
    end: pd('2026-06-25'),
    meta: { title: 'Vacation' },
  },
];

// ─── CoarCalendar shell ────────────────────────────────────────

describe('CoarCalendar shell', () => {
  it('mounts and renders the active view', () => {
    const b = newBuilder().view('week');
    const w = mount(CoarCalendar, { props: { builder: b } });
    expect(w.find('.coar-calendar').exists()).toBe(true);
    expect(w.find('.coar-time-grid').exists()).toBe(true); // week → time-grid
    expect(w.find('.coar-month-view').exists()).toBe(false);
  });

  it('switches sub-view when state.view changes', async () => {
    const b = newBuilder().view('month');
    const w = mount(CoarCalendar, { props: { builder: b } });
    expect(w.find('.coar-continuous-month-view').exists()).toBe(true);
    expect(w.find('.coar-month-view').exists()).toBe(true);
    b.api.setView('day');
    await w.vm.$nextTick();
    expect(w.find('.coar-month-view').exists()).toBe(false);
    expect(w.find('.coar-time-grid').exists()).toBe(true);
  });

  it('header label routes through buildFormatOptions (C6)', () => {
    const b = newBuilder().view('day').locale('de-AT').dateStyle('long');
    const w = mount(CoarCalendar, { props: { builder: b } });
    // Header label class was renamed `__label` → `__range-label`
    // when the range-spanning week-view header landed.
    const label = w.find('.coar-calendar__range-label').text();
    // Article 9: 'de-AT' + dateStyle='long' → "15. Juni 2026" (or
    // similar Austrian format). At minimum: contains 'Juni'.
    expect(label).toMatch(/Juni|June/);
  });

  it('view switcher calls api.setView', async () => {
    const b = newBuilder().view('day');
    const w = mount(CoarCalendar, { props: { builder: b } });
    // The shell uses `<CoarSegmentedControl>` for the view-switcher;
    // each option renders a `<button class="coar-segmented-control__segment">`
    // with the human-readable label ('Day', 'Week', 'Month', …) — i18n
    // strings come from `coar.calendar.view.<id>` with capitalised
    // English fallbacks.
    const buttons = w.findAll('.coar-segmented-control__segment');
    const monthBtn = buttons.find((btn) => /^month$/i.test(btn.text()));
    expect(monthBtn).toBeDefined();
    await monthBtn!.trigger('click');
    expect(b.state.view.value).toBe('month');
  });

  it('keeps Month variations out of the primary switcher and switches them contextually', async () => {
    const b = newBuilder(sampleEvents()).view('month');
    const w = mount(CoarCalendar, { props: { builder: b } });
    const primaryLabels = w
      .findAll('.coar-calendar__view-switcher .coar-segmented-control__segment')
      .map((button) => button.text());
    expect(primaryLabels).toContain('Month');
    expect(primaryLabels).not.toContain('List');

    const listButton = w
      .findAll('.coar-calendar__mode-switcher .coar-segmented-control__segment')
      .find((button) => button.text() === 'List');
    expect(listButton).toBeDefined();
    await listButton!.trigger('click');
    expect(b.state.view.value).toBe('monthList');
    expect(w.find('.coar-month-list-view').exists()).toBe(true);

    const compactButton = w
      .findAll('.coar-calendar__mode-switcher .coar-segmented-control__segment')
      .find((button) => button.text() === 'Compact');
    await compactButton!.trigger('click');
    expect(b.state.view.value).toBe('month');
    expect(b.state.monthDensity).toBe('compact');
  });

  it('offers One day and Multi-day as contextual Day modes', async () => {
    const b = newBuilder().view('day');
    const w = mount(CoarCalendar, { props: { builder: b } });
    const multiDayButton = w
      .findAll('.coar-calendar__mode-switcher .coar-segmented-control__segment')
      .find((button) => button.text() === 'Multi-day');
    expect(multiDayButton).toBeDefined();
    await multiDayButton!.trigger('click');
    expect(b.state.dayMode).toBe('multiDay');
  });

  it('mounts useViewWindow exactly once (no second-mount warn)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const b = newBuilder().view('week');
    mount(CoarCalendar, { props: { builder: b } });
    // Shell mounted useViewWindow once; sub-views must NOT mount another.
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringMatching(/single writer|second/i));
    warnSpy.mockRestore();
  });
});

// ─── CoarDayView ───────────────────────────────────────────────

describe('CoarDayView', () => {
  it('renders a single column for cursor.value', () => {
    const b = newBuilder(sampleEvents()).view('day');
    const w = mount(CoarDayView, { props: { builder: b } });
    expect(w.findAll('.coar-time-grid-column')).toHaveLength(1);
    // Standup falls on June 15 → renders.
    const eventCards = w.findAll('.coar-time-grid-event');
    expect(eventCards.length).toBeGreaterThan(0);
  });

  it('keeps assignees in the default timed-event renderer', () => {
    const events = sampleEvents();
    events[0] = {
      ...events[0],
      meta: {
        ...events[0].meta,
        assignees: [{ id: 'anna', displayName: 'Anna Berger', color: '#7c3aed' }],
      },
    };
    const w = mount(CoarDayView, { props: { builder: newBuilder(events).view('day') } });
    expect(w.find('.coar-event-assignees').attributes('aria-label')).toBe('Anna Berger');
    expect(w.find('.coar-event-assignees__avatar').text()).toBe('AB');
  });
});

// ─── CoarWeekView ──────────────────────────────────────────────

describe('CoarWeekView', () => {
  it('renders 7 columns', () => {
    const b = newBuilder(sampleEvents()).view('week');
    const w = mount(CoarWeekView, { props: { builder: b } });
    expect(w.findAll('.coar-time-grid-column')).toHaveLength(7);
  });

  it('renders timed events that fall in the visible week', () => {
    const b = newBuilder(sampleEvents()).view('week');
    const w = mount(CoarWeekView, { props: { builder: b } });
    const eventCards = w.findAll('.coar-time-grid-event');
    expect(eventCards.length).toBeGreaterThanOrEqual(2); // standup + lunch
  });
});

// ─── CoarMonthView ─────────────────────────────────────────────

describe('CoarMonthView', () => {
  it('renders 6 weekday rows × 7 cells = 42', () => {
    const b = newBuilder(sampleEvents()).view('month');
    const w = mount(CoarMonthView, { props: { builder: b } });
    expect(w.findAll('.coar-month-cell')).toHaveLength(42);
  });

  it('renders day numbers via buildFormatOptions', () => {
    const b = newBuilder().view('month').locale('de-AT');
    const w = mount(CoarMonthView, { props: { builder: b } });
    // First cell is May 25 (week starts Monday in de-AT).
    const cellText = w.find('.coar-month-cell').text();
    expect(cellText).toMatch(/\d/); // contains a digit
  });

  it('renders multi-day vacation as a bar', () => {
    const b = newBuilder(sampleEvents()).view('month');
    const w = mount(CoarMonthView, { props: { builder: b } });
    const bars = w.findAll('.coar-month-bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('keeps assignees in the default month renderer', () => {
    const events = sampleEvents();
    events[0] = {
      ...events[0],
      meta: {
        ...events[0].meta,
        assignees: [{ id: 'anna', displayName: 'Anna Berger', color: '#7c3aed' }],
      },
    };
    const w = mount(CoarMonthView, { props: { builder: newBuilder(events).view('month') } });
    expect(w.find('.coar-event-assignees').attributes('aria-label')).toBe('Anna Berger');
  });

  it('surfaces the selected Compact, Stacked or Details mode as a render class', () => {
    const b = newBuilder().view('month').monthDensity('stacked');
    const w = mount(CoarMonthView, { props: { builder: b } });
    expect(w.classes()).toContain('coar-month-view--mode-stacked');
  });
});

// ─── CoarMonthListView ─────────────────────────────────────────

describe('CoarMonthListView', () => {
  it('renders a compact 42-day selector and the selected day list', async () => {
    const b = newBuilder(sampleEvents()).view('monthList');
    const w = mount(CoarMonthListView, { props: { builder: b } });
    expect(w.findAll('.coar-month-list-view__day')).toHaveLength(42);
    expect(w.find('.coar-month-list-view__events').text()).toContain('Daily Standup');

    const june16 = w
      .findAll('.coar-month-list-view__day')
      .find(
        (button) =>
          button.text().startsWith('16') &&
          !button.classes().includes('coar-month-list-view__day--other'),
      );
    expect(june16).toBeDefined();
    await june16!.trigger('click');
    expect(b.state.date.value.toString()).toBe('2026-06-16');
    expect(w.find('.coar-month-list-view__events').text()).toContain('Lunch');
  });
});

// ─── CoarAgendaView ────────────────────────────────────────────

describe('CoarAgendaView', () => {
  it('renders day-headers + event rows', () => {
    const b = newBuilder(sampleEvents()).view('agenda');
    const w = mount(CoarAgendaView, { props: { builder: b } });
    expect(w.findAll('.coar-agenda-day-header').length).toBeGreaterThan(0);
    expect(w.findAll('.coar-agenda-event').length).toBeGreaterThan(0);
  });

  it('renders a seven-day selector for day agenda and updates the selected day', async () => {
    const b = newBuilder(sampleEvents()).view('dayAgenda');
    const w = mount(CoarAgendaView, { props: { builder: b, view: 'dayAgenda' } });
    const days = w.findAll('.coar-agenda-view__week-day');
    expect(days).toHaveLength(7);
    expect(days[0].attributes('aria-selected')).toBe('true');
    await days[1].trigger('click');
    expect(b.state.date.value.toString()).toBe('2026-06-16');
  });

  it('event time labels route through buildFormatOptions (C6)', () => {
    const b = newBuilder(sampleEvents()).view('agenda').timeStyle('short').hour12(false);
    const w = mount(CoarAgendaView, { props: { builder: b } });
    const eventTexts = w.findAll('.coar-agenda-event').map((e) => e.text());
    // Standup is 09:00; in 24h format with timeStyle='short', should
    // render as "09:00" or similar. Grep for ":" to confirm time labels render.
    expect(eventTexts.some((t) => t.includes(':'))).toBe(true);
  });
});

// ─── Drop pipeline (C2 — payload reaches onEventDrop) ─────────

describe('Drop pipeline integration', () => {
  it('CoarTimeGrid pointer-down → pointer-up emits onEventDrop with C3 payload', async () => {
    const b = newBuilder(sampleEvents()).view('day');
    const handler = vi.fn();
    b.onEventDrop(handler);
    const w = mount(CoarDayView, {
      props: { builder: b },
      attachTo: document.body,
    });
    // Find the standup card.
    const card = w.find('.coar-time-grid-event');
    expect(card.exists()).toBe(true);
    // Stub getBoundingClientRect on the columns container (the actual
    // hit-test surface — `useTimeGridDnd` reads bounds from `columnsRef`).
    // jsdom/happy-dom returns zeros, so we have to inject geometry.
    const surface = w.find('.coar-time-grid__columns').element as HTMLElement;
    surface.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 200,
        height: 1440,
        right: 200,
        bottom: 1440,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    // Pointerdown initialises the drag on the CARD (with
    // setPointerCapture). Move + up are listened to on `window`
    // (see useCoarDrag.ts) — vue-test-utils' `card.trigger(...)`
    // doesn't reach window listeners under happy-dom, so we dispatch
    // those events directly. `pointerId` must match across all three
    // events so the listener doesn't reject them.
    const POINTER_ID = 1;
    await card.trigger('pointerdown', {
      clientX: 50,
      clientY: 540,
      pointerId: POINTER_ID,
      button: 0,
    });
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 50,
        clientY: 720, // 12:00 with default 60px/h
        pointerId: POINTER_ID,
        bubbles: true,
      }),
    );
    // useCoarDrag.tick() runs inside rAF and is what flips
    // `crossedThreshold` (default threshold = 5px). Wait for at
    // least one rAF before firing pointerup, or onDragEnd will
    // treat the input as a click and never call onEventDrop.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 50,
        clientY: 720,
        pointerId: POINTER_ID,
        bubbles: true,
      }),
    );
    await w.vm.$nextTick();
    expect(handler).toHaveBeenCalledTimes(1);
    const payload = handler.mock.calls[0][0];
    expect(payload.target.displayZone).toBe('Europe/Vienna');
    // C3 — Tokyo source preserved? Standup is Vienna source — check
    // that next.start.timeZoneId is Vienna (not collapsed).
    expect(payload.next.start.timeZoneId).toBe('Europe/Vienna');
    w.unmount();
  });
});
