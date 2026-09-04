/**
 * `api.rangeLabel` — reactive title of the visible window.
 *
 * Pins:
 *   - correct before any view has mounted (configured window)
 *   - follows navigation and view changes
 *   - once a view renders, the label follows the rendered window
 *   - the shell header shows the very same string
 *   - locale: explicit `locale()` wins; the host's localization
 *     service is the fallback when the builder is created in a setup
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { createCoarLocalization } from '@cocoar/vue-localization';
import { CalendarBuilder } from './calendar-builder';
import { SET_TOPMOST_VISIBLE_MONTH } from './calendar-builder-internals';
import { useCalendar } from '../useCalendar';
import CoarCalendar from '../components/CoarCalendar.vue';
import CoarWeekView from '../components/CoarWeekView.vue';

/** Intl pads the range dash with thin spaces; compare on plain ones. */
const norm = (s: string) => s.replace(/\s/g, ' ');
const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('en-US')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-06-17'));

describe('api.rangeLabel', () => {
  it('is right before any view mounted and follows navigation', () => {
    const b = newBuilder().view('week');
    expect(b.api.getVisibleRange()).toBeNull();
    expect(norm(b.api.rangeLabel.value)).toBe('Jun 15 – 21, 2026');
    b.api.next();
    expect(norm(b.api.rangeLabel.value)).toBe('Jun 22 – 28, 2026');
    b.api.setView('month');
    expect(norm(b.api.rangeLabel.value)).toBe('June 2026');
    b.api.setView('day');
    expect(norm(b.api.rangeLabel.value)).toBe('Wednesday, June 24, 2026');
  });

  it('follows the window a mounted view actually rendered', async () => {
    const b = newBuilder().view('day').dayMode('multiDay').dayColumnCount(3);
    expect(norm(b.api.rangeLabel.value)).toBe('Jun 17 – 19, 2026');
    mount(CoarWeekView, { props: { builder: b } });
    await nextTick();
    // The week view publishes its own window; the label is no longer
    // the configured day window but what is on screen.
    expect(b.api.getVisibleRange()?.view).toBe('week');
    b.api.setView('week');
    await nextTick();
    expect(norm(b.api.rangeLabel.value)).toBe('Jun 15 – 21, 2026');
  });

  it('is the string the shell header renders', async () => {
    const b = newBuilder().view('week');
    const w = mount(CoarCalendar, { props: { builder: b } });
    await nextTick();
    expect(w.find('.coar-calendar__range-label').text()).toBe(b.api.rangeLabel.value);
    b.api.next();
    await nextTick();
    expect(w.find('.coar-calendar__range-label').text()).toBe(b.api.rangeLabel.value);
    expect(norm(b.api.rangeLabel.value)).toBe('Jun 22 – 28, 2026');
  });

  it('month label follows the live topmost month while the cursor stays put', () => {
    const b = newBuilder().view('month');
    expect(b.api.topmostVisibleMonth.value).toBeNull();
    expect(norm(b.api.rangeLabel.value)).toBe('June 2026');
    b[SET_TOPMOST_VISIBLE_MONTH](Temporal.PlainYearMonth.from('2026-08'));
    expect(b.api.topmostVisibleMonth.value?.toString()).toBe('2026-08');
    expect(norm(b.api.rangeLabel.value)).toBe('August 2026');
    expect(b.state.date.value.toString()).toBe('2026-06-17');
    // Other views ignore the anchor.
    b.api.setView('week');
    expect(norm(b.api.rangeLabel.value)).toBe('Jun 15 – 21, 2026');
    b.api.setView('month');
    b[SET_TOPMOST_VISIBLE_MONTH](null);
    expect(norm(b.api.rangeLabel.value)).toBe('June 2026');
  });

  it('falls back to the host localization language when no locale is set', () => {
    let label = '';
    const Host = defineComponent({
      setup() {
        const { builder, api } = useCalendar();
        builder
          .timezone('Europe/Vienna')
          .firstDayOfWeek(1)
          .view('month')
          .date(Temporal.PlainDate.from('2026-06-17'));
        label = api.rangeLabel.value;
        return () => h('div');
      },
    });
    mount(Host, { global: { plugins: [createCoarLocalization({ defaultLanguage: 'de-AT' })] } });
    expect(label).toBe('Juni 2026');
  });
});
