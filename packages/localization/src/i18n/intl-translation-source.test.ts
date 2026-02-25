import { describe, it, expect } from 'vitest';
import { IntlTranslationSource } from './intl-translation-source';

describe('IntlTranslationSource', () => {
  const source = new IntlTranslationSource();

  it('generates translations for en', async () => {
    const data = await source.load('en');
    expect(data).toBeDefined();
    expect(Object.keys(data!).length).toBeGreaterThan(30);
  });

  it('includes common.today/yesterday/tomorrow', async () => {
    const data = await source.load('en');
    expect(data!['common.today']).toBeDefined();
    expect(data!['common.yesterday']).toBeDefined();
    expect(data!['common.tomorrow']).toBeDefined();
  });

  it('includes month names (1-12)', async () => {
    const data = await source.load('en');
    for (let i = 1; i <= 12; i++) {
      expect(data![`common.month.${i}`]).toBeDefined();
      expect(data![`common.month.short.${i}`]).toBeDefined();
    }
    expect(data!['common.month.1']).toBe('January');
    expect(data!['common.month.short.1']).toBe('Jan');
  });

  it('includes weekday names (1=Monday through 7=Sunday)', async () => {
    const data = await source.load('en');
    for (let i = 1; i <= 7; i++) {
      expect(data![`common.weekday.${i}`]).toBeDefined();
      expect(data![`common.weekday.short.${i}`]).toBeDefined();
    }
    expect(data!['common.weekday.1']).toBe('Monday');
    expect(data!['common.weekday.7']).toBe('Sunday');
  });

  it('generates locale-specific translations', async () => {
    const de = await source.load('de');
    expect(de!['common.month.1']).toBe('Januar');
    expect(de!['common.weekday.1']).toBe('Montag');
  });

  it('capitalizes first letter of month/weekday names', async () => {
    const data = await source.load('en');
    for (let i = 1; i <= 12; i++) {
      const name = data![`common.month.${i}`];
      expect(name[0]).toBe(name[0].toUpperCase());
    }
  });
});
