/**
 * Tests for `core/agendaLayout.ts`.
 *
 * The agenda's ordering is the contract: chronological day groups,
 * each headed by a header item, with all-day events first then
 * timed events sorted by start within the day. Property tests prove
 * the order invariants over arbitrary inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildAgendaItems, type AgendaItem } from '../agendaLayout';
import type { CalendarEvent } from '../types';
import { pd, zdt } from '../../__test-utils__/event-fixtures';

function evTimed(id: string, start: string, end?: string): CalendarEvent {
  return { id, start: zdt(start), end: end ? zdt(end) : undefined };
}
function evAllDay(id: string, start: string, end?: string): CalendarEvent {
  return { id, start: pd(start), end: end ? pd(end) : undefined };
}

const RANGE = {
  rangeStart: '2026-04-13',
  rangeEnd: '2026-04-20', // exclusive — Mon-Sun
  timezone: 'UTC',
};

// ─── Specific cases ────────────────────────────────────────────────

describe('buildAgendaItems — basic shape', () => {
  it('empty events + showEmptyDays false → empty', () => {
    expect(buildAgendaItems([], RANGE)).toEqual([]);
  });

  it('empty events + showEmptyDays true → 7 headers, no events', () => {
    const items = buildAgendaItems([], { ...RANGE, showEmptyDays: true });
    expect(items.length).toBe(7);
    expect(items.every((i) => i.kind === 'header')).toBe(true);
    expect((items[0] as AgendaItem & { isEmpty: boolean }).isEmpty).toBe(true);
  });

  it('range with start >= end is empty', () => {
    expect(
      buildAgendaItems([evAllDay('a', '2026-04-13')], {
        ...RANGE,
        rangeStart: '2026-04-15',
        rangeEnd: '2026-04-15',
      }),
    ).toEqual([]);
  });
});

describe('buildAgendaItems — single-day events', () => {
  it('header followed by event row', () => {
    const items = buildAgendaItems([evAllDay('a', '2026-04-15')], RANGE);
    expect(items.length).toBe(2);
    expect(items[0]).toMatchObject({ kind: 'header', date: '2026-04-15', isEmpty: false });
    expect(items[1]).toMatchObject({ kind: 'event', date: '2026-04-15' });
    expect((items[1] as AgendaItem & { event: CalendarEvent }).event.id).toBe('a');
  });

  it('all-day event before timed event on the same day', () => {
    const items = buildAgendaItems(
      [
        evTimed('timed', '2026-04-15T09:00:00'),
        evAllDay('allday', '2026-04-15'),
      ],
      RANGE,
    );
    expect(items.length).toBe(3);
    const eventRows = items.filter((i) => i.kind === 'event') as Array<
      AgendaItem & { event: CalendarEvent }
    >;
    expect(eventRows[0].event.id).toBe('allday');
    expect(eventRows[1].event.id).toBe('timed');
  });

  it('timed events sorted by start within a day', () => {
    const items = buildAgendaItems(
      [
        evTimed('late', '2026-04-15T15:00:00'),
        evTimed('mid', '2026-04-15T12:00:00'),
        evTimed('early', '2026-04-15T09:00:00'),
      ],
      RANGE,
    );
    const eventRows = items.filter((i) => i.kind === 'event') as Array<
      AgendaItem & { event: CalendarEvent }
    >;
    expect(eventRows.map((r) => r.event.id)).toEqual(['early', 'mid', 'late']);
  });

  it('day groups are chronological', () => {
    const items = buildAgendaItems(
      [
        evTimed('thu', '2026-04-16T09:00:00'),
        evTimed('mon', '2026-04-13T09:00:00'),
        evTimed('wed', '2026-04-15T09:00:00'),
      ],
      RANGE,
    );
    const headers = items.filter((i) => i.kind === 'header') as Array<
      AgendaItem & { date: string }
    >;
    expect(headers.map((h) => h.date)).toEqual([
      '2026-04-13',
      '2026-04-15',
      '2026-04-16',
    ]);
  });

  it('events outside the range are excluded', () => {
    const items = buildAgendaItems(
      [
        evAllDay('past', '2026-04-10'),
        evAllDay('future', '2026-04-25'),
        evAllDay('inside', '2026-04-15'),
      ],
      RANGE,
    );
    expect(items.length).toBe(2);
    expect((items[1] as AgendaItem & { event: CalendarEvent }).event.id).toBe('inside');
  });
});

describe('buildAgendaItems — multi-day events', () => {
  it('multi-day all-day appears on every day with isContinuation flag', () => {
    // 2026-04-13 → 2026-04-16 (exclusive) = Mon-Wed inclusive
    const items = buildAgendaItems(
      [evAllDay('conf', '2026-04-13', '2026-04-16')],
      RANGE,
    );
    const eventRows = items.filter((i) => i.kind === 'event') as Array<
      AgendaItem & { event: CalendarEvent; isContinuation: boolean; date: string }
    >;
    expect(eventRows.length).toBe(3);
    expect(eventRows[0]).toMatchObject({ date: '2026-04-13', isContinuation: false });
    expect(eventRows[1]).toMatchObject({ date: '2026-04-14', isContinuation: true });
    expect(eventRows[2]).toMatchObject({ date: '2026-04-15', isContinuation: true });
  });

  it('multi-day event partly outside the range is clipped', () => {
    // Apr 11 (Sat before) → Apr 14 (exclusive) = Sat-Mon inclusive.
    // Range is Mon Apr 13 - Sun Apr 19. Visible: Mon Apr 13 only.
    const items = buildAgendaItems(
      [evAllDay('weekend-conf', '2026-04-11', '2026-04-14')],
      RANGE,
    );
    const eventRows = items.filter((i) => i.kind === 'event') as Array<
      AgendaItem & { event: CalendarEvent; isContinuation: boolean }
    >;
    expect(eventRows.length).toBe(1);
    expect(eventRows[0].isContinuation).toBe(true); // mon was day 3 of the event
  });
});

describe('buildAgendaItems — id dedupe', () => {
  it('duplicate ids are dropped (last write wins)', () => {
    const items = buildAgendaItems(
      [evAllDay('dup', '2026-04-15'), evAllDay('dup', '2026-04-15')],
      RANGE,
    );
    const eventRows = items.filter((i) => i.kind === 'event');
    expect(eventRows.length).toBe(1);
  });
});

// ─── Property tests ───────────────────────────────────────────────

describe('buildAgendaItems — properties', () => {
  // Generate events with start somewhere in the visible week.
  const dayInRange = fc.constantFrom(
    '2026-04-13',
    '2026-04-14',
    '2026-04-15',
    '2026-04-16',
    '2026-04-17',
    '2026-04-18',
    '2026-04-19',
  );
  const allDayEventArb = fc
    .tuple(fc.integer({ min: 0, max: 1_000_000 }), dayInRange)
    .map(([n, day]): CalendarEvent => ({ id: `e-${n}`, start: pd(day) }));

  const timedEventArb = fc
    .tuple(
      fc.integer({ min: 0, max: 1_000_000 }),
      dayInRange,
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
    )
    .map(([n, day, h, m]): CalendarEvent => ({
      id: `e-${n}`,
      start: zdt(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`),
    }));

  const eventArb = fc.oneof(allDayEventArb, timedEventArb);

  it('headers are in strictly ascending date order', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 50 }), (events) => {
        const items = buildAgendaItems(events, RANGE);
        const headers = items.filter((i) => i.kind === 'header') as Array<
          AgendaItem & { date: string }
        >;
        for (let i = 1; i < headers.length; i++) {
          expect(headers[i].date.localeCompare(headers[i - 1].date)).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('every event row sits immediately after its day header (no events without a preceding header)', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 50 }), (events) => {
        const items = buildAgendaItems(events, RANGE);
        let lastHeaderDate: string | null = null;
        for (const item of items) {
          if (item.kind === 'header') {
            lastHeaderDate = (item as AgendaItem & { date: string }).date;
          } else {
            expect(lastHeaderDate).not.toBeNull();
            expect((item as AgendaItem & { date: string }).date).toBe(lastHeaderDate);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('every input event id with at least one in-range day appears at least once', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        const byId = new Map<string, CalendarEvent>();
        for (const e of events) byId.set(e.id, e);
        const items = buildAgendaItems([...byId.values()], RANGE);
        const seenIds = new Set(
          items
            .filter((i) => i.kind === 'event')
            .map((i) => (i as AgendaItem & { event: CalendarEvent }).event.id),
        );
        for (const e of byId.values()) {
          // Single-day events in range should always appear.
          expect(seenIds.has(e.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('output is independent of input order', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb, { maxLength: 30 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (events, seed) => {
          const byId = new Map<string, CalendarEvent>();
          for (const e of events) byId.set(e.id, e);
          const list = [...byId.values()];
          // Pseudo-random shuffle.
          const shuffled = [...list];
          let h = seed >>> 0;
          for (let i = shuffled.length - 1; i > 0; i--) {
            h = (h * 1664525 + 1013904223) >>> 0;
            const j = h % (i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          const a = buildAgendaItems(list, RANGE);
          const b = buildAgendaItems(shuffled, RANGE);
          expect(a.map((x) => x.key)).toEqual(b.map((x) => x.key));
        },
      ),
      { numRuns: 100 },
    );
  });
});
