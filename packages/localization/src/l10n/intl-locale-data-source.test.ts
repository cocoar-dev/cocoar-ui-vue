import { describe, it, expect } from 'vitest';
import { IntlLocaleDataSource } from './intl-locale-data-source';

describe('IntlLocaleDataSource', () => {
  const source = new IntlLocaleDataSource();

  it('loads data for "en"', async () => {
    const data = await source.load('en');
    expect(data.code).toBe('en');
    expect(data.date.monthNames).toHaveLength(12);
    expect(data.date.monthNamesShort).toHaveLength(12);
    expect(data.date.dayNames).toHaveLength(7);
    expect(data.date.dayNamesShort).toHaveLength(7);
    expect(data.date.amPm).toHaveLength(2);
    expect(data.number.decimal).toBeTruthy();
    expect(data.number.group).toBeTruthy();
    expect(data.currency.default).toBeTruthy();
    expect(data.percent.symbol).toBe('%');
  });

  it('loads data for "de"', async () => {
    const data = await source.load('de');
    expect(data.code).toBe('de');
    expect(data.date.monthNames[0]).toBeTruthy();
    expect(data.number.decimal).toBe(',');
    expect(data.number.group).toBe('.');
  });

  it('loads data for "en-US"', async () => {
    const data = await source.load('en-US');
    expect(data.code).toBe('en-US');
    expect(data.date.pattern).toBe('mm/dd/yyyy');
  });

  it('provides valid date pattern', async () => {
    const data = await source.load('en');
    const validPatterns = ['dd.mm.yyyy', 'dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd'];
    expect(validPatterns).toContain(data.date.pattern);
  });

  it('provides numeric firstDayOfWeek', async () => {
    const data = await source.load('en');
    expect(data.date.firstDayOfWeek).toBeGreaterThanOrEqual(0);
    expect(data.date.firstDayOfWeek).toBeLessThanOrEqual(6);
  });
});
