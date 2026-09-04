/**
 * Labels on the list-style surfaces and their spoken equivalents.
 *
 * Pins:
 *   - agenda / month-list time column shows "start – end" for timed
 *     events with an end, start only for point events, "All day" for
 *     all-day (the SwiftUI port's default since 2026-07-13)
 *   - month-grid a11y label of a multi-day all-day event names the
 *     INCLUSIVE last day (RFC-5545 `end` is exclusive)
 *   - the cross-zone / UTC decorations translate through the host
 *     service without throwing (regression: `service.t` was called
 *     detached from its instance)
 *   - the shipped German catalog reaches the views through
 *     `createCalendarTranslationSource()`
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { createCoarLocalization } from '@cocoar/vue-localization';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarAgendaView from '../CoarAgendaView.vue';
import CoarMonthListView from '../CoarMonthListView.vue';
import CoarMonthView from '../CoarMonthView.vue';
import { createCalendarTranslationSource } from '../../i18n/messages';
import type { CalendarEvent } from '../../core';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

// de-AT + hour: 'numeric' renders "9:00", not "09:00" — the tests
// assert the SHAPE (span vs. start-only), the format is Intl's call.
const newBuilder = (events: CalendarEvent[]) =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .hour12(false)
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref(events));

const timeTexts = (w: ReturnType<typeof mount>) =>
  w.findAll('.coar-agenda-event__time').map((e) => e.text());

describe('agenda time labels', () => {
  const events: CalendarEvent[] = [
    {
      id: 'span',
      start: zdt('2026-06-15T09:00:00', 'Europe/Vienna'),
      end: zdt('2026-06-15T10:30:00', 'Europe/Vienna'),
      meta: { title: 'Planning' },
    },
    { id: 'point', start: zdt('2026-06-15T14:00:00', 'Europe/Vienna'), meta: { title: 'Ping' } },
    { id: 'allday', start: pd('2026-06-15'), end: pd('2026-06-16'), meta: { title: 'Offsite' } },
  ];

  it('agenda: "start – end" for spans, start only for point events, "All day" for all-day', () => {
    const w = mount(CoarAgendaView, { props: { builder: newBuilder(events).view('agenda') } });
    const texts = timeTexts(w);
    expect(texts).toContain('9:00 – 10:30');
    expect(texts).toContain('14:00');
    expect(texts).toContain('All day');
    expect(texts.some((t) => t.startsWith('14:00 –'))).toBe(false);
  });

  it('month list: same rule for the selected-day list', () => {
    const w = mount(CoarMonthListView, {
      props: { builder: newBuilder(events).view('monthList') },
    });
    const texts = timeTexts(w);
    expect(texts).toContain('9:00 – 10:30');
    expect(texts).toContain('14:00');
    expect(texts).toContain('All day');
  });
});

describe('month grid a11y label for all-day events', () => {
  it('names the inclusive last day of a multi-day stay', () => {
    // Fri 2026-06-19 … Sun 2026-06-21; exclusive end = Mon 22.
    const w = mount(CoarMonthView, {
      props: {
        builder: newBuilder([
          { id: 'trip', start: pd('2026-06-19'), end: pd('2026-06-22'), meta: { title: 'Trip' } },
        ])
          .view('month')
          .locale('en-GB'),
      },
    });
    const label = w.find('.coar-month-bar[data-event-id="trip"]').attributes('aria-label');
    expect(label).toContain('Fri');
    expect(label).toContain('Sun');
    expect(label).not.toContain('Mon');
  });

  it('single-day all-day events get one date, not "Fri – Fri"', () => {
    const w = mount(CoarMonthView, {
      props: {
        builder: newBuilder([
          { id: 'one', start: pd('2026-06-19'), end: pd('2026-06-20'), meta: { title: 'One' } },
        ])
          .view('month')
          .locale('en-GB'),
      },
    });
    const label = w.find('.coar-month-pill[data-event-id="one"]').attributes('aria-label') ?? '';
    expect(label).toContain('Fri');
    expect(label).not.toContain('–');
    expect(label).not.toContain('Sat');
  });
});

describe('decorations through a real localization service', () => {
  it('renders a cross-zone event in the agenda with the German catalog, without throwing', async () => {
    const loc = createCoarLocalization({ defaultLanguage: 'de-AT' });
    loc.service.addTranslationSource(createCalendarTranslationSource());
    await loc.service.setLanguage('de-AT');

    const events: CalendarEvent[] = [
      {
        id: 'tokyo',
        start: zdt('2026-06-15T09:00:00', 'Asia/Tokyo'),
        end: zdt('2026-06-15T10:00:00', 'Asia/Tokyo'),
        meta: { title: 'Tokyo sync' },
      },
      { id: 'allday', start: pd('2026-06-15'), end: pd('2026-06-16'), meta: { title: 'Offsite' } },
    ];
    const w = mount(CoarAgendaView, {
      props: { builder: newBuilder(events).view('agenda') },
      global: { plugins: [loc] },
    });
    // The cross-zone hint is the code path that used to throw.
    expect(w.html()).toContain('Zeitzone des Termins: Asia/Tokyo');
    // And a plain label proves the catalog is the source, not the fallback.
    expect(timeTexts(w)).toContain('Ganztägig');
  });
});
