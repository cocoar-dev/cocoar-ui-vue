/**
 * Range label — the human-readable title of the visible window
 * ("15.–21. Juni 2026", "June 2026", "Monday, 15 June 2026", "2026").
 *
 * One formatter for the shell header AND `api.rangeLabel`, so a host
 * that hides the header and draws its own controls shows exactly the
 * text the built-in header would have shown.
 *
 * Pure: everything it needs comes in as arguments. Dates are anchored
 * at UTC midnight and formatted with `timeZone: 'UTC'` so Intl renders
 * the exact calendar date and never drifts by a day.
 */

import { Temporal } from '@js-temporal/polyfill';
import { buildFormatOptions, type FormatOverrides } from './temporal';
import type { CalendarView, ViewWindow } from './types';

export interface RangeLabelOptions extends FormatOverrides {
  view: CalendarView;
  /** The rendered window — `[start, end)` as ISO dates in the display zone. */
  window: ViewWindow;
  /** The builder's cursor date (day / month / year labels are cursor-based). */
  cursor: Temporal.PlainDate;
  locale: string;
}

const SHORT_RANGE: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
};
const LONG_DAY: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
};
const MONTH: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', timeZone: 'UTC' };

function toDate(d: Temporal.PlainDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
}

/** Format the label for `view` over `window`, respecting the C6 format overrides. */
export function formatRangeLabel(opts: RangeLabelOptions): string {
  const { view, window, cursor, locale } = opts;
  const overrides: FormatOverrides = {
    dateStyle: opts.dateStyle,
    timeStyle: opts.timeStyle,
    hour12: opts.hour12,
  };
  const start = Temporal.PlainDate.from(window.start);
  const lastVisible = Temporal.PlainDate.from(window.end).subtract({ days: 1 });
  const range = () =>
    new Intl.DateTimeFormat(locale, buildFormatOptions(SHORT_RANGE, overrides)).formatRange(
      toDate(start),
      toDate(lastVisible),
    );
  const single = (base: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, buildFormatOptions(base, overrides)).format(toDate(cursor));

  switch (view) {
    case 'day':
      // Multi-day mode spans several columns → a range; one column → the day.
      return start.until(lastVisible, { largestUnit: 'day' }).days > 0 ? range() : single(LONG_DAY);
    case 'dayAgenda':
      return single(LONG_DAY);
    case 'week':
    case 'workWeek':
      // The window is the full week for workWeek too; the label reflects
      // that span (not the filtered render set) so navigation reads the
      // same as week view.
      return range();
    case 'month':
    case 'monthList':
      return single(MONTH);
    case 'agenda':
    case 'timeline':
      return range();
    case 'year':
      return String(cursor.year);
    default:
      return '';
  }
}
