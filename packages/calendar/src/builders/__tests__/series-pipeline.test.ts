/**
 * Phase 4 §A8 — `series()` / `seriesLoader()` builder integration.
 *
 * Tests the full visible-window pipeline:
 *   - reactive `series()` source: re-expansion on visible-range
 *     change OR on source mutation
 *   - `seriesLoader()`: per-window cache, fetched on visible-range
 *     change
 *   - mutual exclusivity (series vs seriesLoader)
 *   - composition with `events()` / `eventsLoader()` (merged output)
 *   - `recurrenceEngine()` swap invalidates cache
 *   - `dstPolicy` change invalidates cache
 *   - `refresh()` / `refreshRange()` invalidate series cache
 *   - `loading` flag accounts for series expansion
 */

import { describe, expect, it } from 'vitest';
import { ref, nextTick } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { useCalendar } from '../../useCalendar';
import { SET_VISIBLE_RANGE } from '../calendar-builder-internals';
import type { ViewWindow } from '../../core';
import type {
  CalendarEvent,
  RecurringSeries,
} from '../../core/types';
import { getRecurrenceMeta } from '../../recurrence';
import type { RecurrenceEngine } from '../../recurrence/types';

// Helpers ─────────────────────────────────────────────────────────

const VIENNA_WINDOW: ViewWindow = {
  view: 'month',
  start: '2026-06-01',
  end: '2026-07-01',
  timezone: 'Europe/Vienna',
};

function makeWeeklySeries(id = 'standup'): RecurringSeries {
  return {
    id,
    rrule: 'FREQ=WEEKLY;BYDAY=MO',
    dtstart: Temporal.ZonedDateTime.from(
      '2026-06-01T09:00:00[Europe/Vienna]',
    ),
    duration: { minutes: 30 },
  };
}

/**
 * Wait for: microtasks, macrotasks, the eventsLoader's 50ms debounce,
 * and the engine's dynamic-import lazy load. The series-expansion
 * pipeline can chain several async hops; we wait long enough that
 * all of them settle.
 */
async function flushAsync(): Promise<void> {
  // Extra-long round to outlast the 50ms eventsLoader debounce.
  await new Promise((r) => setTimeout(r, 80));
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  }
}

// ─── series() reactive source ─────────────────────────────────────

describe('builder.series() reactive source', () => {
  it('expands occurrences when visible range is set', async () => {
    const { builder, api } = useCalendar();
    builder.series([makeWeeklySeries()]);
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    const events = api.getVisibleEvents();
    // Mondays Jun 1, 8, 15, 22, 29 → 5 occurrences
    expect(events.length).toBe(5);
    for (const ev of events) {
      expect(ev.id.startsWith('standup__')).toBe(true);
      expect(getRecurrenceMeta(ev)?.seriesId).toBe('standup');
      expect(ev.start).toBeInstanceOf(Temporal.ZonedDateTime);
    }
  });

  it('every expanded event carries provenance meta', async () => {
    const { builder, api } = useCalendar();
    builder.series([makeWeeklySeries()]);
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    const events = api.getVisibleEvents();
    for (const ev of events) {
      const meta = getRecurrenceMeta(ev);
      expect(meta).not.toBeNull();
      expect(meta!.seriesId).toBe('standup');
      expect(meta!.source).toBe('rrule');
    }
  });

  it('re-expands when the reactive source mutates', async () => {
    const { builder, api } = useCalendar();
    const seriesRef = ref<RecurringSeries[]>([makeWeeklySeries('a')]);
    builder.series(seriesRef);
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    expect(api.getVisibleEvents().length).toBe(5);

    // Add a second series — should trigger re-expansion via watcher.
    seriesRef.value = [makeWeeklySeries('a'), makeWeeklySeries('b')];
    await nextTick();
    await flushAsync();
    expect(api.getVisibleEvents().length).toBe(10);
  });

  it('clears expansion when source becomes empty', async () => {
    const { builder, api } = useCalendar();
    const seriesRef = ref<RecurringSeries[]>([makeWeeklySeries()]);
    builder.series(seriesRef);
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    expect(api.getVisibleEvents().length).toBe(5);

    seriesRef.value = [];
    await nextTick();
    await flushAsync();
    expect(api.getVisibleEvents().length).toBe(0);
  });
});

// ─── seriesLoader() ────────────────────────────────────────────────

describe('builder.seriesLoader()', () => {
  it('expands via the loader on visible range change', async () => {
    const { builder, api } = useCalendar();
    let calls = 0;
    builder.seriesLoader(async () => {
      calls += 1;
      return [makeWeeklySeries()];
    });
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    expect(calls).toBe(1);
    expect(api.getVisibleEvents().length).toBe(5);
  });

  it('caches per-window — same window does not re-fetch', async () => {
    const { builder } = useCalendar();
    let calls = 0;
    builder.seriesLoader(async () => {
      calls += 1;
      return [makeWeeklySeries()];
    });
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW); // same window — should be no-op
    await flushAsync();
    expect(calls).toBe(1);
  });

  it('refresh() invalidates the cache and re-fetches', async () => {
    const { builder, api } = useCalendar();
    let calls = 0;
    builder.seriesLoader(async () => {
      calls += 1;
      return [makeWeeklySeries()];
    });
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    expect(calls).toBe(1);
    api.refresh();
    await flushAsync();
    expect(calls).toBe(2);
  });
});

// ─── Mutual exclusivity ────────────────────────────────────────────

