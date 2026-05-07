/**
 * Multi-zone DST + cross-zone-DST + resize-across-DST tests.
 * Phase 8.10-L + 8.10-O.
 *
 * Vienna is over-tested elsewhere; this file pins down behaviour in
 * US Pacific, Sydney (reversed-hemisphere), and Lord_Howe (30-minute
 * DST) — the three places where assumptions silently bake in.
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import {
  applyMoveToEvent,
  DstResolutionError,
  type CalendarDropTarget,
  type DstPolicy,
} from '../../dnd/move-math';
import type { CalendarEvent } from '../../types';
import { zdt } from '../../../__test-utils__/event-fixtures';

const target = (
  date: string,
  minutes: number | null,
  displayZone: string,
): CalendarDropTarget => ({ date, minutes, displayZone, valid: true });

// ─── America/Los_Angeles DST ────────────────────────────────────────

describe('DST policies — America/Los_Angeles', () => {
  // Spring-forward 2026: Sun Mar 8 02:00 → 03:00. 02:30 doesn't exist.
  it('compatible: drop on 02:30 LA gap shifts forward to 03:30', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-03-08T01:30:00', 'America/Los_Angeles'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-03-08', 2 * 60 + 30, 'America/Los_Angeles'),
      'timed',
    );
    const start = next.start as Temporal.ZonedDateTime;
    expect(start.withTimeZone('America/Los_Angeles').hour).toBe(3);
    expect(start.withTimeZone('America/Los_Angeles').minute).toBe(30);
    expect(next.disambiguation).toBe('gap');
  });

  it('reject: drop on 02:30 LA gap throws', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-03-08T01:30:00', 'America/Los_Angeles'),
    };
    expect(() =>
      applyMoveToEvent(
        ev,
        target('2026-03-08', 2 * 60 + 30, 'America/Los_Angeles'),
        'timed',
        'reject',
      ),
    ).toThrow(DstResolutionError);
  });

  // Fall-back 2026: Sun Nov 1 02:00 → 01:00. 01:30 exists twice.
  it('overlap detected on Nov 1 01:30 LA', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-11-01T00:30:00', 'America/Los_Angeles'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-11-01', 60 + 30, 'America/Los_Angeles'),
      'timed',
    );
    expect(next.disambiguation).toBe('overlap');
  });

  it('earlier vs later pick the right instant in LA overlap', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-11-01T00:30:00', 'America/Los_Angeles'),
    };
    const earlier = applyMoveToEvent(
      ev,
      target('2026-11-01', 60 + 30, 'America/Los_Angeles'),
      'timed',
      'earlier' as DstPolicy,
    );
    const later = applyMoveToEvent(
      ev,
      target('2026-11-01', 60 + 30, 'America/Los_Angeles'),
      'timed',
      'later' as DstPolicy,
    );
    const eStart = earlier.start as Temporal.ZonedDateTime;
    const lStart = later.start as Temporal.ZonedDateTime;
    // Earlier = PDT (UTC-7) → 08:30 UTC; later = PST (UTC-8) → 09:30 UTC.
    expect(eStart.toInstant().toString()).toBe('2026-11-01T08:30:00Z');
    expect(lStart.toInstant().toString()).toBe('2026-11-01T09:30:00Z');
  });
});

// ─── Australia/Sydney DST (reversed hemisphere) ─────────────────────

describe('DST policies — Australia/Sydney (reversed-hemisphere)', () => {
  // Spring-forward Australia: Sun Oct 4 2026 02:00 → 03:00.
  it('compatible: drop on 02:30 Sydney gap shifts forward to 03:30', () => {
    const ev: CalendarEvent = {
      id: 'standup',
      start: zdt('2026-10-04T01:30:00', 'Australia/Sydney'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-10-04', 2 * 60 + 30, 'Australia/Sydney'),
      'timed',
    );
    const start = next.start as Temporal.ZonedDateTime;
    expect(start.withTimeZone('Australia/Sydney').hour).toBe(3);
    expect(start.withTimeZone('Australia/Sydney').minute).toBe(30);
    expect(next.disambiguation).toBe('gap');
  });

  // Fall-back Australia: Sun Apr 5 2026 03:00 → 02:00. 02:30 twice.
  it('reject throws on Apr 5 02:30 Sydney overlap', () => {
    const ev: CalendarEvent = {
      id: 'standup',
      start: zdt('2026-04-05T01:30:00', 'Australia/Sydney'),
    };
    expect(() =>
      applyMoveToEvent(
        ev,
        target('2026-04-05', 2 * 60 + 30, 'Australia/Sydney'),
        'timed',
        'reject',
      ),
    ).toThrow(DstResolutionError);
  });
});

// ─── Australia/Lord_Howe — 30-minute DST shift ──────────────────────

describe('DST policies — Australia/Lord_Howe (30min DST shift)', () => {
  // Lord_Howe spring-forward 2026: Sun Oct 4 02:00 → 02:30. Only 30
  // minutes "skipped" (02:00 to 02:29 doesn't exist).
  it('compatible: drop on 02:15 Lord_Howe gap shifts by 30min DST offset (lands on 02:45)', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-10-04T01:30:00', 'Australia/Lord_Howe'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-10-04', 2 * 60 + 15, 'Australia/Lord_Howe'),
      'timed',
    );
    const start = next.start as Temporal.ZonedDateTime;
    expect(next.disambiguation).toBe('gap');
    // Tight assertion (Phase 8.11-AI): Lord_Howe DST shift is +30min,
    // so 'compatible' resolves the 02:15 wall-time-in-gap by adding
    // 30min → 02:45. A regression to a 60-min DST shift (= 03:15)
    // would fail this exact-equal check.
    const lhInZone = start.withTimeZone('Australia/Lord_Howe');
    expect(lhInZone.hour).toBe(2);
    expect(lhInZone.minute).toBe(45);
  });
});

// ─── Cross-zone DST: source ≠ display ──────────────────────────────

describe('Cross-zone DST — source zone has no DST event at the same wall-clock', () => {
  it('Tokyo source, Vienna display, drop in Vienna gap → result preserves Tokyo zone, Vienna disambiguation flag fires', () => {
    // Tokyo has no DST; Vienna has spring-forward on 2026-03-29.
    const ev: CalendarEvent = {
      id: 'sync',
      start: zdt('2026-03-29T00:00:00', 'Asia/Tokyo'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-03-29', 2 * 60 + 30, 'Europe/Vienna'),
      'timed',
    );
    const start = next.start as Temporal.ZonedDateTime;
    // Source zone preserved.
    expect(start.timeZoneId).toBe('Asia/Tokyo');
    // Disambiguation reflects what happened in the DISPLAY zone (where
    // the user clicked), since that's the wall-clock the consumer
    // saw their drop snap to.
    expect(next.disambiguation).toBe('gap');
  });

  it('LA source, Sydney display, drop in Sydney spring-forward gap', () => {
    const ev: CalendarEvent = {
      id: 'sync',
      start: zdt('2026-10-04T00:00:00', 'America/Los_Angeles'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-10-04', 2 * 60 + 30, 'Australia/Sydney'),
      'timed',
    );
    const start = next.start as Temporal.ZonedDateTime;
    expect(start.timeZoneId).toBe('America/Los_Angeles');
    expect(next.disambiguation).toBe('gap');
  });
});

// ─── Resize across DST ──────────────────────────────────────────────

describe('Resize across DST — Vienna spring-forward', () => {
  it('timed-resize-end from before-DST onto a DST gap reports gap', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-03-29T01:00:00', 'Europe/Vienna'),
      end: zdt('2026-03-29T01:30:00', 'Europe/Vienna'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-03-29', 2 * 60 + 30, 'Europe/Vienna'),
      'timed-resize-end',
    );
    expect(next.disambiguation).toBe('gap');
  });

  it('timed-resize-end with policy=reject throws on gap landing', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-03-29T01:00:00', 'Europe/Vienna'),
      end: zdt('2026-03-29T01:30:00', 'Europe/Vienna'),
    };
    expect(() =>
      applyMoveToEvent(
        ev,
        target('2026-03-29', 2 * 60 + 30, 'Europe/Vienna'),
        'timed-resize-end',
        'reject',
      ),
    ).toThrow(DstResolutionError);
  });

  it('timed-resize-start onto Vienna fall-back overlap reports overlap', () => {
    const ev: CalendarEvent = {
      id: 'meet',
      start: zdt('2026-10-25T03:00:00', 'Europe/Vienna'),
      end: zdt('2026-10-25T04:00:00', 'Europe/Vienna'),
    };
    const next = applyMoveToEvent(
      ev,
      target('2026-10-25', 2 * 60 + 30, 'Europe/Vienna'),
      'timed-resize-start',
    );
    expect(next.disambiguation).toBe('overlap');
  });
});
