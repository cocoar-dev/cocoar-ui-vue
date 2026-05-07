/**
 * D1 / C8 — Public recurrence type contract.
 *
 * The engine integration ships in Phase 4. These tests pin the
 * SHAPE of the contract so consumers building against v2 today get
 * stable types tomorrow:
 *
 *   1. `expandSeries` exists, is callable, throws an INFORMATIVE
 *      error pointing at Phase 4. The throw is part of the contract:
 *      consumers wiring `expandSeries(series, window, dstPolicy)` get
 *      a clear "not yet" message rather than a silent empty array
 *      that could mask data-loss bugs in the data layer.
 *
 *   2. The `RecurringSeries` type accepts the documented shapes
 *      (timed via `ZonedDateTime`, all-day via `PlainDate`) and the
 *      compiler holds the line on consumers stuffing strings into
 *      `dtstart`. (Compile-time check — runtime test merely confirms
 *      the values can be CONSTRUCTED without exception.)
 *
 *   3. `validateCalendarEvent` continues to dev-warn when consumers
 *      try to smuggle `meta.rrule` past the type system (C8 escape
 *      hatch closure — verified in `timezone/validation-edges.test.ts`).
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import {
  expandSeries,
  EXPAND_SERIES_NOT_IMPLEMENTED_MESSAGE,
  type RecurringSeries,
  type RecurrenceExpansionWindow,
} from '../recurrence-public';
import type { DstPolicy } from '../temporal';

describe('expandSeries (Session 2 stub)', () => {
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

  const allDaySeries: RecurringSeries = {
    id: 'public-holiday',
    rrule: 'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25',
    dtstart: Temporal.PlainDate.from('2026-12-25'),
  };

  it('throws an informative TypeError for timed series', () => {
    expect(() => expandSeries(timedSeries, window, 'compatible')).toThrow(
      TypeError,
    );
    expect(() => expandSeries(timedSeries, window, 'compatible')).toThrow(
      /Phase 4|not implemented/i,
    );
  });

  it('throws an informative TypeError for all-day series', () => {
    expect(() => expandSeries(allDaySeries, window, 'compatible')).toThrow(
      TypeError,
    );
  });

  it('throw message is exported as a constant for assertion reuse', () => {
    try {
      expandSeries(timedSeries, window, 'compatible');
      throw new Error('expected expandSeries to throw');
    } catch (e) {
      expect((e as Error).message).toBe(
        EXPAND_SERIES_NOT_IMPLEMENTED_MESSAGE,
      );
    }
  });

  it('throw message names the type contract is enforced even without engine', () => {
    expect(EXPAND_SERIES_NOT_IMPLEMENTED_MESSAGE).toMatch(
      /TYPE contract|Session 2|Phase 4/,
    );
  });
});

describe('RecurringSeries type construction', () => {
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
    // D2 — duration in {days} for all-day, {hours,minutes} for timed.
    // Period semantics ('+1 month') are intentionally not in the type.
    const s: RecurringSeries = {
      id: 'sprint',
      rrule: 'FREQ=WEEKLY;INTERVAL=2',
      dtstart: Temporal.PlainDate.from('2026-06-01'),
      duration: { days: 14 },
    };
    expect(s.duration?.days).toBe(14);
  });

  it('accepts rdate / exdate as Temporal arrays', () => {
    const s: RecurringSeries = {
      id: 'team-meeting',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-02T14:00:00[Europe/Vienna]',
      ),
      duration: { hours: 1 },
      // Holiday week — skip these dates.
      exdate: [
        Temporal.ZonedDateTime.from('2026-06-23T14:00:00[Europe/Vienna]'),
        Temporal.ZonedDateTime.from('2026-06-30T14:00:00[Europe/Vienna]'),
      ],
      // One-off Wednesday addition.
      rdate: [
        Temporal.ZonedDateTime.from('2026-07-01T14:00:00[Europe/Vienna]'),
      ],
    };
    expect(s.exdate?.length).toBe(2);
    expect(s.rdate?.length).toBe(1);
  });

  it('preserves source zone — never collapses to display zone (Article 5 alignment)', () => {
    // A series scheduled in Tokyo. Even when the calendar later
    // renders in Vienna, the SOURCE zone stays Tokyo. The engine
    // (when wired in Phase 4) MUST respect this; the type makes
    // it impossible to lose at construction.
    const s: RecurringSeries = {
      id: 'tokyo-daily',
      rrule: 'FREQ=DAILY',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-01T09:00:00[Asia/Tokyo]',
      ),
    };
    expect((s.dtstart as Temporal.ZonedDateTime).timeZoneId).toBe(
      'Asia/Tokyo',
    );
  });
});

describe('DstPolicy type alignment with drop pipeline', () => {
  it('exports the same string-literal union as core/dnd/move-math', () => {
    // Compile-time assertion via assignment: if move-math's DstPolicy
    // ever drifts, this assignment becomes a TS error.
    const policies: DstPolicy[] = ['compatible', 'reject', 'earlier', 'later'];
    expect(policies).toHaveLength(4);
  });
});
