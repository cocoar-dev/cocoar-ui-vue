/**
 * Month-view overflow — the "+N" contract shared with the iOS
 * calendar (`ContinuousMonthGeometry.detailsVisibleEventLimit`).
 *
 * Pins:
 *   - Details shows `maxEventsPerCell` pills (default 2) + one "+N" row
 *   - the "+N" button is localized and opens a day sheet over the cell
 *     that lists every event of the day (each a live, draggable pill)
 *   - the sheet closes on Escape, its close control and an outside click
 *   - `maxEventsPerCell` raises the cap; a cell at the cap has no marker
 *   - Stacked caps at its fixed 2 marks and Compact at 6 segments,
 *     silently — the "+N" row is Details-only, as on iOS
 *   - the old per-cell kebab / row-expansion menu is gone
 *   - a tap on the cell body still reaches `onDateClick`; "+N" does not
 */

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { createCoarLocalization } from '@cocoar/vue-localization';
import { CalendarBuilder } from '../../builders/calendar-builder';
import CoarMonthView from '../CoarMonthView.vue';
import { createCalendarTranslationSource } from '../../i18n/messages';
import type { CalendarEvent } from '../../core';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

function sameDayEvents(count: number, day = '2026-06-15', prefix = 'e'): CalendarEvent[] {
  const hhmm = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    start: zdt(`${day}T${hhmm(8 * 60 + i * 15)}:00`, 'Europe/Vienna'),
    end: zdt(`${day}T${hhmm(8 * 60 + i * 15 + 10)}:00`, 'Europe/Vienna'),
    meta: { title: `Event ${i + 1}` },
  }));
}

function newBuilder(events: CalendarEvent[]) {
  return CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .view('month')
    .date(Temporal.PlainDate.from('2026-06-15'))
    .events(ref(events));
}

const cell = (w: ReturnType<typeof mount>, key = '2026-06-15') => w.find(`[data-day-key="${key}"]`);

describe('month view — "+N" overflow', () => {
  it('Details: two pills and a "+N" row for the rest, by default', () => {
    const w = mount(CoarMonthView, { props: { builder: newBuilder(sameDayEvents(5)) } });
    const c = cell(w);
    expect(c.findAll('.coar-month-pill').map((p) => p.attributes('data-event-id'))).toEqual([
      'e0',
      'e1',
    ]);
    const marker = c.find('.coar-month-cell__overflow');
    expect(marker.text()).toBe('+3');
    expect(marker.attributes('aria-label')).toBe('3 more events');
  });

  it('localizes the screen-reader label through @cocoar/vue-localization', async () => {
    const loc = createCoarLocalization({ defaultLanguage: 'de-AT' });
    loc.service.addTranslationSource(createCalendarTranslationSource());
    await loc.service.setLanguage('de-AT');
    const w = mount(CoarMonthView, {
      props: { builder: newBuilder(sameDayEvents(3)) },
      global: { plugins: [loc] },
    });
    expect(cell(w).find('.coar-month-cell__overflow').attributes('aria-label')).toBe(
      '1 weitere Termine',
    );
  });

  it('shows no marker at or under the cap', () => {
    const w = mount(CoarMonthView, { props: { builder: newBuilder(sameDayEvents(2)) } });
    expect(cell(w).findAll('.coar-month-pill')).toHaveLength(2);
    expect(cell(w).find('.coar-month-cell__overflow').exists()).toBe(false);
  });

  it('`maxEventsPerCell` raises the Details cap', () => {
    const w = mount(CoarMonthView, {
      props: { builder: newBuilder(sameDayEvents(5)).maxEventsPerCell(4) },
    });
    expect(cell(w).findAll('.coar-month-pill')).toHaveLength(4);
    expect(cell(w).find('.coar-month-cell__overflow').text()).toContain('+1');
  });

  it('Stacked caps at two marks and Compact at six segments, without a marker', () => {
    const stacked = mount(CoarMonthView, {
      props: { builder: newBuilder(sameDayEvents(4)).monthDensity('stacked') },
    });
    expect(cell(stacked).findAll('.coar-month-pill')).toHaveLength(2);
    expect(cell(stacked).find('.coar-month-cell__overflow').exists()).toBe(false);

    const compact = mount(CoarMonthView, {
      props: { builder: newBuilder(sameDayEvents(8)).monthDensity('compact') },
    });
    expect(cell(compact).findAll('.coar-month-view__segment')).toHaveLength(6);
    expect(cell(compact).find('.coar-month-cell__overflow').exists()).toBe(false);
  });

  it('has no per-cell menu trigger and no context menu any more', () => {
    const w = mount(CoarMonthView, { props: { builder: newBuilder(sameDayEvents(5)) } });
    expect(w.find('.coar-month-cell__menu-trigger').exists()).toBe(false);
    expect(w.find('[aria-haspopup="menu"]').exists()).toBe(false);
    expect(w.text()).not.toContain('Mehr Termine anzeigen');
  });

  it('"+N" is not a date click — the cell body still is', async () => {
    const onDateClick = vi.fn();
    const w = mount(CoarMonthView, {
      props: { builder: newBuilder(sameDayEvents(5)).onDateClick(onDateClick) },
    });
    await cell(w).find('.coar-month-cell__overflow').trigger('pointerdown');
    expect(onDateClick).not.toHaveBeenCalled();
    await cell(w).trigger('pointerdown');
    expect(onDateClick).toHaveBeenCalledTimes(1);
    expect(onDateClick.mock.calls[0][0].date.toString()).toBe('2026-06-15');
  });

  it('keeps the row height fixed regardless of how many events a day has', () => {
    const few = mount(CoarMonthView, { props: { builder: newBuilder(sameDayEvents(1)) } });
    const many = mount(CoarMonthView, { props: { builder: newBuilder(sameDayEvents(30)) } });
    const rowHeight = (w: ReturnType<typeof mount>) =>
      w.findAll('.coar-month-row')[2].attributes('style');
    expect(rowHeight(many)).toBe(rowHeight(few));
    expect(rowHeight(few)).toContain('height: 94px');
  });
});

