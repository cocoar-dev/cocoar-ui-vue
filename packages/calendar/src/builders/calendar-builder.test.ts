/**
 * `CalendarBuilder` — runtime contract tests.
 *
 * Pins the architectural invariants so future audit cycles can grep
 * for the behaviour and not have to re-derive it:
 *
 *   - **C7 (reactive reads)** — every consumer setter is read fresh
 *     at every invocation, never captured at setup. Mid-session
 *     mutation takes effect immediately.
 *
 *   - **D4 (no canDrop memoization)** — setting `canDrop` after a
 *     drag started must take effect on the next hit-test.
 *
 *   - **Loader cache (C5)** — keyed by `view|tz|start|end`; hits skip
 *     re-fetch; `refresh()` invalidates everything; `refreshRange()`
 *     intersects-and-invalidates.
 *
 *   - **Loading counter** — concurrent fetches don't race the boolean.
 *
 *   - **Navigation** — refs accepted two-way, plain values wrapped,
 *     getters rejected.
 *
 *   - **Mutual exclusion** — `events()` ⊕ `eventsLoader()`; setting
 *     one clears the other and drops the cache.
 *
 *   - **Generation counter** — in-flight loader resolving after a
 *     `refresh()` is discarded, not poisoning fresh data.
 */

import { describe, expect, it, vi } from 'vitest';
import { ref, toValue } from 'vue';

/** Drain N microtasks so Promise.then().then().finally() chains complete. */
async function drainMicrotasks(n = 4): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve();
}
import { Temporal } from '@js-temporal/polyfill';
import { CalendarBuilder } from './calendar-builder';
import { SET_VISIBLE_RANGE } from './calendar-builder-internals';
import type { CalendarEvent, ViewWindow } from '../core';
import { zdt } from '../__test-utils__/event-fixtures';

// ─── Test fixtures ──────────────────────────────────────────────

const evt = (id: string, hour = 10): CalendarEvent => ({
  id,
  start: zdt(`2026-06-05T${String(hour).padStart(2, '0')}:00:00`),
});

const window = (
  start = '2026-06-01',
  end = '2026-07-01',
  view: 'month' | 'week' | 'day' | 'agenda' = 'month',
  timezone = 'Europe/Vienna',
): ViewWindow => ({ view, start, end, timezone });

// ─── Setter chain + defaults ────────────────────────────────────

describe('CalendarBuilder construction', () => {
  it('returns a fresh builder with sensible C5 / C4 defaults', () => {
    const b = CalendarBuilder.create();
    expect(toValue(b.state.dstPolicy)).toBe('compatible');
    expect(typeof toValue(b.state.timezone)).toBe('string'); // browser zone
    expect(toValue(b.state.locale)).toBe('en-US');
    expect(b.state.view.value).toBe('month');
    expect(b.state.date.value).toBeInstanceOf(Temporal.PlainDate);
  });

  it('every setter returns `this` for chaining', () => {
    const b = CalendarBuilder.create();
    const result = b
      .events(ref<CalendarEvent[]>([]))
      .timezone('Europe/Vienna')
      .locale('de-AT')
      .firstDayOfWeek(1)
      .density('compact')
      .dateStyle('long')
      .timeStyle('short')
      .hour12(false)
      .dstPolicy('reject')
      .view('week')
      .availableViews(['day', 'week'])
      .date(Temporal.PlainDate.from('2026-06-15'))
      .timeRange({ startMinutes: 6 * 60, endMinutes: 22 * 60 })
      .slotDuration(15)
      .pixelsPerHour(64)
      .maxEventsPerCell(5)
      .agendaLengthDays(7)
      .showEmptyDays(true)
      .canDrop(() => true)
      .eventRenderer(() => null as never)
      .dayHeaderRenderer(() => null as never)
      .onEventClick(() => {})
      .onEventDoubleClick(() => {})
      .onEventDrop(() => {})
      .onDateClick(() => {})
      .onTimeClick(() => {})
      .onMoreClick(() => {})
      .onRangeChange(() => {});
    expect(result).toBe(b);
  });
});

// ─── C7 — reactive reads, no setup-capture ──────────────────────

