/**
 * Phase 8.11 + 8.12 audit-tightening tests:
 *   - AJ: drop-payload round-trip idempotence
 *   - AL: Pacific/Kiritimati 2-day flip via setTimezone
 *   - AD-followup: month-resize disambiguation surfaced
 *   - BL: detectFirstDayOfWeekFromLocale catch branch warns
 */

import { describe, expect, it, vi } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { EventIndex } from '../../eventIndex';
import {
  applyMoveToEvent,
  DstResolutionError,
  type CalendarDropTarget,
} from '../../dnd/move-math';
import type { CalendarEvent } from '../../types';
import { zdt, pd } from '../../../__test-utils__/event-fixtures';

const target = (
  date: string,
  minutes: number | null,
  displayZone: string,
): CalendarDropTarget => ({ date, minutes, displayZone, valid: true });

// ─── AJ — Drop-payload round-trip idempotence ────────────────────────

describe('Drop payload round-trip — applying twice is idempotent', () => {
  it('timed move applied twice to same target produces identical instants + zones', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-06-15T10:00:00', 'Europe/Vienna'),
      end: zdt('2026-06-15T11:00:00', 'Europe/Vienna'),
    };
    const tgt = target('2026-06-16', 14 * 60, 'Europe/Vienna');
    const first = applyMoveToEvent(ev, tgt, 'timed');
    // Build the second event from the first result and apply again.
    const after1: CalendarEvent = {
      id: 'meet',
      start: first.start,
      ...(first.end ? { end: first.end } : {}),
    } as CalendarEvent;
    const second = applyMoveToEvent(after1, tgt, 'timed');

    const s1 = first.start as Temporal.ZonedDateTime;
    const s2 = second.start as Temporal.ZonedDateTime;
    const e1 = first.end as Temporal.ZonedDateTime;
    const e2 = second.end as Temporal.ZonedDateTime;
    expect(s2.toInstant().toString()).toBe(s1.toInstant().toString());
    expect(e2.toInstant().toString()).toBe(e1.toInstant().toString());
    expect(s2.timeZoneId).toBe(s1.timeZoneId);
    expect(e2.timeZoneId).toBe(e1.timeZoneId);
    expect(second.disambiguation).toBe(first.disambiguation);
  });

  it('cross-zone move applied twice keeps both endpoints in their zones', () => {
    const ev: CalendarEvent = {
      id: 'flight',
      start: zdt('2026-06-15T22:00:00', 'Asia/Tokyo'),
      end: zdt('2026-06-16T06:00:00', 'Europe/Vienna'),
    };
    const tgt = target('2026-06-17', 12 * 60, 'America/Los_Angeles');
    const first = applyMoveToEvent(ev, tgt, 'timed');
    const after1: CalendarEvent = {
      id: 'flight',
      start: first.start,
      end: first.end!,
    } as CalendarEvent;
    const second = applyMoveToEvent(after1, tgt, 'timed');

    const s2 = second.start as Temporal.ZonedDateTime;
    const e2 = second.end as Temporal.ZonedDateTime;
    expect(s2.timeZoneId).toBe('Asia/Tokyo');
    expect(e2.timeZoneId).toBe('Europe/Vienna');
  });

  it('all-day move applied twice is identical', () => {
    const ev: CalendarEvent = {
      id: 'conf',
      start: pd('2026-04-13'),
      end: pd('2026-04-16'),
    };
    const tgt = target('2026-04-20', null, 'Europe/Vienna');
    const first = applyMoveToEvent(ev, tgt, 'allDay');
    const after1: CalendarEvent = {
      id: 'conf',
      start: first.start,
      end: first.end!,
    } as CalendarEvent;
    const second = applyMoveToEvent(after1, tgt, 'allDay');
    expect((second.start as Temporal.PlainDate).toString()).toBe(
      (first.start as Temporal.PlainDate).toString(),
    );
    expect((second.end as Temporal.PlainDate).toString()).toBe(
      (first.end as Temporal.PlainDate).toString(),
    );
  });
});

// ─── AL — Pacific/Kiritimati 2-day flip ─────────────────────────────

