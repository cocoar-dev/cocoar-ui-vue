/**
 * Date manipulation utilities using Temporal API.
 *
 * Provides locale-aware date formatting, parsing, calendar grid generation,
 * and date arithmetic with Temporal.PlainDate.
 */
import { Temporal } from '@js-temporal/polyfill';

import type { DateFormatConfig, CoarCalendarGridCell } from './types';

/**
 * Detects the date format pattern from the user's locale via Intl.
 *
 * @example
 * coarDetectDateFormatPatternFromIntl('en-US') // 'mm/dd/yyyy'
 * coarDetectDateFormatPatternFromIntl('de-DE') // 'dd.mm.yyyy'
 */
export function coarDetectDateFormatPatternFromIntl(
  locale: string,
): DateFormatConfig['pattern'] | null {
  try {
    const formatter = new Intl.DateTimeFormat(locale);
    const parts = formatter.formatToParts(new Date(2024, 0, 15));

    const dayIndex = parts.findIndex((p) => p.type === 'day');
    const monthIndex = parts.findIndex((p) => p.type === 'month');
    const yearIndex = parts.findIndex((p) => p.type === 'year');

    if (dayIndex === -1 || monthIndex === -1 || yearIndex === -1) return null;

    if (dayIndex < monthIndex && monthIndex < yearIndex) return 'dd.mm.yyyy';
    if (monthIndex < dayIndex && dayIndex < yearIndex) return 'mm/dd/yyyy';
    if (yearIndex < monthIndex && monthIndex < dayIndex) return 'yyyy-mm-dd';

    return null;
  } catch {
    return null;
  }
}

/** Returns the separator character for a date format pattern. */
export function coarGetDateSeparatorForPattern(
  pattern: DateFormatConfig['pattern'],
): '.' | '/' | '-' {
  if (pattern.includes('.')) return '.';
  if (pattern.includes('/')) return '/';
  return '-';
}

/**
 * Gets localized weekday short names for the given locale and first day of week.
 *
 * @returns Array of 7 short weekday names starting from firstDayOfWeek
 */
export function coarGetLocalizedWeekdays(locale: string, firstDayOfWeek: 1 | 7): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });

  // Jan 1, 2024 is a Monday — use as reference for day mapping.
  const weekdays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(2024, 0, 1 + i);
    weekdays.push(formatter.format(date));
  }

  // weekdays is now [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  if (firstDayOfWeek === 7) {
    const sunday = weekdays.pop();
    if (sunday) weekdays.unshift(sunday);
  }

  return weekdays;
}

/**
 * Formats a Temporal.PlainDate according to the given pattern.
 *
 * @example
 * coarFormatPlainDate(date, 'dd.mm.yyyy') // "05.06.2026"
 * coarFormatPlainDate(date, 'mm/dd/yyyy') // "06/05/2026"
 */
export function coarFormatPlainDate(
  date: Temporal.PlainDate,
  pattern: DateFormatConfig['pattern'],
): string {
  const sep = coarGetDateSeparatorForPattern(pattern);
  const day = String(date.day).padStart(2, '0');
  const month = String(date.month).padStart(2, '0');
  const year = String(date.year);

  switch (pattern) {
    case 'dd.mm.yyyy':
    case 'dd/mm/yyyy':
      return `${day}${sep}${month}${sep}${year}`;
    case 'mm/dd/yyyy':
      return `${month}${sep}${day}${sep}${year}`;
    case 'yyyy-mm-dd':
      return `${year}${sep}${month}${sep}${day}`;
    default:
      return `${day}${sep}${month}${sep}${year}`;
  }
}

/**
 * Parses a date string according to the given pattern.
 * Returns null for invalid dates or dates outside min/max constraints.
 */
