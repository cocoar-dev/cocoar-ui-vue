/**
 * `<CoarCalendar>` chrome toggles — hosts that bring their own
 * navigation / view controls switch the built-in ones off by prop
 * instead of `:deep()` CSS.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarCalendar from '../CoarCalendar.vue';

const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref([]));

describe('<CoarCalendar> chrome toggles', () => {
  it('renders the full header by default', () => {
    const w = mount(CoarCalendar, { props: { builder: newBuilder().view('month') } });
    expect(w.find('.coar-calendar__header').exists()).toBe(true);
    expect(w.find('.coar-calendar__view-switcher').exists()).toBe(true);
    expect(w.find('.coar-calendar__mode-switcher').exists()).toBe(true);
  });

  it('an EMPTY #header slot still shows the built-in header (Vue fallback semantics)', () => {
    const w = mount(CoarCalendar, {
      props: { builder: newBuilder().view('month') },
      slots: { header: '' },
    });
    expect(w.find('.coar-calendar__header').exists()).toBe(true);
  });

  it('hideHeader renders only the body; the api still drives the view', async () => {
    const b = newBuilder().view('month');
    const w = mount(CoarCalendar, { props: { builder: b, hideHeader: true } });
    expect(w.find('.coar-calendar__header').exists()).toBe(false);
    expect(w.find('.coar-calendar__body').exists()).toBe(true);
    b.api.setView('agenda');
    await w.vm.$nextTick();
    expect(w.find('.coar-agenda-view').exists()).toBe(true);
  });

  it('hideViewSwitcher keeps nav + range label, drops the primary switcher', () => {
    const w = mount(CoarCalendar, {
      props: { builder: newBuilder().view('month'), hideViewSwitcher: true },
    });
    expect(w.find('.coar-calendar__header').exists()).toBe(true);
    expect(w.find('.coar-calendar__nav').exists()).toBe(true);
    expect(w.find('.coar-calendar__range-label').exists()).toBe(true);
    expect(w.find('.coar-calendar__view-switcher').exists()).toBe(false);
    expect(w.find('.coar-calendar__mode-switcher').exists()).toBe(true);
  });

  it('hideModeSwitcher drops the Month / Day display choice in both views', async () => {
    const b = newBuilder().view('month');
    const w = mount(CoarCalendar, { props: { builder: b, hideModeSwitcher: true } });
    expect(w.find('.coar-calendar__view-switcher').exists()).toBe(true);
    expect(w.find('.coar-calendar__mode-switcher').exists()).toBe(false);
    b.api.setView('day');
    await w.vm.$nextTick();
    expect(w.find('.coar-calendar__mode-switcher').exists()).toBe(false);
  });
});
