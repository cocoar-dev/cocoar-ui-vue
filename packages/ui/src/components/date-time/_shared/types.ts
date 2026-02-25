import type { Temporal } from '@js-temporal/polyfill';

/**
 * Date format configuration for picker components.
 */
export interface DateFormatConfig {
  /** Date format pattern */
  readonly pattern: 'dd.mm.yyyy' | 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
  /** First day of week: 1 = Monday, 7 = Sunday */
  readonly firstDayOfWeek: 1 | 7;
}

/**
 * Represents a date marker for highlighting special dates (holidays, events, etc.).
 * Supports single dates or date ranges.
 */
export interface CoarDateMarker {
  /** Start date of the marker (or single date if no endDate) */
  startDate: Temporal.PlainDate;
  /** Optional end date for date ranges (inclusive) */
  endDate?: Temporal.PlainDate;
  /** Description shown as tooltip on hover */
  description: string;
  /** Optional custom CSS class for styling different marker types */
  cssClass?: string;
}

/** AM/PM period indicator. */
export type CoarTimePeriod = 'AM' | 'PM';

/** Parsed time value with hours (0-23) and minutes (0-59). */
export interface CoarTimeValue {
  readonly hours: number;
  readonly minutes: number;
}

/**
 * Time formatting configuration.
 */
export interface TimeFormatConfig {
  /**
   * Whether to use 24-hour format (true) or 12-hour format with AM/PM (false).
   * When set to 'auto', the format is detected from the user's locale.
   */
  readonly use24Hour: boolean | 'auto';
  /** Step interval for minute selection (e.g. 5 means 0, 5, 10, 15, ...) */
  readonly minuteStep: 1 | 5 | 10 | 15;
}

/** Default time format configuration. */
export const COAR_DEFAULT_TIME_FORMAT: TimeFormatConfig = {
  use24Hour: 'auto',
  minuteStep: 5,
};

/**
 * A single cell in the 6×7 calendar grid.
 */
export interface CoarCalendarGridCell {
  readonly date: Temporal.PlainDate;
  readonly isOutsideMonth: boolean;
}

/**
 * Maps date format patterns to Maskito date modes.
 */
export const COAR_DATE_FORMAT_TO_MASKITO_MODE: Record<
  DateFormatConfig['pattern'],
  'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy/mm/dd'
> = {
  'dd.mm.yyyy': 'dd/mm/yyyy',
  'dd/mm/yyyy': 'dd/mm/yyyy',
  'mm/dd/yyyy': 'mm/dd/yyyy',
  'yyyy-mm-dd': 'yyyy/mm/dd',
};