describe('month view — day sheet opened by "+N"', () => {
  const overlay = (w: ReturnType<typeof mount>) => w.find('.coar-month-day-overlay');

  async function openSheet(
    events = sameDayEvents(7),
    builderTweak?: (b: ReturnType<typeof newBuilder>) => void,
  ) {
    const b = newBuilder(events);
    builderTweak?.(b);
    const w = mount(CoarMonthView, { props: { builder: b }, attachTo: document.body });
    await cell(w).find('.coar-month-cell__overflow').trigger('click');
    await nextTick();
    await nextTick();
    return w;
  }

  it('lists every event of the day as live pills and names the dialog', async () => {
    const w = await openSheet();
    const sheet = overlay(w);
    expect(sheet.exists()).toBe(true);
    expect(sheet.attributes('role')).toBe('dialog');
    expect(sheet.attributes('aria-label')).toContain('2026');
    expect(sheet.find('.coar-month-day-overlay__day-number').text()).toBe('15');
    expect(sheet.findAll('.coar-month-pill').map((p) => p.attributes('data-event-id'))).toEqual([
      'e0',
      'e1',
      'e2',
      'e3',
      'e4',
      'e5',
      'e6',
    ]);
    expect(sheet.findAll('.coar-month-pill[role="button"]')).toHaveLength(7);
    expect(cell(w).find('.coar-month-cell__overflow').attributes('aria-expanded')).toBe('true');
    // The grid keeps its cap — the sheet is an overlay, not an expansion.
    expect(cell(w).findAll('.coar-month-pill')).toHaveLength(2);
    expect(w.findAll('.coar-month-row')[2].attributes('style')).toContain('height: 94px');
    w.unmount();
  });

  it('has a bounded, scrolling list and takes focus', async () => {
    const w = await openSheet();
    const list = overlay(w).find('.coar-month-day-overlay__list');
    expect(list.attributes('style')).toMatch(/max-height: \d+px/);
    expect(document.activeElement).toBe(overlay(w).element);
    w.unmount();
  });

  it('closes on Escape, on the close control, on an outside pointerdown and via "+N" again', async () => {
    const w = await openSheet();
    await overlay(w).trigger('keydown', { key: 'Escape' });
    expect(overlay(w).exists()).toBe(false);
    expect(cell(w).find('.coar-month-cell__overflow').attributes('aria-expanded')).toBe('false');

    await cell(w).find('.coar-month-cell__overflow').trigger('click');
    await nextTick();
    await overlay(w).find('.coar-month-day-overlay__close').trigger('click');
    expect(overlay(w).exists()).toBe(false);

    await cell(w).find('.coar-month-cell__overflow').trigger('click');
    await nextTick();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(overlay(w).exists()).toBe(false);

    await cell(w).find('.coar-month-cell__overflow').trigger('click');
    await nextTick();
    expect(overlay(w).exists()).toBe(true);
    await cell(w).find('.coar-month-cell__overflow').trigger('click');
    await nextTick();
    expect(overlay(w).exists()).toBe(false);
    w.unmount();
  });

  it('stays open on a pointerdown inside the sheet (a drag start)', async () => {
    const w = await openSheet();
    await overlay(w).find('.coar-month-pill[data-event-id="e5"]').trigger('pointerdown');
    await nextTick();
    expect(overlay(w).exists()).toBe(true);
    w.unmount();
  });

  it('opens only one sheet at a time and closes when the month changes', async () => {
    const b = newBuilder([...sameDayEvents(4), ...sameDayEvents(4, '2026-06-16', 'f')]);
    const w = mount(CoarMonthView, { props: { builder: b }, attachTo: document.body });
    await cell(w).find('.coar-month-cell__overflow').trigger('click');
    await nextTick();
    await cell(w, '2026-06-16').find('.coar-month-cell__overflow').trigger('click');
    await nextTick();
    expect(w.findAll('.coar-month-day-overlay')).toHaveLength(1);
    expect(overlay(w).find('.coar-month-day-overlay__day-number').text()).toBe('16');

    b.date(Temporal.PlainDate.from('2026-07-15'));
    await nextTick();
    expect(overlay(w).exists()).toBe(false);
    w.unmount();
  });

  it('routes double-click on a sheet pill to onEventDoubleClick, not onDateDoubleClick', async () => {
    const onEventDoubleClick = vi.fn();
    const onDateDoubleClick = vi.fn();
    const w = await openSheet(sameDayEvents(5), (b) =>
      b.onEventDoubleClick(onEventDoubleClick).onDateDoubleClick(onDateDoubleClick),
    );
    await overlay(w).find('.coar-month-pill[data-event-id="e4"]').trigger('dblclick');
    expect(onEventDoubleClick).toHaveBeenCalledTimes(1);
    expect(onEventDoubleClick.mock.calls[0][0].event.id).toBe('e4');
    expect(onDateDoubleClick).not.toHaveBeenCalled();
    w.unmount();
  });
});