describe('C7 — reactive reads', () => {
  it('toValue(state.timezone) returns fresh value after mutation', () => {
    const b = CalendarBuilder.create();
    b.timezone('Europe/Vienna');
    expect(toValue(b.state.timezone)).toBe('Europe/Vienna');
    b.timezone('America/Los_Angeles');
    expect(toValue(b.state.timezone)).toBe('America/Los_Angeles');
  });

  it('Ref-typed setter updates when the consumer mutates the Ref', () => {
    const b = CalendarBuilder.create();
    const tz = ref('Europe/Vienna');
    b.timezone(tz);
    expect(toValue(b.state.timezone)).toBe('Europe/Vienna');
    tz.value = 'Asia/Tokyo';
    expect(toValue(b.state.timezone)).toBe('Asia/Tokyo');
  });

  it('Getter-typed setter updates when its source changes', () => {
    const b = CalendarBuilder.create();
    const source = ref('en-US');
    b.locale(() => source.value.toLowerCase());
    expect(toValue(b.state.locale)).toBe('en-us');
    source.value = 'de-AT';
    expect(toValue(b.state.locale)).toBe('de-at');
  });
});

describe('D4 — canDrop reads fresh state on every invocation', () => {
  it('replacing canDrop mid-flight takes effect immediately', () => {
    const b = CalendarBuilder.create();
    b.canDrop(() => true);
    expect(b.state.canDrop?.(evt('a'), { date: '2026-06-05', minutes: 600 })).toBe(true);
    // Replace and re-invoke through the same state slot — composables
    // do exactly this via `state.value.canDrop?.(...)` per hit-test.
    b.canDrop(() => false);
    expect(b.state.canDrop?.(evt('a'), { date: '2026-06-05', minutes: 600 })).toBe(false);
  });
});

// ─── Mutual exclusion: events ⊕ eventsLoader ────────────────────

describe('events() and eventsLoader() are mutually exclusive', () => {
  it('events() clears the loader and the cache', async () => {
    const b = CalendarBuilder.create();
    const loader = vi.fn().mockResolvedValue([evt('x')]);
    b.eventsLoader(loader);
    b[SET_VISIBLE_RANGE](window());
    await new Promise((r) => setTimeout(r, 80)); // past 50ms debounce + flush
    expect(loader).toHaveBeenCalledTimes(1);
    expect(b._debug_cacheKeys()).toHaveLength(1);

    b.events(ref([evt('a')]));
    expect(b.state.eventsLoader).toBeNull();
    expect(b._debug_cacheKeys()).toHaveLength(0); // cache dropped
  });

  it('eventsLoader() clears the events source', () => {
    const b = CalendarBuilder.create();
    const events = ref([evt('a')]);
    b.events(events);
    expect(b.state.events).toBe(events);
    b.eventsLoader(async () => []);
    expect(b.state.events).toBeNull();
  });
});

// ─── Loader cache & debounce ────────────────────────────────────

