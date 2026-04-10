/**
 * Date format data for a locale.
 */
export interface CoarDateFormatData {
  /** Date pattern, e.g. 'dd.mm.yyyy', 'mm/dd/yyyy' */
  pattern: 'dd.mm.yyyy' | 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd' | 'yyyy/mm/dd';
  /** First day of week: 0=Sunday, 1=Monday, ..., 6=Saturday */
  firstDayOfWeek: number;
  /** Full month names, e.g. ['January', 'February', ...] */
  monthNames: string[];
  /** Abbreviated month names, e.g. ['Jan', 'Feb', ...] */
  monthNamesShort: string[];
  /** Full day names, e.g. ['Sunday', 'Monday', ...] */
  dayNames: string[];
  /** Abbreviated day names, e.g. ['Sun', 'Mon', ...] */
  dayNamesShort: string[];
  /** AM/PM labels */
  amPm: [string, string];
  /** Whether day and month are zero-padded (e.g. '03' vs '3'). Default: true */
  zeroPad?: boolean;
}

/**
 * Number format data for a locale.
 */
export interface CoarNumberFormatData {
  /** Decimal separator, e.g. '.' or ',' */
  decimal: string;
  /** Grouping separator, e.g. ',' or '.' */
  group: string;
  /** Grouping sizes, e.g. [3] for standard 3-digit grouping */
  grouping: number[];
}

/**
 * Currency format data for a locale.
 */
export interface CoarCurrencyFormatData {
  /** Default currency code, e.g. 'USD', 'EUR' */
  default: string;
  /** Map of currency code → symbol, e.g. { USD: '$', EUR: '€' } */
  symbols: Record<string, string>;
  /** Symbol position relative to the number */
  position: 'before' | 'after';
  /** Whether there's a space between symbol and number */
  spacing: boolean;
  /** Default number of decimal places */
  decimals: number;
}

/**
 * Percent format data for a locale.
 */
export interface CoarPercentFormatData {
  /** Percent symbol */
  symbol: string;
  /** Whether there's a space between number and symbol */
  spacing: boolean;
  /** Default number of decimal places */
  decimals: number;
}

/**
 * Complete localization data for a single locale.
 */
export interface CoarLocalizationData {
  /** Locale code, e.g. 'en', 'de', 'en-US' */
  code: string;
  /** Date formatting data */
  date: CoarDateFormatData;
  /** Number formatting data */
  number: CoarNumberFormatData;
  /** Currency formatting data */
  currency: CoarCurrencyFormatData;
  /** Percent formatting data */
  percent: CoarPercentFormatData;
}

/**
 * Configuration for the localization system.
 */
export interface CoarLocalizationConfig {
  /** Default language to use. Defaults to 'en'. */
  defaultLanguage?: string;
  /** Custom timezone providers (checked before browser default) */
  timezoneProviders?: CoarTimezoneProvider[];
  /** HTTP URL builder for loading locale data. Receives language code, returns URL. */
  l10nUrl?: (language: string) => string;
  /** HTTP URL builder for loading translations. Receives language code, returns URL. */
  i18nUrl?: (language: string) => string;
}

/**
 * A pluggable timezone provider.
 * Returns the current IANA timezone identifier, or null if unknown.
 */
export interface CoarTimezoneProvider {
  /** Returns the current timezone, or null to defer to next provider */
  getTimezone(): string | null;
}

/**
 * Nested or flat translation object.
 * Nested objects are flattened to dot-separated keys.
 */
export interface CoarTranslations {
  [key: string]: string | CoarTranslations;
}

/**
 * A source that can load locale data for a given language.
 */
export interface CoarLocaleDataSource {
  load(language: string): Promise<Partial<CoarLocalizationData> | null>;
}

/**
 * A source that can load translations for a given language.
 */
export interface CoarTranslationSource {
  load(language: string): Promise<CoarTranslations | null>;
}
