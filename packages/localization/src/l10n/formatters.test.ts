import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency, formatPercent, formatDate } from './formatters';
import type { CoarLocalizationData, CoarNumberFormatData, CoarDateFormatData } from '../types';

const enNumber: CoarNumberFormatData = { decimal: '.', group: ',', grouping: [3] };
const deNumber: CoarNumberFormatData = { decimal: ',', group: '.', grouping: [3] };

function makeEnData(): CoarLocalizationData {
  return {
    code: 'en',
    date: {
      pattern: 'mm/dd/yyyy',
      firstDayOfWeek: 0,
      monthNames: [], monthNamesShort: [], dayNames: [], dayNamesShort: [],
      amPm: ['AM', 'PM'],
    },
    number: enNumber,
    currency: {
      default: 'USD', symbols: { USD: '$', EUR: '€' },
      position: 'before', spacing: false, decimals: 2,
    },
    percent: { symbol: '%', spacing: false, decimals: 0 },
  };
}

function makeDeData(): CoarLocalizationData {
  return {
    code: 'de',
    date: {
      pattern: 'dd.mm.yyyy',
      firstDayOfWeek: 1,
      monthNames: [], monthNamesShort: [], dayNames: [], dayNamesShort: [],
      amPm: ['AM', 'PM'],
    },
    number: deNumber,
    currency: {
      default: 'EUR', symbols: { EUR: '€', USD: '$' },
      position: 'after', spacing: true, decimals: 2,
    },
    percent: { symbol: '%', spacing: true, decimals: 1 },
  };
}

describe('formatNumber', () => {
  it('formats with EN separators', () => {
    expect(formatNumber(1234567.89, enNumber, 2)).toBe('1,234,567.89');
  });

  it('formats with DE separators', () => {
    expect(formatNumber(1234567.89, deNumber, 2)).toBe('1.234.567,89');
  });

  it('formats with 0 decimals', () => {
    expect(formatNumber(1234, enNumber, 0)).toBe('1,234');
  });

  it('formats negative numbers', () => {
    expect(formatNumber(-42.5, enNumber, 1)).toBe('-42.5');
  });

  it('formats small numbers without grouping', () => {
    expect(formatNumber(99, enNumber, 0)).toBe('99');
  });
});

describe('formatCurrency', () => {
  it('formats USD in EN locale', () => {
    expect(formatCurrency(1234.56, makeEnData())).toBe('$1,234.56');
  });

  it('formats EUR in DE locale', () => {
    expect(formatCurrency(1234.56, makeDeData())).toBe('1.234,56\u00A0€');
  });

  it('uses custom currency code', () => {
    expect(formatCurrency(99.99, makeEnData(), 'EUR')).toBe('€99.99');
  });

  it('resolves symbol via Intl when not in symbols map', () => {
    expect(formatCurrency(10, makeEnData(), 'GBP')).toBe('£10.00');
  });
});

describe('formatPercent', () => {
  it('formats 25%', () => {
    expect(formatPercent(0.25, makeEnData())).toBe('25%');
  });

  it('formats with DE spacing and decimals', () => {
    expect(formatPercent(0.256, makeDeData())).toBe('25,6\u00A0%');
  });

  it('formats 100%', () => {
    expect(formatPercent(1, makeEnData())).toBe('100%');
  });
});

describe('formatDate', () => {
  const enDate: CoarDateFormatData = {
    pattern: 'mm/dd/yyyy',
    firstDayOfWeek: 0,
    monthNames: [], monthNamesShort: [], dayNames: [], dayNamesShort: [],
    amPm: ['AM', 'PM'],
  };

  const deDate: CoarDateFormatData = {
    pattern: 'dd.mm.yyyy',
    firstDayOfWeek: 1,
    monthNames: [], monthNamesShort: [], dayNames: [], dayNamesShort: [],
    amPm: ['AM', 'PM'],
  };

  const isoDate: CoarDateFormatData = {
    pattern: 'yyyy-mm-dd',
    firstDayOfWeek: 1,
    monthNames: [], monthNamesShort: [], dayNames: [], dayNamesShort: [],
    amPm: ['AM', 'PM'],
  };

  it('formats EN date', () => {
    expect(formatDate(new Date(2024, 2, 15), enDate)).toBe('03/15/2024');
  });

  it('formats DE date', () => {
    expect(formatDate(new Date(2024, 2, 15), deDate)).toBe('15.03.2024');
  });

  it('formats ISO date', () => {
    expect(formatDate(new Date(2024, 2, 15), isoDate)).toBe('2024-03-15');
  });

  it('formats with time', () => {
    expect(formatDate(new Date(2024, 2, 15, 14, 30), enDate, true)).toBe('03/15/2024 14:30');
  });

  it('handles string input', () => {
    expect(formatDate('2024-03-15', enDate)).toBe('03/15/2024');
  });

  it('returns original string for invalid date', () => {
    expect(formatDate('not-a-date', enDate)).toBe('not-a-date');
  });
});
