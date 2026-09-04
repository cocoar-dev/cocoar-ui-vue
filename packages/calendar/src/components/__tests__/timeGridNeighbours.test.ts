/**
 * Neighbour pages during a swipe + the prefetch that feeds them.
 *
 * Pins:
 *   - the previous / next page mount as ghost grids the moment a
 *     swipe pointer is taken, with the right dates, `aria-hidden`,
 *     no scroll registration; they unmount when the gesture ends
 *   - `api.getEventsForWindow` reads per window in loader mode and
 *     the whole source in `events()` mode
 *   - `[PREFETCH_WINDOWS]` warms caches without touching the visible
 *     range or firing `onRangeChange`
 *   - the surface prefetches both neighbours (default on), not with
 *     `prefetchNeighbours(false)`
 */

import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from '../../builders/calendar-builder';
import { PREFETCH_WINDOWS } from '../../builders/calendar-builder-internals';
import CoarWeekView from '../CoarWeekView.vue';
import CoarDayView from '../CoarDayView.vue';
import CoarTimeGrid from '../CoarTimeGrid.vue';
import type { CalendarEvent, ViewWindow } from '../../core';
import { zdt } from '../../__test-utils__/event-fixtures';

const newBuilder = () =>
  CalendarBuilder.create()
    .timezone('Europe/Vienna')
    .locale('de-AT')
    .firstDayOfWeek(1)
    .date(Temporal.PlainDate.from('2026-06-15'));

function touch(type: string, x: number): Event {
  const Ctor = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  const e = new Ctor(type, { bubbles: true, cancelable: true, clientX: x, clientY: 100 });
  Object.defineProperty(e, 'pointerId', { value: 4, configurable: true });
  Object.defineProperty(e, 'pointerType', { value: 'touch', configurable: true });
  return e;
}

const win = (start: string, end: string, view = 'week'): ViewWindow => ({
  view: view as ViewWindow['view'],
  start,
  end,
  timezone: 'Europe/Vienna',
});

