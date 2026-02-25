import { describe, it, expect, beforeEach } from 'vitest';
import { CoarLocalizationDataStore } from '../l10n/localization-data-store';
import type { CoarLocalizationData } from '../types';

function makeLocaleData(code: string): CoarLocalizationData {
  return {
    code,
    date: {
      pattern: 'dd.mm.yyyy',
      firstDayOfWeek: 1,
      monthNames: Array.from({ length: 12 }, (_, i) => `Month${i}`),
      monthNamesShort: Array.from({ length: 12 }, (_, i) => `M${i}`),
      dayNames: Array.from({ length: 7 }, (_, i) => `Day${i}`),
      dayNamesShort: Array.from({ length: 7 }, (_, i) => `D${i}`),
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

describe('CoarLocalizationDataStore', () => {
  let store: CoarLocalizationDataStore;

  beforeEach(() => {
    store = new CoarLocalizationDataStore();
  });

  it('starts empty', () => {
    expect(store.hasLocaleData('en')).toBe(false);
    expect(store.getLocaleData('en')).toBeUndefined();
  });

  it('stores and retrieves locale data', () => {
    const data = makeLocaleData('en');
    store.setLocaleData('en', data);
    expect(store.hasLocaleData('en')).toBe(true);
    expect(store.getLocaleData('en')).toEqual(data);
  });

  it('removes locale data', () => {
    store.setLocaleData('en', makeLocaleData('en'));
    store.removeLocaleData('en');
    expect(store.hasLocaleData('en')).toBe(false);
  });

  it('clears all data', () => {
    store.setLocaleData('en', makeLocaleData('en'));
    store.setLocaleData('de', makeLocaleData('de'));
    store.clear();
    expect(store.hasLocaleData('en')).toBe(false);
    expect(store.hasLocaleData('de')).toBe(false);
  });

  it('increments version on changes', () => {
    const v0 = store.version.value;
    store.setLocaleData('en', makeLocaleData('en'));
    expect(store.version.value).toBe(v0 + 1);
    store.removeLocaleData('en');
    expect(store.version.value).toBe(v0 + 2);
  });
});
