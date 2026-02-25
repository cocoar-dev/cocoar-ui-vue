import { describe, it, expect } from 'vitest';
import { mergeLocalizationData } from './merge-localization-data';
import type { CoarLocalizationData } from '../types';

function makeBase(): CoarLocalizationData {
  return {
    code: 'en',
    date: {
      pattern: 'mm/dd/yyyy',
      firstDayOfWeek: 0,
      monthNames: ['January'],
      monthNamesShort: ['Jan'],
      dayNames: ['Sunday'],
      dayNamesShort: ['Sun'],
      amPm: ['AM', 'PM'],
    },
    number: { decimal: '.', group: ',', grouping: [3] },
    currency: {
      default: 'USD',
      symbols: { USD: '$' },
      position: 'before',
      spacing: false,
      decimals: 2,
    },
    percent: { symbol: '%', spacing: false, decimals: 0 },
  };
}

describe('mergeLocalizationData', () => {
  it('overrides code', () => {
    const result = mergeLocalizationData(makeBase(), { code: 'en-US' });
    expect(result.code).toBe('en-US');
  });

  it('merges date fields', () => {
    const result = mergeLocalizationData(makeBase(), {
      date: { ...makeBase().date, pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 },
    });
    expect(result.date.pattern).toBe('dd.mm.yyyy');
    expect(result.date.firstDayOfWeek).toBe(1);
  });

  it('merges currency symbols', () => {
    const result = mergeLocalizationData(makeBase(), {
      currency: { ...makeBase().currency, symbols: { EUR: '€' } },
    });
    expect(result.currency.symbols.USD).toBe('$');
    expect(result.currency.symbols.EUR).toBe('€');
  });

  it('preserves base when no override', () => {
    const result = mergeLocalizationData(makeBase(), {});
    expect(result).toEqual(makeBase());
  });
});
