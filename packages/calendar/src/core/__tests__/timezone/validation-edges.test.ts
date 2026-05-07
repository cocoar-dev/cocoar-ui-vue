/**
 * Edge-case validation tests for `validateCalendarEvent`.
 * Phase 8.10-N: pin the rejection contract for every shape that
 * isn't a `Temporal.ZonedDateTime` or `Temporal.PlainDate`.
 */

import { describe, expect, it, vi } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { validateCalendarEvent, type CalendarEvent } from '../../types';
import { zdt, pd } from '../../../__test-utils__/event-fixtures';

describe('validateCalendarEvent — rejected shapes', () => {
  it('rejects Temporal.Instant as start', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'inst',
        start: Temporal.Instant.from(
          '2026-04-13T09:00:00Z',
        ) as unknown as Temporal.ZonedDateTime,
      }),
    ).toThrow(/start must be Temporal/);
  });

  it('rejects Temporal.PlainTime as start', () => {
    expect(() =>
      validateCalendarEvent({
        id: 't',
        start: Temporal.PlainTime.from(
          '09:00:00',
        ) as unknown as Temporal.ZonedDateTime,
      }),
    ).toThrow(/start must be Temporal/);
  });

  it('rejects Temporal.PlainYearMonth as start', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'ym',
        start: Temporal.PlainYearMonth.from(
          '2026-04',
        ) as unknown as Temporal.ZonedDateTime,
      }),
    ).toThrow(/start must be Temporal/);
  });

  it('rejects null start', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'n',
        start: null as unknown as Temporal.ZonedDateTime,
      }),
    ).toThrow(/start must be Temporal/);
  });

  it('rejects undefined start', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'u',
        start: undefined as unknown as Temporal.ZonedDateTime,
      }),
    ).toThrow(/start must be Temporal/);
  });

  it('rejects array as start', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'a',
        start: [] as unknown as Temporal.ZonedDateTime,
      }),
    ).toThrow(/start must be Temporal/);
  });

  it('rejects bare object with timeZoneId duck-type as start', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'duck',
        start: { timeZoneId: 'Europe/Vienna' } as unknown as Temporal.ZonedDateTime,
      }),
    ).toThrow(/start must be Temporal/);
  });

  it('rejects native Date as end (start = ZDT)', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'mix',
        start: zdt('2026-04-13T09:00:00'),
        end: new Date() as unknown as Temporal.ZonedDateTime,
      }),
    ).toThrow(/end must be Temporal/);
  });

  it('error message names the offending event id', () => {
    try {
      validateCalendarEvent({
        id: 'evt-special-id-9',
        start: 'bogus' as unknown as Temporal.ZonedDateTime,
      });
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('evt-special-id-9');
    }
  });
});

describe('validateCalendarEvent — accepted shapes', () => {
  it('accepts ZonedDateTime + ZonedDateTime', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'ok',
        start: zdt('2026-04-13T09:00:00'),
        end: zdt('2026-04-13T10:00:00'),
      }),
    ).not.toThrow();
  });

  it('accepts PlainDate + PlainDate', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'ok',
        start: pd('2026-04-13'),
        end: pd('2026-04-15'),
      }),
    ).not.toThrow();
  });

  it('accepts ZonedDateTime without end', () => {
    expect(() =>
      validateCalendarEvent({ id: 'ok', start: zdt('2026-04-13T09:00:00') }),
    ).not.toThrow();
  });

  it('accepts PlainDate without end', () => {
    expect(() =>
      validateCalendarEvent({ id: 'ok', start: pd('2026-04-13') }),
    ).not.toThrow();
  });

  it('cross-zone ZonedDateTime endpoints accepted', () => {
    expect(() =>
      validateCalendarEvent({
        id: 'flight',
        start: zdt('2026-06-15T22:00:00', 'Asia/Tokyo'),
        end: zdt('2026-06-16T06:00:00', 'Europe/Vienna'),
      }),
    ).not.toThrow();
  });
});

describe('validateCalendarEvent — eager IANA zone validation (Phase 8.12-BG)', () => {
  it('rejects ZonedDateTime with bogus timeZoneId — at construction OR at validation', async () => {
    // Two acceptable behaviours: (a) the polyfill rejects 'Europe/Wien'
    // at `Temporal.ZonedDateTime.from(...)` — most current polyfills
    // do, and the test is satisfied. (b) The polyfill is lenient and
    // we catch it inside `validateCalendarEvent` — the lib's eager
    // probe is what matters then. Either way the consumer sees a loud
    // error before any layout code runs.
    let constructionThrew = false;
    let badZdt: Temporal.ZonedDateTime | null = null;
    try {
      badZdt = Temporal.ZonedDateTime.from(
        '2026-04-13T09:00:00[Europe/Wien]',
      );
    } catch {
      constructionThrew = true;
    }
    if (constructionThrew) {
      // Polyfill enforces it — the lib is already protected.
      expect(constructionThrew).toBe(true);
      return;
    }
    // Polyfill let it through → validation must throw.
    const { validateCalendarEvent } = await import('../../types');
    expect(() =>
      validateCalendarEvent({ id: 'bad-tz', start: badZdt as Temporal.ZonedDateTime }),
    ).toThrow(/bad-tz|Europe\/Wien|IANA/);
  });
});

describe('detectFirstDayOfWeekFromLocale — fallback warning (Phase 8.12-BL)', () => {
  it('returns a deterministic DayOfWeek on an invalid locale (no throw)', async () => {
    // The helper swallows `Intl.Locale` parse errors and falls back
    // to Monday (1). Module-level `_warnedWeekInfoFallback` makes the
    // warn one-shot per process — so we can't reliably assert the
    // warn fired (other tests in this run may have triggered it
    // already). What we CAN pin: the function always returns a valid
    // 0..6 DayOfWeek, never throws.
    const { detectFirstDayOfWeekFromLocale } = await import('../../temporal');
    const result = detectFirstDayOfWeekFromLocale('not-a-real-locale-tag-####');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(6);
  });
});

describe('validateCalendarEvent — meta.rrule migration warning', () => {
  it('warns when meta carries rrule (recurrence not yet wired)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      validateCalendarEvent({
        id: 'series-x',
        start: zdt('2026-04-13T09:00:00'),
        meta: { rrule: 'FREQ=WEEKLY;BYDAY=MO' },
      } as CalendarEvent);
      expect(
        warn.mock.calls.some((c) =>
          String(c[0] ?? '').includes('series-x'),
        ),
      ).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });

  it('warns when meta carries rdate', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      validateCalendarEvent({
        id: 'rdate-y',
        start: zdt('2026-04-13T09:00:00'),
        meta: { rdate: ['2026-04-20T09:00:00'] },
      } as CalendarEvent);
      expect(
        warn.mock.calls.some((c) =>
          String(c[0] ?? '').includes('rdate-y'),
        ),
      ).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });

  it('does NOT warn for plain meta without recurrence keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      validateCalendarEvent({
        id: 'no-warn',
        start: zdt('2026-04-13T09:00:00'),
        meta: { title: 'Fine', color: '#abc' },
      } as CalendarEvent);
      expect(
        warn.mock.calls.some((c) =>
          String(c[0] ?? '').includes('no-warn'),
        ),
      ).toBe(false);
    } finally {
      warn.mockRestore();
    }
  });
});