describe('Loader cache + debounce + loading counter', () => {
  it('cache hit on second visit to the same window — loader called once', async () => {
    const b = CalendarBuilder.create();
    const loader = vi.fn().mockResolvedValue([evt('x')]);
    b.eventsLoader(loader);
    b[SET_VISIBLE_RANGE](window());
    await new Promise((r) => setTimeout(r, 80));
    expect(loader).toHaveBeenCalledTimes(1);
    // Re-set to the SAME window — windowsEqual short-circuits, no new call.
    b[SET_VISIBLE_RANGE](window());
    await new Promise((r) => setTimeout(r, 80));
    expect(loader).toHaveBeenCalledTimes(1);
    // Different window → cache miss → new call.
    b[SET_VISIBLE_RANGE](window('2026-07-01', '2026-08-01'));
    await new Promise((r) => setTimeout(r, 80));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('cache key includes timezone — same dates in different zones miss the cache', async () => {
    const b = CalendarBuilder.create();
    const loader = vi.fn().mockResolvedValue([]);
    b.eventsLoader(loader);
    b[SET_VISIBLE_RANGE](window('2026-06-01', '2026-07-01', 'month', 'Europe/Vienna'));
    await new Promise((r) => setTimeout(r, 80));
    b[SET_VISIBLE_RANGE](window('2026-06-01', '2026-07-01', 'month', 'America/Los_Angeles'));
    await new Promise((r) => setTimeout(r, 80));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('debounce: rapid window changes within 50ms collapse to one call', async () => {
    const b = CalendarBuilder.create();
    const loader = vi.fn().mockResolvedValue([]);
    b.eventsLoader(loader);
    b[SET_VISIBLE_RANGE](window('2026-06-01', '2026-07-01'));
    b[SET_VISIBLE_RANGE](window('2026-07-01', '2026-08-01'));
    b[SET_VISIBLE_RANGE](window('2026-08-01', '2026-09-01'));
    // None fired yet (debounce window).
    expect(loader).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 80));
    // Only the LAST window's loader call fires.
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader.mock.calls[0][0].start).toBe('2026-08-01');
  });

  it('loading flag is true while loader runs, false after settle', async () => {
    const b = CalendarBuilder.create();
    let resolve!: (events: CalendarEvent[]) => void;
    b.eventsLoader(
      () =>
        new Promise<CalendarEvent[]>((r) => {
          resolve = r;
        }),
    );
    b[SET_VISIBLE_RANGE](window());
    await new Promise((r) => setTimeout(r, 80)); // past debounce
    expect(b.api.loading.value).toBe(true);
    expect(b._debug_inFlight()).toBe(1);
    resolve([]);
    await drainMicrotasks();
    expect(b.api.loading.value).toBe(false);
    expect(b._debug_inFlight()).toBe(0);
  });

  it('refresh() invalidates the cache and re-fetches the current window', async () => {
    const b = CalendarBuilder.create();
    const loader = vi.fn().mockResolvedValue([evt('x')]);
    b.eventsLoader(loader);
    b[SET_VISIBLE_RANGE](window());
    await new Promise((r) => setTimeout(r, 80));
    expect(loader).toHaveBeenCalledTimes(1);
    b.api.refresh();
    expect(b._debug_cacheKeys()).toHaveLength(0);
    await new Promise((r) => setTimeout(r, 80));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('refreshRange invalidates only intersecting cache entries', async () => {
    const b = CalendarBuilder.create();
    const loader = vi.fn().mockResolvedValue([]);
    b.eventsLoader(loader);
    // Populate cache with two non-overlapping windows.
    b[SET_VISIBLE_RANGE](window('2026-06-01', '2026-07-01'));
    await new Promise((r) => setTimeout(r, 80));
    b[SET_VISIBLE_RANGE](window('2026-08-01', '2026-09-01'));
    await new Promise((r) => setTimeout(r, 80));
    expect(b._debug_cacheKeys()).toHaveLength(2);

    // Invalidate only July overlap → June window is killed, August stays.
    b.api.refreshRange(window('2026-06-15', '2026-07-15'));
    const keysAfter = b._debug_cacheKeys();
    expect(keysAfter.some((k) => k.includes('2026-06-01'))).toBe(false);
    expect(keysAfter.some((k) => k.includes('2026-08-01'))).toBe(true);
  });

  it('generation counter discards stale loader results after refresh', async () => {
    const b = CalendarBuilder.create();
    let resolveSlow!: (events: CalendarEvent[]) => void;
    b.eventsLoader(
      () =>
        new Promise<CalendarEvent[]>((r) => {
          resolveSlow = r;
        }),
    );
    b[SET_VISIBLE_RANGE](window());
    await new Promise((r) => setTimeout(r, 80));
    // refresh() bumps generation; the in-flight loader's resolution
    // must NOT poison the cache.
    b.api.refresh();
    resolveSlow([evt('stale')]);
    await drainMicrotasks();
    expect(b._debug_cacheKeys()).toHaveLength(0);
  });

  it('loader rejection is logged but NOT cached (next visit retries)', async () => {
    const b = CalendarBuilder.create();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce([evt('ok')]);
    b.eventsLoader(loader);
    b[SET_VISIBLE_RANGE](window());
    await new Promise((r) => setTimeout(r, 80));
    await drainMicrotasks();
    expect(errorSpy).toHaveBeenCalled();
    expect(b._debug_cacheKeys()).toHaveLength(0); // no error caching
    // Re-trigger via refreshRange of the SAME window → re-fetches.
    b[SET_VISIBLE_RANGE](window('2026-06-02', '2026-07-02')); // different window
    b[SET_VISIBLE_RANGE](window()); // back to original — cache miss → re-fetch
    await new Promise((r) => setTimeout(r, 80));
    expect(loader).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });
});

// ─── Navigation: refs / values / getters ────────────────────────

describe('Navigation setters', () => {
  it('view() with a plain value wraps into an internal ref', () => {
    const b = CalendarBuilder.create();
    b.view('week');
    expect(b.state.view.value).toBe('week');
    b.api.setView('day');
    expect(b.state.view.value).toBe('day');
  });

  it('view() with an external Ref keeps two-way binding', () => {
    const b = CalendarBuilder.create();
    const v = ref<'month' | 'week' | 'day' | 'agenda'>('month');
    b.view(v);
    b.api.setView('week');
    expect(v.value).toBe('week'); // builder wrote back to the consumer ref
    v.value = 'day';
    expect(b.state.view.value).toBe('day'); // consumer write reflects in state
  });

  it('view() with a getter throws (read-only inputs forbidden for nav)', () => {
    const b = CalendarBuilder.create();
    expect(() => b.view((() => 'week') as never)).toThrow(/getter|read-only|writable|Ref/i);
  });

  it('date() supports the same Ref / value / getter contract', () => {
    const b = CalendarBuilder.create();
    const d = ref(Temporal.PlainDate.from('2026-06-01'));
    b.date(d);
    b.api.goTo(Temporal.PlainDate.from('2026-07-01'));
    expect(d.value.toString()).toBe('2026-07-01');
    expect(() => b.date((() => Temporal.PlainDate.from('2026-08-01')) as never)).toThrow();
  });

  it('next() / prev() shift cursor by view-appropriate granularity', () => {
    const b = CalendarBuilder.create();
    b.view('week').date(Temporal.PlainDate.from('2026-06-15'));
    b.api.next();
    expect(b.state.date.value.toString()).toBe('2026-06-22');
    b.api.prev();
    b.api.prev();
    expect(b.state.date.value.toString()).toBe('2026-06-08');
  });

  it('goToToday() uses the current display zone', () => {
    const b = CalendarBuilder.create();
    b.timezone('UTC');
    b.api.goToToday();
    expect(b.state.date.value.toString()).toBe(
      Temporal.Now.plainDateISO('UTC').toString(),
    );
  });
});

// ─── _setVisibleRange contract ──────────────────────────────────

describe('_setVisibleRange contract', () => {
  it('skips redundant onRangeChange fires for identical windows', () => {
    const b = CalendarBuilder.create();
    const handler = vi.fn();
    b.onRangeChange(handler);
    const w = window();
    b[SET_VISIBLE_RANGE](w);
    b[SET_VISIBLE_RANGE](w);
    b[SET_VISIBLE_RANGE]({ ...w }); // shallow-equal but new object
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('updates api.visibleRange and api.getVisibleRange()', () => {
    const b = CalendarBuilder.create();
    expect(b.api.visibleRange.value).toBeNull();
    expect(b.api.getVisibleRange()).toBeNull();
    const w = window();
    b[SET_VISIBLE_RANGE](w);
    expect(b.api.visibleRange.value).toEqual(w);
    expect(b.api.getVisibleRange()).toEqual(w);
  });

  it('a thrown onRangeChange does not corrupt internal state', () => {
    const b = CalendarBuilder.create();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    b.onRangeChange(() => {
      throw new Error('consumer bug');
    });
    const w = window();
    b[SET_VISIBLE_RANGE](w);
    expect(b.api.visibleRange.value).toEqual(w);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

// ─── getVisibleEvents() ─────────────────────────────────────────

describe('getVisibleEvents', () => {
  it('returns the events source when in events() mode', () => {
    const b = CalendarBuilder.create();
    const events = ref([evt('a'), evt('b', 14)]);
    b.events(events);
    expect(b.api.getVisibleEvents()).toHaveLength(2);
  });

  it('returns cached events for the current window in loader mode', async () => {
    const b = CalendarBuilder.create();
    b.eventsLoader(async () => [evt('x'), evt('y', 12)]);
    b[SET_VISIBLE_RANGE](window());
    await new Promise((r) => setTimeout(r, 80));
    await drainMicrotasks();
    expect(b.api.getVisibleEvents()).toHaveLength(2);
  });

  it('returns [] before first cache populate (loader mode)', () => {
    const b = CalendarBuilder.create();
    b.eventsLoader(async () => [evt('x')]);
    b[SET_VISIBLE_RANGE](window());
    expect(b.api.getVisibleEvents()).toEqual([]);
  });
});
