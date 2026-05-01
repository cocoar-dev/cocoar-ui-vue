/**
 * Tests for `core/eventIndex.ts`.
 *
 * The index is backbone of every view: incorrect bucketing means
 * events disappear or render on the wrong day. Property tests here
 * are aggressive — every public op gets cross-checked against a
 * slow reference implementation.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { EventIndex, type IndexInvalidation } from '../eventIndex';
import type { CalendarEvent, ViewWindow } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────

function event(
  id: string,
  start: string,
  end?: string,
  allDay?: boolean,
): CalendarEvent {
  return { id, start, end, allDay };
}

// ─── Specific cases ─────────────────────────────────────────────────

describe('EventIndex — single-day events', () => {
  it('all-day event lands on its date', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13'));
    expect(idx.byDay('2026-04-13').map((e) => e.id)).toEqual(['a']);
    expect(idx.byDay('2026-04-12').length).toBe(0);
    expect(idx.byDay('2026-04-14').length).toBe(0);
  });

  it('timed event in UTC lands on its UTC date', () => {
    const idx = new EventIndex({ timezone: 'UTC' });
    idx.insert(event('a', '2026-04-13T09:00:00Z'));
    expect(idx.byDay('2026-04-13').map((e) => e.id)).toEqual(['a']);
  });

  it('timed event without end occupies just the start day', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13T09:00:00'));
    expect(idx.byDay('2026-04-13').length).toBe(1);
    expect(idx.byDay('2026-04-14').length).toBe(0);
  });
});

describe('EventIndex — multi-day events (flyweight)', () => {
  it('all-day spanning Apr 13–15 (exclusive end Apr 16) is in 13/14/15', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13', '2026-04-16'));
    expect(idx.byDay('2026-04-13').length).toBe(1);
    expect(idx.byDay('2026-04-14').length).toBe(1);
    expect(idx.byDay('2026-04-15').length).toBe(1);
    expect(idx.byDay('2026-04-16').length).toBe(0);
  });

  it('the same event reference is stored in each bucket (flyweight)', () => {
    const idx = new EventIndex();
    const ev = event('a', '2026-04-13', '2026-04-15');
    idx.insert(ev);
    expect(idx.byDay('2026-04-13')[0]).toBe(idx.byDay('2026-04-14')[0]);
  });

  it('timed event ending exactly at midnight is exclusive', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13T09:00:00', '2026-04-14T00:00:00'));
    expect(idx.byDay('2026-04-13').length).toBe(1);
    expect(idx.byDay('2026-04-14').length).toBe(0);
  });

  it('timed event ending after midnight occupies both days', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13T22:00:00', '2026-04-14T03:00:00'));
    expect(idx.byDay('2026-04-13').length).toBe(1);
    expect(idx.byDay('2026-04-14').length).toBe(1);
  });
});

describe('EventIndex — update / remove', () => {
  it('update replaces the event in its old + new buckets', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13'));
    expect(idx.byDay('2026-04-13').length).toBe(1);
    idx.update(event('a', '2026-04-15'));
    expect(idx.byDay('2026-04-13').length).toBe(0);
    expect(idx.byDay('2026-04-15').length).toBe(1);
  });

  it('remove drops all bucket entries', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13', '2026-04-16'));
    idx.remove('a');
    expect(idx.byDay('2026-04-13').length).toBe(0);
    expect(idx.byDay('2026-04-14').length).toBe(0);
    expect(idx.byDay('2026-04-15').length).toBe(0);
    expect(idx.size).toBe(0);
  });

  it('remove unknown id is a no-op (does not throw)', () => {
    const idx = new EventIndex();
    idx.remove('does-not-exist');
    expect(idx.size).toBe(0);
  });

  it('clear empties everything', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13'));
    idx.insert(event('b', '2026-04-14'));
    idx.clear();
    expect(idx.size).toBe(0);
    expect(idx.byDay('2026-04-13').length).toBe(0);
  });

  it('replaceAll bulk-rebuilds from a fresh array', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13'));
    idx.replaceAll([event('b', '2026-04-14'), event('c', '2026-04-15')]);
    expect(idx.size).toBe(2);
    expect(idx.byDay('2026-04-13').length).toBe(0);
    expect(idx.byDay('2026-04-14').map((e) => e.id)).toEqual(['b']);
    expect(idx.byDay('2026-04-15').map((e) => e.id)).toEqual(['c']);
  });
});

// ─── byRange ────────────────────────────────────────────────────────

describe('EventIndex — byRange', () => {
  const window: ViewWindow = {
    view: 'week',
    start: '2026-04-13',
    end: '2026-04-20',
  };

  it('returns events that intersect the window', () => {
    const idx = new EventIndex();
    idx.insert(event('a', '2026-04-13')); // inside
    idx.insert(event('b', '2026-04-19')); // last included day
    idx.insert(event('c', '2026-04-20')); // first excluded day
    idx.insert(event('d', '2026-04-12')); // before window
    const ids = idx.byRange(window).map((e) => e.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('multi-day event appears once even when spanning many in-window days', () => {
    const idx = new EventIndex();
    idx.insert(event('all-week', '2026-04-13', '2026-04-20')); // covers all 7 days
    const out = idx.byRange(window);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe('all-week');
  });

  it('multi-day event partially intersecting the start of the window appears', () => {
    const idx = new EventIndex();
    idx.insert(event('crosses', '2026-04-10', '2026-04-15'));
    expect(idx.byRange(window).map((e) => e.id)).toContain('crosses');
  });
});

// ─── Listeners ──────────────────────────────────────────────────────

describe('EventIndex — listeners', () => {
  it('insert emits a series invalidation', () => {
    const idx = new EventIndex();
    const seen: IndexInvalidation[] = [];
    idx.subscribe((inv) => seen.push(inv));
    idx.insert(event('a', '2026-04-13'));
    expect(seen).toEqual([{ kind: 'series', seriesId: 'a' }]);
  });

  it('remove emits a series invalidation', () => {
    const idx = new EventIndex();
    const seen: IndexInvalidation[] = [];
    idx.insert(event('a', '2026-04-13'));
    idx.subscribe((inv) => seen.push(inv));
    idx.remove('a');
    expect(seen).toEqual([{ kind: 'series', seriesId: 'a' }]);
  });

  it('clear / replaceAll emit a single all invalidation', () => {
    const idx = new EventIndex();
    const seen: IndexInvalidation[] = [];
    idx.subscribe((inv) => seen.push(inv));
    idx.replaceAll([event('a', '2026-04-13'), event('b', '2026-04-14')]);
    expect(seen).toEqual([{ kind: 'all' }]);
    seen.length = 0;
    idx.clear();
    expect(seen).toEqual([{ kind: 'all' }]);
  });

  it('unsubscribe stops further notifications', () => {
    const idx = new EventIndex();
    const listener = vi.fn();
    const unsub = idx.subscribe(listener);
    idx.insert(event('a', '2026-04-13'));
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    idx.insert(event('b', '2026-04-14'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('throwing listener does not break siblings', () => {
    const idx = new EventIndex();
    const a = vi.fn(() => { throw new Error('boom'); });
    const b = vi.fn();
    idx.subscribe(a);
    idx.subscribe(b);
    idx.insert(event('e', '2026-04-13'));
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });
});

// ─── Property tests ─────────────────────────────────────────────────

const dateArb = fc.integer({ min: 0, max: 365 * 5 }).map((n) => {
  const d = new Date(Date.UTC(2024, 0, 1 + n));
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
});

const allDayEventArb = fc
  .tuple(fc.integer({ min: 0, max: 1_000_000 }), dateArb, fc.integer({ min: 0, max: 10 }))
  .map(([n, start, span]): CalendarEvent => {
    const startD = new Date(start + 'T00:00:00Z');
    const endD = new Date(startD.getTime() + (span + 1) * 86400_000);
    return {
      id: `e-${n}`,
      start,
      end: endD.toISOString().slice(0, 10),
    };
  });

describe('EventIndex — properties', () => {
  it('every event is in exactly one bucket per day-of-span', () => {
    fc.assert(
      fc.property(fc.array(allDayEventArb, { maxLength: 30 }), (events) => {
        const idx = new EventIndex();
        // De-duplicate by id.
        const byId = new Map<string, CalendarEvent>();
        for (const e of events) byId.set(e.id, e);
        for (const e of byId.values()) idx.insert(e);

        for (const e of byId.values()) {
          const start = new Date(e.start + 'T00:00:00Z');
          const end = new Date((e.end as string) + 'T00:00:00Z');
          for (let t = start.getTime(); t < end.getTime(); t += 86400_000) {
            const key = new Date(t).toISOString().slice(0, 10);
            const bucket = idx.byDay(key);
            expect(bucket.some((b) => b.id === e.id)).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('byRange returns each event at most once', () => {
    fc.assert(
      fc.property(
        fc.array(allDayEventArb, { maxLength: 50 }),
        dateArb,
        fc.integer({ min: 1, max: 60 }),
        (events, startKey, lengthDays) => {
          const idx = new EventIndex();
          const byId = new Map<string, CalendarEvent>();
          for (const e of events) byId.set(e.id, e);
          for (const e of byId.values()) idx.insert(e);

          const startD = new Date(startKey + 'T00:00:00Z');
          const endD = new Date(startD.getTime() + lengthDays * 86400_000);
          const window: ViewWindow = {
            view: 'agenda',
            start: startKey,
            end: endD.toISOString().slice(0, 10),
          };
          const out = idx.byRange(window);
          const ids = new Set(out.map((e) => e.id));
          expect(ids.size).toBe(out.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('size matches the number of distinct ids inserted', () => {
    fc.assert(
      fc.property(fc.array(allDayEventArb, { maxLength: 50 }), (events) => {
        const idx = new EventIndex();
        const byId = new Map<string, CalendarEvent>();
        for (const e of events) byId.set(e.id, e);
        for (const e of byId.values()) idx.insert(e);
        expect(idx.size).toBe(byId.size);
      }),
      { numRuns: 100 },
    );
  });
});
