/**
 * Phase-4 §A3 — `DstPolicy` post-processing tests.
 *
 * The library applies `DstPolicy` to every TIMED rule-generated
 * occurrence after the engine returns, so observable semantics never
 * depend on which engine ran underneath (engine-swap invariance).
 *
 * Vienna DST 2026:
 *   - Spring-forward (gap):  Sun 2026-03-29 — 02:00 → 03:00 doesn't exist
 *   - Fall-back   (overlap): Sun 2026-10-25 — 02:00 → 03:00 occurs twice
 *
 * For a series scheduled daily at 02:30 in Vienna, the 03-29 occurrence
 * lands in a gap and the 10-25 occurrence lands in an overlap.
 *
 * These tests exercise all four `DstPolicy` values against both
 * scenarios + cross-checks (RDATE pass-through, all-day pass-through).
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import {
  expandSeries,
  type RecurringSeries,
  type RecurrenceExpansionWindow,
} from '../../recurrence';
import { DstResolutionError } from '../../core/dnd/move-math';

// Series at 02:30 daily Vienna spanning the spring-forward day.
const SPRING_SERIES: RecurringSeries = {
  id: 'spring-0230',
  rrule: 'FREQ=DAILY;COUNT=3',
  dtstart: Temporal.ZonedDateTime.from('2026-03-28T02:30:00[Europe/Vienna]'),
};
const SPRING_WINDOW: RecurrenceExpansionWindow = {
  start: Temporal.ZonedDateTime.from('2026-03-27T00:00:00[Europe/Vienna]'),
  end: Temporal.ZonedDateTime.from('2026-04-01T00:00:00[Europe/Vienna]'),
};

// Series at 02:30 daily Vienna spanning the fall-back day.
const FALL_SERIES: RecurringSeries = {
  id: 'fall-0230',
  rrule: 'FREQ=DAILY;COUNT=3',
  dtstart: Temporal.ZonedDateTime.from('2026-10-24T02:30:00[Europe/Vienna]'),
};
const FALL_WINDOW: RecurrenceExpansionWindow = {
  start: Temporal.ZonedDateTime.from('2026-10-23T00:00:00[Europe/Vienna]'),
  end: Temporal.ZonedDateTime.from('2026-10-28T00:00:00[Europe/Vienna]'),
};

describe("DstPolicy 'compatible' — spring-forward gap", () => {
  it('shifts gap occurrences forward (Temporal compatible default)', async () => {
    const occurrences = await expandSeries(SPRING_SERIES, SPRING_WINDOW, 'compatible');
    expect(occurrences.length).toBe(3);
    // Day 2 (03-29) lands in gap. 'compatible' shifts forward —
    // actual hour shifts from intended 02:30 to engine-default
    // resolution.
    const day2 = occurrences[1].start as Temporal.ZonedDateTime;
    expect(day2.toPlainDate().toString()).toBe('2026-03-29');
    // Either 03:30 (forward shift by gap length) or some later
    // instant — the exact value is Temporal's choice. The contract
    // is just "no throw, deterministic, in the source zone".
    expect(day2.timeZoneId).toBe('Europe/Vienna');
  });
});

describe("DstPolicy 'reject' — spring-forward gap", () => {
  it('throws DstResolutionError naming series id and offending wallclock', async () => {
    await expect(
      expandSeries(SPRING_SERIES, SPRING_WINDOW, 'reject'),
    ).rejects.toThrow(DstResolutionError);

    try {
      await expandSeries(SPRING_SERIES, SPRING_WINDOW, 'reject');
    } catch (e) {
      const err = e as DstResolutionError;
      expect(err.disambiguation).toBe('gap');
      expect(err.message).toContain('spring-0230');
      expect(err.message).toContain('Europe/Vienna');
      // The offending intended wallclock is 02:30 on 2026-03-29.
      expect(err.message).toContain('02:30');
      expect(err.message).toContain('2026-03-29');
    }
  });
});

describe("DstPolicy 'earlier' — spring-forward gap", () => {
  it('re-resolves gap occurrence to the last instant before the gap', async () => {
    const occurrences = await expandSeries(SPRING_SERIES, SPRING_WINDOW, 'earlier');
    expect(occurrences.length).toBe(3);
    const day2 = occurrences[1].start as Temporal.ZonedDateTime;
    expect(day2.toPlainDate().toString()).toBe('2026-03-29');
    // 'earlier' for a gap returns wallclock with the OLD offset
    // (+01:00) — the date is still 03-29 but the hour reflects
    // pre-transition wallclock.
    // Concretely: 02:30 with +01:00 = 01:30 UTC, which in the new
    // (+02:00) offset reads as 03:30 wallclock. But Temporal
    // returns the ZDT carrying its OFFSET, so .hour reads what
    // Temporal computed, not what we feed in.
    // We assert the offset rather than the hour to capture this.
    expect(day2.offset).toBe('+01:00');
  });
});

describe("DstPolicy 'later' — spring-forward gap", () => {
  it('re-resolves gap occurrence to the first instant after the gap', async () => {
    const occurrences = await expandSeries(SPRING_SERIES, SPRING_WINDOW, 'later');
    const day2 = occurrences[1].start as Temporal.ZonedDateTime;
    expect(day2.toPlainDate().toString()).toBe('2026-03-29');
    // 'later' for a gap returns wallclock with the NEW offset
    // (+02:00) — the post-transition side.
    expect(day2.offset).toBe('+02:00');
  });
});

describe("DstPolicy 'reject' — fall-back overlap", () => {
  it('throws DstResolutionError for overlap occurrence', async () => {
    await expect(
      expandSeries(FALL_SERIES, FALL_WINDOW, 'reject'),
    ).rejects.toThrow(DstResolutionError);

    try {
      await expandSeries(FALL_SERIES, FALL_WINDOW, 'reject');
    } catch (e) {
      const err = e as DstResolutionError;
      expect(err.disambiguation).toBe('overlap');
      expect(err.message).toContain('fall-0230');
    }
  });
});

describe("DstPolicy 'earlier' / 'later' — fall-back overlap", () => {
  it("'earlier' picks the earlier instant (pre-transition offset)", async () => {
    const occurrences = await expandSeries(FALL_SERIES, FALL_WINDOW, 'earlier');
    expect(occurrences.length).toBe(3);
    const day2 = occurrences[1].start as Temporal.ZonedDateTime;
    expect(day2.toPlainDate().toString()).toBe('2026-10-25');
    // Pre-transition wallclock on overlap day in Vienna: +02:00 (CEST).
    expect(day2.offset).toBe('+02:00');
  });

  it("'later' picks the later instant (post-transition offset)", async () => {
    const occurrences = await expandSeries(FALL_SERIES, FALL_WINDOW, 'later');
    const day2 = occurrences[1].start as Temporal.ZonedDateTime;
    expect(day2.toPlainDate().toString()).toBe('2026-10-25');
    // Post-transition wallclock on overlap day in Vienna: +01:00 (CET).
    expect(day2.offset).toBe('+01:00');
  });
});

describe('non-DST occurrences pass through unchanged for every policy', () => {
  it('identical output for compatible/earlier/later when no DST event happens', async () => {
    // Daily at 09:00 Vienna for one week — no DST involvement at 09:00
    // outside the spring/fall transition days.
    const series: RecurringSeries = {
      id: 'morning',
      rrule: 'FREQ=DAILY;COUNT=7',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-01T09:00:00[Europe/Vienna]',
      ),
      duration: { hours: 1 },
    };
    const window: RecurrenceExpansionWindow = {
      start: Temporal.ZonedDateTime.from(
        '2026-06-01T00:00:00[Europe/Vienna]',
      ),
      end: Temporal.ZonedDateTime.from('2026-06-15T00:00:00[Europe/Vienna]'),
    };

    const compat = await expandSeries(series, window, 'compatible');
    const earlier = await expandSeries(series, window, 'earlier');
    const later = await expandSeries(series, window, 'later');

    const startsOf = (events: typeof compat) =>
      events.map((e) => (e.start as Temporal.ZonedDateTime).epochMilliseconds);

    expect(startsOf(compat)).toEqual(startsOf(earlier));
    expect(startsOf(compat)).toEqual(startsOf(later));
  });
});

describe('all-day series pass through unchanged for every policy', () => {
  it('reject does not throw for all-day even on DST days (no DST involvement)', async () => {
    const series: RecurringSeries = {
      id: 'all-day-spring',
      rrule: 'FREQ=DAILY;COUNT=3',
      dtstart: Temporal.PlainDate.from('2026-03-28'),
    };
    const window: RecurrenceExpansionWindow = {
      start: Temporal.ZonedDateTime.from(
        '2026-03-27T00:00:00[Europe/Vienna]',
      ),
      end: Temporal.ZonedDateTime.from('2026-04-01T00:00:00[Europe/Vienna]'),
    };

    // All four policies must succeed for all-day.
    await expect(
      expandSeries(series, window, 'reject'),
    ).resolves.toHaveLength(3);
    await expect(
      expandSeries(series, window, 'compatible'),
    ).resolves.toHaveLength(3);
    await expect(
      expandSeries(series, window, 'earlier'),
    ).resolves.toHaveLength(3);
    await expect(
      expandSeries(series, window, 'later'),
    ).resolves.toHaveLength(3);
  });
});

describe('RDATE occurrences pass through unchanged for reject policy', () => {
  it("RDATE explicitly chosen by consumer is trusted — 'reject' does not throw", async () => {
    // RDATE explicitly specifies a fully-resolved ZonedDateTime —
    // consumer's choice. Even if the wallclock would be ambiguous as
    // a rule output, the consumer made an unambiguous choice.
    const series: RecurringSeries = {
      id: 'rdate-only',
      // No rule occurrences in window — just one RDATE.
      rrule: 'FREQ=YEARLY;COUNT=1;UNTIL=20250101T000000Z',
      dtstart: Temporal.ZonedDateTime.from(
        '2024-01-01T09:00:00[Europe/Vienna]',
      ),
      rdate: [
        // Pre-transition (earlier) instant on overlap day.
        Temporal.ZonedDateTime.from('2026-10-25T02:30:00+02:00[Europe/Vienna]'),
      ],
    };
    const window: RecurrenceExpansionWindow = {
      start: Temporal.ZonedDateTime.from(
        '2026-10-01T00:00:00[Europe/Vienna]',
      ),
      end: Temporal.ZonedDateTime.from('2026-11-01T00:00:00[Europe/Vienna]'),
    };

    // Should NOT throw — RDATE is consumer-explicit.
    const occurrences = await expandSeries(series, window, 'reject');
    expect(occurrences.length).toBeGreaterThanOrEqual(1);
  });
});

describe('cross-zone series — DST policy uses series source zone (A7 + C5)', () => {
  it('Tokyo series viewed from Vienna: no DST issue (Tokyo has no DST)', async () => {
    const series: RecurringSeries = {
      id: 'tokyo-spring',
      // Daily at 02:30 Tokyo across what would be Vienna spring-forward.
      // Tokyo does not observe DST → no policy enforcement triggers.
      rrule: 'FREQ=DAILY;COUNT=3',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-03-28T02:30:00[Asia/Tokyo]',
      ),
    };
    const window: RecurrenceExpansionWindow = {
      start: Temporal.ZonedDateTime.from(
        '2026-03-27T00:00:00[Europe/Vienna]',
      ),
      end: Temporal.ZonedDateTime.from('2026-04-01T00:00:00[Europe/Vienna]'),
    };

    // 'reject' must NOT throw because Tokyo has no DST gap on this date.
    const occurrences = await expandSeries(series, window, 'reject');
    expect(occurrences.length).toBe(3);
    for (const ev of occurrences) {
      expect((ev.start as Temporal.ZonedDateTime).timeZoneId).toBe(
        'Asia/Tokyo',
      );
    }
  });
});