describe('month view — multi-day lane cap (`monthMaxVisibleLanes`)', () => {
  // Four spans inside Mon 8 – Sun 14 June 2026 (end exclusive), two single-day events on the 9th.
  const spans = (): CalendarEvent[] => [
    { id: 'A', start: pd('2026-06-08'), end: pd('2026-06-13'), meta: { title: 'A Mo–Fr' } },
    { id: 'B', start: pd('2026-06-09'), end: pd('2026-06-12'), meta: { title: 'B Di–Do' } },
    { id: 'C', start: pd('2026-06-08'), end: pd('2026-06-15'), meta: { title: 'C Mo–So' } },
    { id: 'D', start: pd('2026-06-10'), end: pd('2026-06-14'), meta: { title: 'D Mi–Sa' } },
    ...sameDayEvents(2, '2026-06-09', 's'),
  ];
  const row = (w: ReturnType<typeof mount>) => w.findAll('.coar-month-row')[1];

  it("shows two lanes by default, folds the rest into the covered days' +N", () => {
    const w = mount(CoarMonthView, { props: { builder: newBuilder(spans()) } });
    const bars = row(w).findAll('.coar-month-bar[data-event-id]');
    expect(bars).toHaveLength(2);
    expect(row(w).attributes('style')).toContain('height: 134px');
    // Tue 9 June: A, B, C cover it → 2 visible lanes, 1 folded; its two pills fit.
    expect(cell(w, '2026-06-09').findAll('.coar-month-pill')).toHaveLength(2);
    expect(cell(w, '2026-06-09').find('.coar-month-cell__overflow').text()).toBe('+1');
    // Wed 10 June: all four spans cover it → 2 folded, no pills at all.
    expect(cell(w, '2026-06-10').findAll('.coar-month-pill')).toHaveLength(0);
    expect(cell(w, '2026-06-10').find('.coar-month-cell__overflow').text()).toBe('+2');
    // Sun 14 June: only C covers it (visible lane) → no marker.
    expect(cell(w, '2026-06-14').find('.coar-month-cell__overflow').exists()).toBe(false);
  });

  it('`monthMaxVisibleLanes(null)` shows every lane and grows the row', () => {
    const w = mount(CoarMonthView, {
      props: { builder: newBuilder(spans()).monthMaxVisibleLanes(null) },
    });
    expect(row(w).findAll('.coar-month-bar[data-event-id]')).toHaveLength(4);
    expect(row(w).attributes('style')).toContain('height: 174px');
    expect(cell(w, '2026-06-09').find('.coar-month-cell__overflow').exists()).toBe(false);
  });

  it('the day sheet lists the multi-day events first, folded ones included', async () => {
    const w = mount(CoarMonthView, {
      props: { builder: newBuilder(spans()) },
      attachTo: document.body,
    });
    await cell(w, '2026-06-09').find('.coar-month-cell__overflow').trigger('click');
    await nextTick();
    await nextTick();
    const ids = w
      .find('.coar-month-day-overlay')
      .findAll('.coar-month-pill')
      .map((p) => p.attributes('data-event-id'));
    expect(ids).toHaveLength(5);
    expect(ids.slice(0, 3).sort()).toEqual(['A', 'B', 'C']);
    expect(ids.slice(3)).toEqual(['s0', 's1']);
    w.unmount();
  });
});