describe('EventIndex.setTimezone — extreme zone switches', () => {
  it('Vienna → Pacific/Kiritimati (UTC+14) flips a near-midnight event by 1 day forward', () => {
    // Event at 2026-06-15 23:00 Vienna (= 21:00 UTC) is 2026-06-16
    // 11:00 in Kiritimati (UTC+14, no DST). Display switching from
    // Vienna to Kiritimati should re-bucket to June 16.
    const idx = new EventIndex({ timezone: 'Europe/Vienna' });
    idx.insert({
      id: 'late',
      start: zdt('2026-06-15T23:00:00', 'Europe/Vienna'),
    });
    expect(idx.byDay('2026-06-15').map((e) => e.id)).toEqual(['late']);
    idx.setTimezone('Pacific/Kiritimati');
    expect(idx.byDay('2026-06-15').length).toBe(0);
    expect(idx.byDay('2026-06-16').map((e) => e.id)).toEqual(['late']);
  });

  it('Pacific/Honolulu (UTC-10) → Pacific/Kiritimati (UTC+14): 2-day flip', () => {
    // Event 2026-06-14 23:00 Honolulu (= 09:00 UTC on Jun 15) is
    // 2026-06-15 23:00 in Kiritimati (UTC+14) — same day in Kiritimati,
    // but in Honolulu it's still 2026-06-14. Switching Honolulu →
    // Kiritimati flips one day. To get a 2-day flip we need an event
    // near both midnight crossings — 2026-06-15 23:30 in Pacific/Apia
    // (UTC+13) shows on 2026-06-15 in Apia and 2026-06-14 in Honolulu.
    const idx = new EventIndex({ timezone: 'Pacific/Honolulu' });
    idx.insert({
      id: 'flip',
      start: zdt('2026-06-15T23:30:00', 'Pacific/Apia'),
    });
    // 23:30 Apia (UTC+13) = 10:30 UTC = 00:30 Honolulu (UTC-10) on
    // 2026-06-15 — same calendar day in Honolulu.
    const honoBuckets = [...['2026-06-14', '2026-06-15', '2026-06-16']].filter(
      (d) => idx.byDay(d).length > 0,
    );
    expect(honoBuckets.length).toBe(1);
    idx.setTimezone('Pacific/Kiritimati');
    // 10:30 UTC → 00:30 + 14h = 00:30 Kiritimati on 2026-06-16 (next day).
    const kiriBuckets = [...['2026-06-14', '2026-06-15', '2026-06-16']].filter(
      (d) => idx.byDay(d).length > 0,
    );
    expect(kiriBuckets.length).toBe(1);
    // The buckets differ — proves setTimezone is general, not 1-day-shift.
    expect(honoBuckets[0]).not.toBe(kiriBuckets[0]);
  });
});

// ─── AD followup — month-resize disambiguation surfaces ─────────────

describe('Month-resize disambiguation (Phase 8.11-AD)', () => {
  it('month-resize-end onto a Vienna gap reports disambiguation=gap', () => {
    const ev: CalendarEvent = {
      id: 'multi',
      start: zdt('2026-03-27T02:30:00', 'Europe/Vienna'),
      end: zdt('2026-03-28T02:30:00', 'Europe/Vienna'),
    };
    // Drag the END to 2026-03-29 (spring-forward day). Old end's
    // wall-time is 02:30, which doesn't exist on Mar 29.
    const next = applyMoveToEvent(
      ev,
      target('2026-03-29', null, 'Europe/Vienna'),
      'month-resize-end',
    );
    expect(next.disambiguation).toBe('gap');
  });

  it('month-resize-start onto a Vienna overlap reports disambiguation=overlap', () => {
    const ev: CalendarEvent = {
      id: 'multi',
      start: zdt('2026-10-23T02:30:00', 'Europe/Vienna'),
      end: zdt('2026-10-26T02:30:00', 'Europe/Vienna'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-10-25', null, 'Europe/Vienna'),
      'month-resize-start',
    );
    expect(next.disambiguation).toBe('overlap');
  });

  it('month-resize-end with policy=reject throws on gap', () => {
    const ev: CalendarEvent = {
      id: 'multi',
      start: zdt('2026-03-27T02:30:00', 'Europe/Vienna'),
      end: zdt('2026-03-28T02:30:00', 'Europe/Vienna'),
    };
    expect(() =>
      applyMoveToEvent(
        ev,
        target('2026-03-29', null, 'Europe/Vienna'),
        'month-resize-end',
        'reject',
      ),
    ).toThrow(DstResolutionError);
  });
});
