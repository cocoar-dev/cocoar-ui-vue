import type { CoarTranslationSource, CoarTranslations } from '../types';

/**
 * Generates common translations from browser Intl APIs.
 * Always registered as the first translation source so HTTP translations can override.
 *
 * Generated keys:
 * - common.today, common.yesterday, common.tomorrow (Intl.RelativeTimeFormat)
 * - common.month.1–12 (full month names, 1=January)
 * - common.month.short.1–12 (abbreviated month names)
 * - common.weekday.1–7 (full day names, 1=Monday, 7=Sunday)
 * - common.weekday.short.1–7 (abbreviated day names)
 */
export class IntlTranslationSource implements CoarTranslationSource {
  async load(language: string): Promise<CoarTranslations | null> {
    const translations: CoarTranslations = {};

    // Relative time: today, yesterday, tomorrow
    try {
      const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
      translations['common.today'] = rtf.format(0, 'day');
      translations['common.yesterday'] = rtf.format(-1, 'day');
      translations['common.tomorrow'] = rtf.format(1, 'day');
    } catch {
      // Intl.RelativeTimeFormat not available
    }

    // Month names (1-indexed: 1=January, 12=December)
    try {
      const monthLong = new Intl.DateTimeFormat(language, { month: 'long' });
      const monthShort = new Intl.DateTimeFormat(language, { month: 'short' });
      for (let m = 0; m < 12; m++) {
        const date = new Date(2024, m, 1);
        translations[`common.month.${m + 1}`] = monthLong.format(date);
        translations[`common.month.short.${m + 1}`] = monthShort.format(date);
      }
    } catch {
      // Fallback: skip month names
    }

    // Weekday names (1-indexed from Monday: 1=Monday, 7=Sunday)
    try {
      const dayLong = new Intl.DateTimeFormat(language, { weekday: 'long' });
      const dayShort = new Intl.DateTimeFormat(language, { weekday: 'short' });
      // 2024-01-08 is a Monday
      for (let d = 0; d < 7; d++) {
        const date = new Date(2024, 0, 8 + d); // Mon=8, Tue=9, ..., Sun=14
        translations[`common.weekday.${d + 1}`] = dayLong.format(date);
        translations[`common.weekday.short.${d + 1}`] = dayShort.format(date);
      }
    } catch {
      // Fallback: skip day names
    }

    return translations;
  }
}
