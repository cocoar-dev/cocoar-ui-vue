import { describe, it, expect } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import {
  coarDetectDateFormatPatternFromIntl,
  coarGetDateSeparatorForPattern,
  coarGetLocalizedWeekdays,
  coarFormatPlainDate,
  coarParsePlainDateFromInput,
  coarCalculateIsoWeekNumber,
  coarClampPlainDate,
  coarGetCalendarGridDates,
} from '../date-helpers';

describe('coarDetectDateFormatPatternFromIntl', () => {
  it('detects mm/dd/yyyy for en-US', () => {
    expect(coarDetectDateFormatPatternFromIntl('en-US')).toBe('mm/dd/yyyy');
  });

  it('detects dd.mm.yyyy for de-DE', () => {
    expect(coarDetectDateFormatPatternFromIntl('de-DE')).toBe('dd.mm.yyyy');
  });

  it('returns a pattern even for unknown locale (Intl falls back)', () => {
    // Intl doesn't throw for unknown locales, it falls back to a default
    const result = coarDetectDateFormatPatternFromIntl('xxx-INVALID');
    expect(result).not.toBeNull();
  });
});

describe('coarGetDateSeparatorForPattern', () => {
  it('returns . for dd.mm.yyyy', () => {
    expect(coarGetDateSeparatorForPattern('dd.mm.yyyy')).toBe('.');
  });
  it('returns / for mm/dd/yyyy', () => {
    expect(coarGetDateSeparatorForPattern('mm/dd/yyyy')).toBe('/');
  });
  it('returns - for yyyy-mm-dd', () => {
    expect(coarGetDateSeparatorForPattern('yyyy-mm-dd')).toBe('-');
  });
});

describe('coarGetLocalizedWeekdays', () => {
  it('returns 7 weekday names', () => {
    const days = coarGetLocalizedWeekdays('en-US', 1);
    expect(days).toHaveLength(7);
  });

  it('starts with Monday when firstDayOfWeek=1', () => {
    const days = coarGetLocalizedWeekdays('en-US', 1);
    expect(days[0]).toBe('Mon');
  });

  it('starts with Sunday when firstDayOfWeek=7', () => {
    const days = coarGetLocalizedWeekdays('en-US', 7);
    expect(days[0]).toBe('Sun');
  });
});

describe('coarFormatPlainDate', () => {
  const date = Temporal.PlainDate.from('2026-06-05');

  it('formats dd.mm.yyyy', () => {
    expect(coarFormatPlainDate(date, 'dd.mm.yyyy')).toBe('05.06.2026');
  });

  it('formats mm/dd/yyyy', () => {
    expect(coarFormatPlainDate(date, 'mm/dd/yyyy')).toBe('06/05/2026');
  });

  it('formats yyyy-mm-dd', () => {
    expect(coarFormatPlainDate(date, 'yyyy-mm-dd')).toBe('2026-06-05');
  });
});

describe('coarParsePlainDateFromInput', () => {
  it('parses dd.mm.yyyy format', () => {
    const date = coarParsePlainDateFromInput('05.06.2026', 'dd.mm.yyyy');
    expect(date?.toString()).toBe('2026-06-05');
  });

  it('parses mm/dd/yyyy format', () => {
    const date = coarParsePlainDateFromInput('06/05/2026', 'mm/dd/yyyy');
    expect(date?.toString()).toBe('2026-06-05');
  });

  it('returns null for invalid date', () => {
    expect(coarParsePlainDateFromInput('31.02.2026', 'dd.mm.yyyy')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(coarParsePlainDateFromInput('', 'dd.mm.yyyy')).toBeNull();
  });

  it('enforces min constraint', () => {
    const min = Temporal.PlainDate.from('2026-06-10');
    expect(coarParsePlainDateFromInput('05.06.2026', 'dd.mm.yyyy', { min })).toBeNull();
  });

  it('enforces max constraint', () => {
    const max = Temporal.PlainDate.from('2026-06-01');
    expect(coarParsePlainDateFromInput('05.06.2026', 'dd.mm.yyyy', { max })).toBeNull();
  });

  it('allows date within constraints', () => {
    const min = Temporal.PlainDate.from('2026-06-01');
    const max = Temporal.PlainDate.from('2026-06-30');
    const date = coarParsePlainDateFromInput('15.06.2026', 'dd.mm.yyyy', { min, max });
    expect(date?.toString()).toBe('2026-06-15');
  });
});

describe('coarCalculateIsoWeekNumber', () => {
  it('calculates week 1 for Jan 1 2024 (Monday)', () => {
    const date = Temporal.PlainDate.from('2024-01-01');
    expect(coarCalculateIsoWeekNumber(date)).toBe(1);
  });

  it('calculates valid week for late December', () => {
    const date = Temporal.PlainDate.from('2024-12-31');
    const week = coarCalculateIsoWeekNumber(date);
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });
});

describe('coarClampPlainDate', () => {
  const date = Temporal.PlainDate.from('2026-06-15');

  it('returns date when within range', () => {
    const min = Temporal.PlainDate.from('2026-06-01');
    const max = Temporal.PlainDate.from('2026-06-30');
    expect(coarClampPlainDate(date, { min, max }).toString()).toBe('2026-06-15');
  });

  it('clamps to min', () => {
    const min = Temporal.PlainDate.from('2026-06-20');
    expect(coarClampPlainDate(date, { min }).toString()).toBe('2026-06-20');
  });

  it('clamps to max', () => {
    const max = Temporal.PlainDate.from('2026-06-10');
    expect(coarClampPlainDate(date, { max }).toString()).toBe('2026-06-10');
  });
});

describe('coarGetCalendarGridDates', () => {
  it('returns exactly 42 cells', () => {
    const month = Temporal.PlainYearMonth.from('2026-06');
    const cells = coarGetCalendarGridDates(month, 1);
    expect(cells).toHaveLength(42);
  });

  it('starts on correct day for Monday-first', () => {
    // June 2026 starts on Monday
    const month = Temporal.PlainYearMonth.from('2026-06');
    const cells = coarGetCalendarGridDates(month, 1);
    expect(cells[0].date.toString()).toBe('2026-06-01');
    expect(cells[0].isOutsideMonth).toBe(false);
  });

  it('marks outside-month cells correctly', () => {
    // March 2026 starts on Sunday → with Monday-first, prev month fills first row
    const month = Temporal.PlainYearMonth.from('2026-03');
    const cells = coarGetCalendarGridDates(month, 1);
    expect(cells[0].isOutsideMonth).toBe(true);
  });

  it('has trailing cells from next month', () => {
    const month = Temporal.PlainYearMonth.from('2026-06');
    const cells = coarGetCalendarGridDates(month, 1);
    const lastCell = cells[41];
    expect(lastCell.isOutsideMonth).toBe(true);
    expect(lastCell.date.month).toBe(7);
  });

  it('works with Sunday-first', () => {
    const month = Temporal.PlainYearMonth.from('2026-06');
    const cells = coarGetCalendarGridDates(month, 7);
    expect(cells).toHaveLength(42);
    // June 1 2026 is Monday, so Sunday-first should show May 31 (Sunday) first
    expect(cells[0].date.dayOfWeek).toBe(7); // Sunday
  });
});