describe('series() / seriesLoader() mutual exclusivity', () => {
  it('series() clears a previously-set seriesLoader', () => {
    const { builder } = useCalendar();
    builder.seriesLoader(async () => []);
    builder.series([]);
    expect(builder.state.seriesLoader).toBeNull();
    expect(builder.state.series).not.toBeNull();
  });

  it('seriesLoader() clears a previously-set series', () => {
    const { builder } = useCalendar();
    builder.series([]);
    builder.seriesLoader(async () => []);
    expect(builder.state.series).toBeNull();
    expect(builder.state.seriesLoader).not.toBeNull();
  });
});

// ─── Composition with events() / eventsLoader() ────────────────────

describe('series + events composition', () => {
  it('getVisibleEvents merges non-recurring + recurring', async () => {
    const { builder, api } = useCalendar();
    const oneOff: CalendarEvent = {
      id: 'one-off',
      start: Temporal.ZonedDateTime.from(
        '2026-06-15T14:00:00[Europe/Vienna]',
      ),
    };
    builder.events([oneOff]);
    builder.series([makeWeeklySeries()]);
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    const events = api.getVisibleEvents();
    // 5 weekly occurrences + 1 one-off = 6
    expect(events.length).toBe(6);
    expect(events.some((e) => e.id === 'one-off')).toBe(true);
    expect(events.some((e) => e.id.startsWith('standup__'))).toBe(true);
  });

  it('recurring composes with eventsLoader output', async () => {
    const { builder, api } = useCalendar();
    builder.eventsLoader(async () => [
      {
        id: 'loaded-one-off',
        start: Temporal.ZonedDateTime.from(
          '2026-06-10T14:00:00[Europe/Vienna]',
        ),
      },
    ]);
    builder.series([makeWeeklySeries()]);
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    const events = api.getVisibleEvents();
    expect(events.length).toBe(6);
  });
});

// ─── recurrenceEngine swap ─────────────────────────────────────────

describe('builder.recurrenceEngine() swap invalidates series cache', () => {
  it('changing engine forces re-expansion', async () => {
    const { builder, api } = useCalendar();
    let engineACalls = 0;
    let engineBCalls = 0;

    const engineA: RecurrenceEngine = {
      expand: async (req) => {
        engineACalls += 1;
        return {
          results: req.series.map((s) => ({
            seriesId: s.seriesId,
            kind: 'timed' as const,
            timestamps: new Float64Array(0),
            seriesTzid: 'Europe/Vienna',
            origins: new Uint8Array(0),
          })),
          errors: [],
        };
      },
    };
    const engineB: RecurrenceEngine = {
      expand: async (req) => {
        engineBCalls += 1;
        return {
          results: req.series.map((s) => ({
            seriesId: s.seriesId,
            kind: 'timed' as const,
            timestamps: new Float64Array(0),
            seriesTzid: 'Europe/Vienna',
            origins: new Uint8Array(0),
          })),
          errors: [],
        };
      },
    };

    builder.recurrenceEngine(engineA);
    builder.series([makeWeeklySeries()]);
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    expect(engineACalls).toBe(1);

    builder.recurrenceEngine(engineB);
    await flushAsync();
    expect(engineBCalls).toBe(1);

    void api; // appease unused
  });
});

// ─── dstPolicy change ─────────────────────────────────────────────

describe('dstPolicy change invalidates series cache', () => {
  it('changing dstPolicy re-expands', async () => {
    const { builder, api } = useCalendar();
    let calls = 0;
    const trackingEngine: RecurrenceEngine = {
      expand: async (req) => {
        calls += 1;
        return {
          results: req.series.map((s) => ({
            seriesId: s.seriesId,
            kind: 'timed' as const,
            timestamps: new Float64Array(0),
            seriesTzid: 'Europe/Vienna',
            origins: new Uint8Array(0),
          })),
          errors: [],
        };
      },
    };
    builder.recurrenceEngine(trackingEngine);
    builder.series([makeWeeklySeries()]);
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    const initialCalls = calls;
    expect(initialCalls).toBeGreaterThan(0);

    builder.dstPolicy('reject');
    await nextTick();
    await flushAsync();
    expect(calls).toBeGreaterThan(initialCalls);
    void api;
  });
});

// ─── refresh / refreshRange ───────────────────────────────────────

describe('refresh / refreshRange invalidate series cache', () => {
  it('api.refresh() invalidates and re-fetches series', async () => {
    const { builder, api } = useCalendar();
    let calls = 0;
    builder.seriesLoader(async () => {
      calls += 1;
      return [makeWeeklySeries()];
    });
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    expect(calls).toBe(1);

    api.refresh();
    await flushAsync();
    expect(calls).toBe(2);
  });

  it('api.refreshRange(window) invalidates intersecting cache entries', async () => {
    const { builder, api } = useCalendar();
    let calls = 0;
    builder.seriesLoader(async () => {
      calls += 1;
      return [makeWeeklySeries()];
    });
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    await flushAsync();
    expect(calls).toBe(1);

    api.refreshRange(VIENNA_WINDOW);
    await flushAsync();
    expect(calls).toBe(2);
  });
});

// ─── loading flag ─────────────────────────────────────────────────

describe('loading flag accounts for series expansion', () => {
  it('flips true on expansion start, back to false on completion', async () => {
    const { builder, api } = useCalendar();

    // Synchronous (immediate-resolve) engine so we can observe the
    // loading flag without async-flush timing nuances.
    builder.recurrenceEngine({
      expand: async () => ({ results: [], errors: [] }),
    });
    builder.series([makeWeeklySeries()]);

    expect(api.loading.value).toBe(false);
    builder[SET_VISIBLE_RANGE](VIENNA_WINDOW);
    // Loading flag set synchronously by _runSeriesExpansion.
    expect(api.loading.value).toBe(true);
    // After flush, the chain completes and loading flips back.
    await flushAsync();
    expect(api.loading.value).toBe(false);
  });
});
