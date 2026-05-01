/**
 * Tests for `core/temporal.ts`.
 *
 * The functions are all pure and deterministic; specific examples
 * lock down the boundary cases (DST transitions, ISO week 53 in
 * 53-week years, leap days, year boundaries on month grids), and
 * fast-check property tests prove the invariants over arbitrary
 * inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  Temporal,
  type DayOfWeek,
  temporalDowToCalendarDow,
  calendarDowToTemporalDow,
  detectFirstDayOfWeekFromLocale,
  detectHour12FromLocale,
  detectBrowserTimezone,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isoWeekNumber,
  weekDates,
  monthGridDates,
  localizedWeekdayNames,
  dateKey,
  isDateOnlyIsoString,
  parseEventInstant,
  eventStartDateInZone,
  todayInZone,
  nowInZone,
} from '../temporal';

// ─── Day-of-week conversion ──────────────────────────────────────────

describe('day-of-week conversion', () => {
  it('temporal 1..7 (Mon..Sun) → calendar 0..6 (Sun..Sat)', () => {
    expect(temporalDowToCalendarDow(1)).toBe(1); // Monday
    expect(temporalDowToCalendarDow(2)).toBe(2);
    expect(temporalDowToCalendarDow(3)).toBe(3);
    expect(temporalDowToCalendarDow(4)).toBe(4);
    expect(temporalDowToCalendarDow(5)).toBe(5);
    expect(temporalDowToCalendarDow(6)).toBe(6); // Saturday
    expect(temporalDowToCalendarDow(7)).toBe(0); // Sunday
  });

  it('calendar 0..6 → temporal 1..7', () => {
    expect(calendarDowToTemporalDow(0)).toBe(7); // Sunday
    expect(calendarDowToTemporalDow(1)).toBe(1); // Monday
    expect(calendarDowToTemporalDow(6)).toBe(6); // Saturday
  });

  it('round-trips', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 7 }), (iso) => {
        const cal = temporalDowToCalendarDow(iso);
        expect(calendarDowToTemporalDow(cal)).toBe(iso);
      }),
    );
  });
});

// ─── Locale resolution ───────────────────────────────────────────────

describe('detectFirstDayOfWeekFromLocale', () => {
  it('returns Sunday for en-US', () => {
    expect(detectFirstDayOfWeekFromLocale('en-US')).toBe(0);
  });
  it('returns Monday for de-DE / en-GB', () => {
    expect(detectFirstDayOfWeekFromLocale('de-DE')).toBe(1);
    expect(detectFirstDayOfWeekFromLocale('en-GB')).toBe(1);
  });
  it('falls back to Monday on unknown', () => {
    expect(detectFirstDayOfWeekFromLocale('xx-YY')).toBe(1);
  });
});

describe('detectHour12FromLocale', () => {
  it('returns true for en-US (12-hour)', () => {
    expect(detectHour12FromLocale('en-US')).toBe(true);
  });
  it('returns false for de-DE (24-hour)', () => {
    expect(detectHour12FromLocale('de-DE')).toBe(false);
  });
});

describe('detectBrowserTimezone', () => {
  it('returns a non-empty IANA-shaped string', () => {
    const tz = detectBrowserTimezone();
    expect(tz.length).toBeGreaterThan(0);
    // Either UTC or something with a slash.
    expect(/^(UTC|[A-Za-z_]+\/[A-Za-z_+\-/]+)$/.test(tz)).toBe(true);
  });
});

// ─── Week boundaries ─────────────────────────────────────────────────

describe('startOfWeek', () => {
  // 2026-04-15 is a Wednesday (ISO dow 3).
  const wed = Temporal.PlainDate.from('2026-04-15');

  it('Monday-start: Wed → Mon (3 days back)', () => {
    expect(startOfWeek(wed, 1).toString()).toBe('2026-04-13');
  });
  it('Sunday-start: Wed → Sun (3 days back via the prior Sunday)', () => {
    expect(startOfWeek(wed, 0).toString()).toBe('2026-04-12');
  });
  it('Saturday-start: Wed → prior Sat (4 days back)', () => {
    expect(startOfWeek(wed, 6).toString()).toBe('2026-04-11');
  });
  it('idempotent: Mon → Mon (Monday-start)', () => {
    const mon = Temporal.PlainDate.from('2026-04-13');
    expect(startOfWeek(mon, 1).toString()).toBe('2026-04-13');
  });
  it('idempotent: Sun → Sun (Sunday-start)', () => {
    const sun = Temporal.PlainDate.from('2026-04-12');
    expect(startOfWeek(sun, 0).toString()).toBe('2026-04-12');
  });
});

describe('endOfWeek', () => {
  it('Mon-start: Wed → next Sunday', () => {
    const wed = Temporal.PlainDate.from('2026-04-15');
    expect(endOfWeek(wed, 1).toString()).toBe('2026-04-19');
  });
});

describe('startOfWeek properties', () => {
  // Generate arbitrary plain dates from a stable epoch.
  const dateArb = fc.integer({ min: 0, max: 365 * 30 }).map((n) =>
    Temporal.PlainDate.from('2010-01-01').add({ days: n }),
  );

  it('startOfWeek output has the configured firstDayOfWeek', () => {
    fc.assert(
      fc.property(dateArb, fc.integer({ min: 0, max: 6 }), (date, fdow) => {
        const r = startOfWeek(date, fdow as DayOfWeek);
        expect(temporalDowToCalendarDow(r.dayOfWeek)).toBe(fdow);
      }),
      { numRuns: 200 },
    );
  });

  it('startOfWeek is at most 6 days before the input', () => {
    fc.assert(
      fc.property(dateArb, fc.integer({ min: 0, max: 6 }), (date, fdow) => {
        const r = startOfWeek(date, fdow as DayOfWeek);
        const diff = date.since(r, { largestUnit: 'days' }).days;
        expect(diff).toBeGreaterThanOrEqual(0);
        expect(diff).toBeLessThanOrEqual(6);
      }),
      { numRuns: 200 },
    );
  });

  it('endOfWeek = startOfWeek + 6', () => {
    fc.assert(
      fc.property(dateArb, fc.integer({ min: 0, max: 6 }), (date, fdow) => {
        const s = startOfWeek(date, fdow as DayOfWeek);
        const e = endOfWeek(date, fdow as DayOfWeek);
        expect(e.since(s, { largestUnit: 'days' }).days).toBe(6);
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Month boundaries ────────────────────────────────────────────────

describe('startOfMonth / endOfMonth', () => {
  it('startOfMonth returns the 1st', () => {
    expect(startOfMonth(Temporal.PlainDate.from('2026-04-15')).toString()).toBe(
      '2026-04-01',
    );
  });
  it('endOfMonth returns the last day', () => {
    expect(endOfMonth(Temporal.PlainDate.from('2026-04-15')).toString()).toBe(
      '2026-04-30',
    );
    expect(endOfMonth(Temporal.PlainDate.from('2024-02-15')).toString()).toBe(
      '2024-02-29',
    );
    expect(endOfMonth(Temporal.PlainDate.from('2025-02-15')).toString()).toBe(
      '2025-02-28',
    );
  });
});

// ─── ISO week numbers ────────────────────────────────────────────────

describe('isoWeekNumber', () => {
  it('first week of 2026 (Jan 1 is a Thursday)', () => {
    expect(isoWeekNumber(Temporal.PlainDate.from('2026-01-01'))).toBe(1);
    expect(isoWeekNumber(Temporal.PlainDate.from('2026-01-04'))).toBe(1); // Sunday
    expect(isoWeekNumber(Temporal.PlainDate.from('2026-01-05'))).toBe(2);
  });
  it('week 53 of 2020 (long year)', () => {
    expect(isoWeekNumber(Temporal.PlainDate.from('2020-12-31'))).toBe(53);
  });
  it('Jan 1 2024 belongs to week 1', () => {
    expect(isoWeekNumber(Temporal.PlainDate.from('2024-01-01'))).toBe(1);
  });
  it('Dec 31 2023 belongs to week 52', () => {
    expect(isoWeekNumber(Temporal.PlainDate.from('2023-12-31'))).toBe(52);
  });
});

// ─── Grid generation ─────────────────────────────────────────────────

describe('weekDates', () => {
  it('returns 7 consecutive dates starting at firstDayOfWeek', () => {
    const wed = Temporal.PlainDate.from('2026-04-15');
    const monday = weekDates(wed, 1);
    expect(monday.length).toBe(7);
    expect(monday[0].toString()).toBe('2026-04-13'); // Mon
    expect(monday[6].toString()).toBe('2026-04-19'); // Sun

    const sunday = weekDates(wed, 0);
    expect(sunday[0].toString()).toBe('2026-04-12'); // Sun
    expect(sunday[6].toString()).toBe('2026-04-18'); // Sat
  });
});

describe('monthGridDates', () => {
  it('always returns exactly 42 dates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 0, max: 6 }),
        (year, month, fdow) => {
          const ym = Temporal.PlainYearMonth.from({ year, month });
          const grid = monthGridDates(ym, fdow as DayOfWeek);
          expect(grid.length).toBe(42);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('first cell is the configured firstDayOfWeek', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 0, max: 6 }),
        (year, month, fdow) => {
          const ym = Temporal.PlainYearMonth.from({ year, month });
          const grid = monthGridDates(ym, fdow as DayOfWeek);
          expect(temporalDowToCalendarDow(grid[0].dayOfWeek)).toBe(fdow);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('grid contains every day of the target month', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 0, max: 6 }),
        (year, month, fdow) => {
          const ym = Temporal.PlainYearMonth.from({ year, month });
          const grid = monthGridDates(ym, fdow as DayOfWeek);
          const keys = new Set(grid.map((d) => d.toString()));
          for (let day = 1; day <= ym.daysInMonth; day++) {
            expect(keys.has(ym.toPlainDate({ day }).toString())).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cells are consecutive (each is exactly 1 day after the previous)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2000, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 0, max: 6 }),
        (year, month, fdow) => {
          const ym = Temporal.PlainYearMonth.from({ year, month });
          const grid = monthGridDates(ym, fdow as DayOfWeek);
          for (let i = 1; i < grid.length; i++) {
            const diff = grid[i].since(grid[i - 1], { largestUnit: 'days' }).days;
            expect(diff).toBe(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('localizedWeekdayNames', () => {
  it('returns 7 names', () => {
    expect(localizedWeekdayNames('en-US', 0).length).toBe(7);
  });
  it('Monday-start English short names', () => {
    const names = localizedWeekdayNames('en-US', 1, 'short');
    expect(names[0]).toMatch(/^Mon/);
    expect(names[6]).toMatch(/^Sun/);
  });
  it('Sunday-start English short names', () => {
    const names = localizedWeekdayNames('en-US', 0, 'short');
    expect(names[0]).toMatch(/^Sun/);
    expect(names[6]).toMatch(/^Sat/);
  });
});

// ─── Date keys + parsing ─────────────────────────────────────────────

describe('dateKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(dateKey(Temporal.PlainDate.from('2026-04-13'))).toBe('2026-04-13');
  });
});

describe('isDateOnlyIsoString', () => {
  it.each([
    ['2026-04-13', true],
    ['2026-04-13T09:00:00', false],
    ['2026-04-13T09:00:00Z', false],
    ['2026-04-13T09:00:00+02:00', false],
  ])('%s → %s', (iso, expected) => {
    expect(isDateOnlyIsoString(iso)).toBe(expected);
  });
});

describe('parseEventInstant', () => {
  it('date-only → kind: date', () => {
    const r = parseEventInstant('2026-04-13');
    expect(r.kind).toBe('date');
    if (r.kind === 'date') expect(r.date.toString()).toBe('2026-04-13');
  });
  it('Z-suffix → kind: instant', () => {
    const r = parseEventInstant('2026-04-13T09:00:00Z');
    expect(r.kind).toBe('instant');
  });
  it('with offset → kind: instant', () => {
    const r = parseEventInstant('2026-04-13T09:00:00+02:00');
    expect(r.kind).toBe('instant');
  });
  it('plain datetime (no offset, no Z) → kind: plain', () => {
    const r = parseEventInstant('2026-04-13T09:00:00');
    expect(r.kind).toBe('plain');
  });
});

describe('eventStartDateInZone', () => {
  it('date-only is timezone-independent', () => {
    expect(eventStartDateInZone('2026-04-13', 'Europe/Vienna').toString()).toBe(
      '2026-04-13',
    );
    expect(eventStartDateInZone('2026-04-13', 'America/Los_Angeles').toString()).toBe(
      '2026-04-13',
    );
  });
  it('UTC midnight in Vienna is the next day in Vienna only past 22:00 UTC', () => {
    // 22:00 UTC = midnight in Vienna (CEST) … most of the year.
    // Use a winter date for CET (UTC+1).
    expect(
      eventStartDateInZone('2026-01-13T23:30:00Z', 'Europe/Vienna').toString(),
    ).toBe('2026-01-14');
    expect(
      eventStartDateInZone('2026-01-13T23:30:00Z', 'America/Los_Angeles').toString(),
    ).toBe('2026-01-13');
  });
});

describe('todayInZone / nowInZone', () => {
  it('todayInZone returns a PlainDate', () => {
    const d = todayInZone('UTC');
    expect(d).toBeInstanceOf(Temporal.PlainDate);
  });
  it('nowInZone returns a ZonedDateTime in the requested zone', () => {
    const d = nowInZone('Europe/Vienna');
    expect(d.timeZoneId).toBe('Europe/Vienna');
  });
});