export function coarParsePlainDateFromInput(
  text: string,
  pattern: DateFormatConfig['pattern'],
  constraints?: {
    min?: Temporal.PlainDate | null;
    max?: Temporal.PlainDate | null;
  },
): Temporal.PlainDate | null {
  if (!text) return null;

  const sep = coarGetDateSeparatorForPattern(pattern);
  const parts = text.split(sep);
  if (parts.length !== 3) return null;
  if (parts.some((p) => p.length === 0 || !/^\d+$/.test(p))) return null;

  let year: number;
  let month: number;
  let day: number;

  try {
    switch (pattern) {
      case 'dd.mm.yyyy':
      case 'dd/mm/yyyy':
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
        break;
      case 'mm/dd/yyyy':
        month = parseInt(parts[0], 10);
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
        break;
      case 'yyyy-mm-dd':
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
        break;
      default:
        return null;
    }

    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;

    const date = Temporal.PlainDate.from(
      { year, month, day },
      { overflow: 'reject' },
    );

    if (constraints?.min && Temporal.PlainDate.compare(date, constraints.min) < 0) return null;
    if (constraints?.max && Temporal.PlainDate.compare(date, constraints.max) > 0) return null;

    return date;
  } catch {
    return null;
  }
}

/** Converts a Temporal.PlainDate to a JS Date (for Intl formatting). */
export function coarTemporalPlainDateToDate(date: Temporal.PlainDate): Date {
  return new Date(date.year, date.month - 1, date.day);
}

/** Calculates the ISO 8601 week number for a date. */
export function coarCalculateIsoWeekNumber(date: Temporal.PlainDate): number {
  const jsDate = coarTemporalPlainDateToDate(date);
  const dayOfWeek = jsDate.getDay() || 7;
  jsDate.setDate(jsDate.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(jsDate.getFullYear(), 0, 1);
  return Math.ceil(((jsDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Clamps a date within min/max constraints. */
export function coarClampPlainDate(
  date: Temporal.PlainDate,
  constraints?: {
    min?: Temporal.PlainDate | null;
    max?: Temporal.PlainDate | null;
  },
): Temporal.PlainDate {
  if (constraints?.min && Temporal.PlainDate.compare(date, constraints.min) < 0) {
    return constraints.min;
  }
  if (constraints?.max && Temporal.PlainDate.compare(date, constraints.max) > 0) {
    return constraints.max;
  }
  return date;
}

/**
 * Returns a fixed 6×7 calendar grid (42 cells) for the given month.
 * Includes leading/trailing days from adjacent months to fill the grid.
 */
export function coarGetCalendarGridDates(
  viewMonth: Temporal.PlainYearMonth,
  firstDayOfWeek: 1 | 7,
): CoarCalendarGridCell[] {
  const firstDay = viewMonth.toPlainDate({ day: 1 });
  const daysInMonth = viewMonth.daysInMonth;
  const startDayOfWeek = firstDay.dayOfWeek; // Temporal: 1=Mon ... 7=Sun

  let daysFromPrevMonth: number;
  if (firstDayOfWeek === 1) {
    // Monday first: Monday=0, Tuesday=1, ..., Sunday=6
    daysFromPrevMonth = (startDayOfWeek - 1 + 7) % 7;
  } else {
    // Sunday first: Sunday=0, Monday=1, ..., Saturday=6
    daysFromPrevMonth = startDayOfWeek % 7;
  }

  const cells: CoarCalendarGridCell[] = [];

  if (daysFromPrevMonth > 0) {
    const prevMonth = viewMonth.subtract({ months: 1 });
    const prevMonthDays = prevMonth.daysInMonth;
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      cells.push({ date: prevMonth.toPlainDate({ day: prevMonthDays - i }), isOutsideMonth: true });
    }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: viewMonth.toPlainDate({ day: d }), isOutsideMonth: false });
  }

  const remainingDays = 42 - cells.length;
  const nextMonth = viewMonth.add({ months: 1 });
  for (let d = 1; d <= remainingDays; d++) {
    cells.push({ date: nextMonth.toPlainDate({ day: d }), isOutsideMonth: true });
  }

  return cells;
}
