/**
 * D1 / C8 — Public recurrence API.
 *
 * Phase-4 Step 2: `expandSeries` is wired to the rrule-temporal
 * default engine. These tests cover:
 *
 *   1. Type-contract construction shape (dtstart Temporal types,
 *      rdate/exdate arrays, duration shape).
 *   2. Real expansion via the default engine — timed + all-day.
 *   3. Source-zone preservation per occurrence (C3).
 *   4. EXDATE matching against series source zone (A7).
 *   5. RDATE in a different zone preserves its own tzid in the
 *      output (A1 hetero-zone fast-path).
 *   6. Provenance (`__recurrence` meta) per occurrence (A4).
 *
 * DST policy enforcement (`'reject'`/`'earlier'`/`'later'`) is
 * Step 3; tests for that suite live alongside the post-processing
 * code.
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import {
  expandSeries,
  getRecurrenceMeta,
  type RecurringSeries,
  type RecurrenceExpansionWindow,
} from '../../recurrence';

describe('expandSeries — timed series', () => {
  const window: RecurrenceExpansionWindow = {
    start: Temporal.ZonedDateTime.from('2026-06-01T00:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-30T00:00:00[Europe/Vienna]'),
  };

  const timedSeries: RecurringSeries = {
    id: 'standup',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    dtstart: Temporal.ZonedDateTime.from(
      '2026-06-01T09:00:00[Europe/Vienna]',
    ),
    duration: { minutes: 30 },
  };

  it('expands a weekly Mon/Wed/Fri series across June 2026', async () => {
    const occurrences = await expandSeries(timedSeries, window, 'compatible');
    // Mon Jun 1, Wed Jun 3, Fri Jun 5,
    // Mon Jun 8, Wed Jun 10, Fri Jun 12,
    // Mon Jun 15, Wed Jun 17, Fri Jun 19,
    // Mon Jun 22, Wed Jun 24, Fri Jun 26,
    // Mon Jun 29 — 13 occurrences.
    expect(occurrences.length).toBe(13);
  });

  it('every occurrence is a ZonedDateTime in the source zone (C3)', async () => {
    const occurrences = await expandSeries(timedSeries, window, 'compatible');
    for (const ev of occurrences) {
      expect(ev.start).toBeInstanceOf(Temporal.ZonedDateTime);
      expect((ev.start as Temporal.ZonedDateTime).timeZoneId).toBe(
        'Europe/Vienna',
      );
    }
  });

  it('every occurrence has a unique synthetic id derived from series + recurrence', async () => {
    const occurrences = await expandSeries(timedSeries, window, 'compatible');
    const ids = occurrences.map((e) => e.id);
    // Layout pipeline dedupes by event.id — recurring occurrences MUST
    // be distinguishable. The series id lives in provenance instead.
    expect(new Set(ids).size).toBe(ids.length);
    for (const ev of occurrences) {
      expect(ev.id.startsWith('standup__')).toBe(true);
    }
  });

  it('applies duration to compute end (timed: minutes)', async () => {
    const occurrences = await expandSeries(timedSeries, window, 'compatible');
    for (const ev of occurrences) {
      const start = ev.start as Temporal.ZonedDateTime;
      const end = ev.end as Temporal.ZonedDateTime;
      expect(end.epochMilliseconds - start.epochMilliseconds).toBe(
        30 * 60 * 1000,
      );
    }
  });

  it('preserves source zone for an Asia/Tokyo series (cross-zone)', async () => {
    const tokyoSeries: RecurringSeries = {
      id: 'tokyo-daily',
      rrule: 'FREQ=DAILY',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-01T09:00:00[Asia/Tokyo]',
      ),
      duration: { hours: 1 },
    };
    // Window expressed in Vienna; engine must still produce
    // occurrences anchored in Tokyo.
    const occurrences = await expandSeries(tokyoSeries, window, 'compatible');
    expect(occurrences.length).toBeGreaterThan(0);
    for (const ev of occurrences) {
      expect((ev.start as Temporal.ZonedDateTime).timeZoneId).toBe(
        'Asia/Tokyo',
      );
    }
  });
});

describe('expandSeries — all-day series', () => {
  const window: RecurrenceExpansionWindow = {
    start: Temporal.ZonedDateTime.from('2026-01-01T00:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2027-01-01T00:00:00[Europe/Vienna]'),
  };

  it('expands a yearly Christmas series', async () => {
    const series: RecurringSeries = {
      id: 'christmas',
      rrule: 'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25',
      dtstart: Temporal.PlainDate.from('2026-12-25'),
    };
    const occurrences = await expandSeries(series, window, 'compatible');
    expect(occurrences.length).toBe(1);
    const occ = occurrences[0];
    expect(occ.start).toBeInstanceOf(Temporal.PlainDate);
    expect((occ.start as Temporal.PlainDate).toString()).toBe('2026-12-25');
  });

  it('all-day output is PlainDate — no zone leaks (C3)', async () => {
    const series: RecurringSeries = {
      id: 'birthday',
      rrule: 'FREQ=YEARLY',
      dtstart: Temporal.PlainDate.from('1992-02-29'),
    };
    const wideWindow: RecurrenceExpansionWindow = {
      start: Temporal.ZonedDateTime.from(
        '1990-01-01T00:00:00[Europe/Vienna]',
      ),
      end: Temporal.ZonedDateTime.from(
        '2031-01-01T00:00:00[Europe/Vienna]',
      ),
    };
    const occurrences = await expandSeries(series, wideWindow, 'compatible');
    for (const ev of occurrences) {
      expect(ev.start).toBeInstanceOf(Temporal.PlainDate);
      expect('timeZoneId' in (ev.start as object)).toBe(false);
    }
  });

  it('produces identical PlainDate sets across different display zones', async () => {
    const series: RecurringSeries = {
      id: 'vacation',
      rrule: 'FREQ=DAILY;COUNT=5',
      dtstart: Temporal.PlainDate.from('2026-06-22'),
    };

    const kiribatiWindow: RecurrenceExpansionWindow = {
      start: Temporal.ZonedDateTime.from(
        '2026-06-01T00:00:00[Pacific/Kiritimati]',
      ),
      end: Temporal.ZonedDateTime.from(
        '2026-07-01T00:00:00[Pacific/Kiritimati]',
      ),
    };
    const losAngelesWindow: RecurrenceExpansionWindow = {
      start: Temporal.ZonedDateTime.from(
        '2026-06-01T00:00:00[America/Los_Angeles]',
      ),
      end: Temporal.ZonedDateTime.from(
        '2026-07-01T00:00:00[America/Los_Angeles]',
      ),
    };

    const a = await expandSeries(series, kiribatiWindow, 'compatible');
    const b = await expandSeries(series, losAngelesWindow, 'compatible');

    const datesOf = (events: typeof a) =>
      events.map((e) => (e.start as Temporal.PlainDate).toString()).sort();
    expect(datesOf(a)).toEqual(datesOf(b));
  });

  it('applies duration to compute end (all-day: days)', async () => {
    const series: RecurringSeries = {
      id: 'sprint',
      rrule: 'FREQ=WEEKLY;INTERVAL=2;COUNT=3',
      dtstart: Temporal.PlainDate.from('2026-06-01'),
      duration: { days: 14 },
    };
    const longWindow: RecurrenceExpansionWindow = {
      start: Temporal.ZonedDateTime.from(
        '2026-06-01T00:00:00[Europe/Vienna]',
      ),
      end: Temporal.ZonedDateTime.from(
        '2026-12-01T00:00:00[Europe/Vienna]',
      ),
    };
    const occurrences = await expandSeries(series, longWindow, 'compatible');
    expect(occurrences.length).toBe(3);
    for (const ev of occurrences) {
      const start = ev.start as Temporal.PlainDate;
      const end = ev.end as Temporal.PlainDate;
      expect(start.until(end).days).toBe(14);
    }
  });
});

describe('expandSeries — RDATE / EXDATE', () => {
  const window: RecurrenceExpansionWindow = {
    start: Temporal.ZonedDateTime.from('2026-06-01T00:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-08-01T00:00:00[Europe/Vienna]'),
  };

  it('excludes occurrences listed in exdate (source-zone match, A7)', async () => {
    const series: RecurringSeries = {
      id: 'team-meeting',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-02T14:00:00[Europe/Vienna]',
      ),
      duration: { hours: 1 },
      exdate: [
        Temporal.ZonedDateTime.from('2026-06-23T14:00:00[Europe/Vienna]'),
        Temporal.ZonedDateTime.from('2026-06-30T14:00:00[Europe/Vienna]'),
      ],
    };
    const occurrences = await expandSeries(series, window, 'compatible');
    // Tuesdays Jun 2, 9, 16, (23 excluded), (30 excluded), Jul 7, 14, 21, 28
    expect(occurrences.length).toBe(7);
    const dates = occurrences.map((e) =>
      (e.start as Temporal.ZonedDateTime).toPlainDate().toString(),
    );
    expect(dates).not.toContain('2026-06-23');
    expect(dates).not.toContain('2026-06-30');
  });

  it('includes additional occurrences listed in rdate', async () => {
    const series: RecurringSeries = {
      id: 'team-meeting',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-02T14:00:00[Europe/Vienna]',
      ),
      duration: { hours: 1 },
      rdate: [
        // One-off Wednesday addition (not on the rule).
        Temporal.ZonedDateTime.from('2026-07-01T14:00:00[Europe/Vienna]'),
      ],
    };
    const occurrences = await expandSeries(series, window, 'compatible');
    const dates = occurrences.map((e) =>
      (e.start as Temporal.ZonedDateTime).toPlainDate().toString(),
    );
    expect(dates).toContain('2026-07-01');
  });

  it('preserves the original tzid for an RDATE in a different zone (A1 hetero-zone)', async () => {
    const series: RecurringSeries = {
      id: 'team-meeting',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-02T14:00:00[Europe/Vienna]',
      ),
      duration: { hours: 1 },
      rdate: [
        // RDATE in Tokyo zone — exception to the Vienna rule for a
        // travel week.
        Temporal.ZonedDateTime.from(
          '2026-07-01T22:00:00[Asia/Tokyo]',
        ),
      ],
    };
    const occurrences = await expandSeries(series, window, 'compatible');
    // Find the RDATE occurrence by its source meta.
    const rdateOccurrences = occurrences.filter(
      (e) => getRecurrenceMeta(e)?.source === 'rdate',
    );
    expect(rdateOccurrences.length).toBe(1);
    expect(
      (rdateOccurrences[0].start as Temporal.ZonedDateTime).timeZoneId,
    ).toBe('Asia/Tokyo');
  });
});

describe('expandSeries — provenance (A4)', () => {
  const window: RecurrenceExpansionWindow = {
    start: Temporal.ZonedDateTime.from('2026-06-01T00:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-07-01T00:00:00[Europe/Vienna]'),
  };

  it('every rule-generated occurrence has __recurrence with source=rrule', async () => {
    const series: RecurringSeries = {
      id: 'standup',
      rrule: 'FREQ=DAILY;COUNT=3',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-01T09:00:00[Europe/Vienna]',
      ),
    };
    const occurrences = await expandSeries(series, window, 'compatible');
    for (const ev of occurrences) {
      const meta = getRecurrenceMeta(ev);
      expect(meta).not.toBeNull();
      expect(meta!.seriesId).toBe('standup');
      expect(meta!.source).toBe('rrule');
      // recurrenceId equals start for unmodified occurrences.
      expect(
        (meta!.recurrenceId as Temporal.ZonedDateTime).epochMilliseconds,
      ).toBe((ev.start as Temporal.ZonedDateTime).epochMilliseconds);
    }
  });

  it('rdate-originated occurrences carry source=rdate', async () => {
    const series: RecurringSeries = {
      id: 'with-rdate',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-01T09:00:00[Europe/Vienna]',
      ),
      rdate: [
        Temporal.ZonedDateTime.from(
          '2026-06-10T09:00:00[Europe/Vienna]',
        ),
      ],
    };
    const occurrences = await expandSeries(series, window, 'compatible');
    const rdateMeta = occurrences
      .map(getRecurrenceMeta)
      .filter((m) => m?.source === 'rdate');
    expect(rdateMeta.length).toBe(1);
  });

  it('getRecurrenceMeta returns null for non-recurring events', () => {
    const ev = {
      id: 'one-off',
      start: Temporal.ZonedDateTime.from(
        '2026-06-01T09:00:00[Europe/Vienna]',
      ),
    };
    expect(getRecurrenceMeta(ev)).toBeNull();
  });
});

describe('RecurringSeries type construction (compile-time contract)', () => {
  it('accepts a timed series (dtstart: ZonedDateTime)', () => {
    const s: RecurringSeries = {
      id: 'weekly-standup',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-01T09:00:00[Europe/Vienna]',
      ),
      duration: { minutes: 30 },
    };
    expect(s.dtstart).toBeInstanceOf(Temporal.ZonedDateTime);
    expect((s.dtstart as Temporal.ZonedDateTime).timeZoneId).toBe(
      'Europe/Vienna',
    );
  });

  it('accepts an all-day series (dtstart: PlainDate)', () => {
    const s: RecurringSeries = {
      id: 'birthday',
      rrule: 'FREQ=YEARLY',
      dtstart: Temporal.PlainDate.from('1990-03-15'),
    };
    expect(s.dtstart).toBeInstanceOf(Temporal.PlainDate);
  });

  it('accepts duration in day-count units only (D2)', () => {
    const s: RecurringSeries = {
      id: 'sprint',
      rrule: 'FREQ=WEEKLY;INTERVAL=2',
      dtstart: Temporal.PlainDate.from('2026-06-01'),
      duration: { days: 14 },
    };
    expect(s.duration?.days).toBe(14);
  });
});
