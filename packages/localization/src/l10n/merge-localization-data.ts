import type { CoarLocalizationData } from '../types';

/**
 * Deep-merge partial locale data into a base locale data object.
 * Partial values override base values; arrays and objects are merged at one level.
 */
export function mergeLocalizationData(
  base: CoarLocalizationData,
  partial: Partial<CoarLocalizationData>,
): CoarLocalizationData {
  return {
    code: partial.code ?? base.code,
    date: partial.date ? { ...base.date, ...partial.date } : base.date,
    number: partial.number ? { ...base.number, ...partial.number } : base.number,
    currency: partial.currency
      ? {
          ...base.currency,
          ...partial.currency,
          symbols: { ...base.currency.symbols, ...partial.currency.symbols },
        }
      : base.currency,
    percent: partial.percent ? { ...base.percent, ...partial.percent } : base.percent,
  };
}