describe('neighbour pages while swiping', () => {
  it('mount on pointer-down with the previous / next page dates, unmount after release', async () => {
    const b = newBuilder().view('week').events(ref([]));
    const w = mount(CoarWeekView, { props: { builder: b } });
    expect(w.findAll('.coar-time-grid-surface__ghost')).toHaveLength(0);

    const col = w.find('.coar-time-grid-column').element;
    col.dispatchEvent(touch('pointerdown', 200));
    await nextTick();
    const ghosts = w.findAll('.coar-time-grid-surface__ghost');
    expect(ghosts).toHaveLength(2);
    for (const g of ghosts) expect(g.attributes('aria-hidden')).toBe('true');
    // One live grid + two ghosts, each a full week.
    expect(w.findAll('.coar-time-grid')).toHaveLength(3);
    const headers = (g: (typeof ghosts)[number]) =>
      g.findAll('.coar-time-grid-header__cell').map((c) => c.text());
    expect(headers(ghosts[0])[0]).toContain('8.'); // Mon 8 June
    expect(headers(ghosts[1])[0]).toContain('22.'); // Mon 22 June

    window.dispatchEvent(touch('pointerup', 201)); // tap, no page turn
    await nextTick();
    expect(w.findAll('.coar-time-grid-surface__ghost')).toHaveLength(0);
    expect(b.state.date.value.toString()).toBe('2026-06-15');
  });

  it('ghosts do not steal the scroll registration from the live grid', async () => {
    const b = newBuilder().view('day').events(ref([]));
    const w = mount(CoarDayView, { props: { builder: b } });
    const setSpy = vi.spyOn(b, '_setScrollToTime');
    w.find('.coar-time-grid-column').element.dispatchEvent(touch('pointerdown', 200));
    await nextTick();
    expect(w.findAll('.coar-time-grid-surface__ghost')).toHaveLength(2);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('a ghost renders its all-day band pinned to the live band, or none at all', () => {
    const days = [Temporal.PlainDate.from('2026-06-15')];
    const allDay: CalendarEvent[] = [
      { id: 'ad', start: Temporal.PlainDate.from('2026-06-15'), meta: { title: 'all day' } },
    ];
    // Live page has a 60 px band, ghost page has no all-day events → empty band, 60 px.
    const empty = mount(CoarTimeGrid, {
      props: {
        builder: newBuilder().view('day').events(ref([])),
        dates: days,
        ghost: true,
        ghostBandPx: 60,
      },
    });
    const band = empty.find('.coar-time-grid-all-day-band');
    expect(band.exists()).toBe(true);
    expect(band.attributes('style')).toContain('min-height: 60px');
    expect(empty.findAll('.coar-time-grid-all-day-bar')).toHaveLength(0);

    // Live page has no band → the ghost renders none even with all-day events.
    const none = mount(CoarTimeGrid, {
      props: {
        builder: newBuilder().view('day').events(ref(allDay)),
        dates: days,
        ghost: true,
        ghostBandPx: 0,
      },
    });
    expect(none.find('.coar-time-grid-all-day-band').exists()).toBe(false);

    // Not a ghost: the band follows the page's own events as before.
    const live = mount(CoarTimeGrid, {
      props: { builder: newBuilder().view('day').events(ref(allDay)), dates: days },
    });
    expect(live.find('.coar-time-grid-all-day-band').exists()).toBe(true);
    expect(live.findAll('.coar-time-grid-all-day-bar')).toHaveLength(1);
  });

  it('ghosts read their own window in loader mode', async () => {
    const loader = vi.fn(
      async (window: ViewWindow): Promise<CalendarEvent[]> => [
        {
          id: `ev-${window.start}`,
          start: zdt(`${window.start}T09:00:00`, 'Europe/Vienna'),
          end: zdt(`${window.start}T10:00:00`, 'Europe/Vienna'),
          meta: { title: `first day ${window.start}` },
        },
      ],
    );
    const b = newBuilder().view('week').eventsLoader(loader);
    const w = mount(CoarWeekView, { props: { builder: b } });
    await vi.waitFor(() => expect(loader.mock.calls.length).toBeGreaterThanOrEqual(3));
    await vi.waitFor(() => expect(b.api.loading.value).toBe(false));
    w.find('.coar-time-grid-column').element.dispatchEvent(touch('pointerdown', 200));
    await nextTick();
    const ghosts = w.findAll('.coar-time-grid-surface__ghost');
    expect(ghosts[0].text()).toContain('first day 2026-06-08');
    expect(ghosts[1].text()).toContain('first day 2026-06-22');
  });
});

describe('api.getEventsForWindow', () => {
  it('events() mode returns the whole source for any window', () => {
    const events: CalendarEvent[] = [
      { id: 'a', start: zdt('2026-06-15T09:00:00'), meta: {} },
      { id: 'b', start: zdt('2026-07-15T09:00:00'), meta: {} },
    ];
    const b = newBuilder().view('week').events(ref(events));
    expect(b.api.getEventsForWindow(win('2026-06-08', '2026-06-15'))).toHaveLength(2);
  });

  it('loader mode returns the cache for that window only', async () => {
    const loader = vi.fn(
      async (window: ViewWindow): Promise<CalendarEvent[]> => [
        { id: window.start, start: zdt(`${window.start}T09:00:00`, 'Europe/Vienna'), meta: {} },
      ],
    );
    const b = newBuilder().view('week').eventsLoader(loader);
    const target = win('2026-06-22', '2026-06-29');
    expect(b.api.getEventsForWindow(target)).toEqual([]);
    b[PREFETCH_WINDOWS]([target]);
    await vi.waitFor(() => expect(b.api.getEventsForWindow(target)).toHaveLength(1));
    expect(b.api.getEventsForWindow(target)[0].id).toBe('2026-06-22');
    expect(b.api.getEventsForWindow(win('2026-06-29', '2026-07-06'))).toEqual([]);
  });
});

describe('[PREFETCH_WINDOWS]', () => {
  it('warms the loader cache without moving the visible range or firing onRangeChange', async () => {
    const loader = vi.fn(async (): Promise<CalendarEvent[]> => []);
    const onRangeChange = vi.fn();
    const b = newBuilder().view('week').eventsLoader(loader).onRangeChange(onRangeChange);
    b[PREFETCH_WINDOWS]([win('2026-06-08', '2026-06-15'), win('2026-06-22', '2026-06-29')]);
    await vi.waitFor(() => expect(b._debug_cacheKeys()).toHaveLength(2));
    expect(b.api.getVisibleRange()).toBeNull();
    expect(onRangeChange).not.toHaveBeenCalled();
    // Second call: cache hits, no re-fetch.
    b[PREFETCH_WINDOWS]([win('2026-06-08', '2026-06-15')]);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('the surface prefetches both neighbours by default, none with prefetchNeighbours(false)', async () => {
    const loader = vi.fn<(window: ViewWindow) => Promise<CalendarEvent[]>>(async () => []);
    const b = newBuilder().view('week').eventsLoader(loader);
    mount(CoarWeekView, { props: { builder: b } });
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(3), { timeout: 1500 });
    const starts = loader.mock.calls.map(([w]) => w.start).sort();
    expect(starts).toEqual(['2026-06-08', '2026-06-15', '2026-06-22']);

    const quiet = vi.fn(async (): Promise<CalendarEvent[]> => []);
    const b2 = newBuilder().view('week').eventsLoader(quiet).prefetchNeighbours(false);
    mount(CoarWeekView, { props: { builder: b2 } });
    await new Promise((r) => setTimeout(r, 400));
    expect(quiet).toHaveBeenCalledTimes(1);
  });
});
