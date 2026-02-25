import { describe, it, expect, beforeEach } from 'vitest';
import { CoarLocalizationService } from './localization-service';

describe('CoarLocalizationService', () => {
  let service: CoarLocalizationService;

  beforeEach(() => {
    service = new CoarLocalizationService({ defaultLanguage: 'en' });
  });

  it('has default language', () => {
    expect(service.getDefaultLanguage()).toBe('en');
    expect(service.language.value).toBe('en');
  });

  it('is not loading initially', () => {
    expect(service.loading.value).toBe(false);
  });

  it('sets language and loads Intl data', async () => {
    await service.setLanguage('de');
    expect(service.language.value).toBe('de');
    expect(service.localeData.value).toBeDefined();
    expect(service.localeData.value?.code).toBe('de');
  });

  it('loads locale data on setLanguage', async () => {
    await service.setLanguage('en');
    const data = service.localeData.value;
    expect(data).toBeDefined();
    expect(data?.date.monthNames).toHaveLength(12);
    expect(data?.number.decimal).toBeTruthy();
    expect(data?.currency.default).toBeTruthy();
    expect(data?.percent.symbol).toBe('%');
  });

  it('caches loaded data', async () => {
    await service.setLanguage('en');
    const data1 = service.l10nStore.getLocaleData('en');
    await service.setLanguage('de');
    await service.setLanguage('en');
    const data2 = service.l10nStore.getLocaleData('en');
    // Same object — not reloaded
    expect(data1).toBe(data2);
  });

  it('preloads without switching', async () => {
    await service.preloadLanguage('de');
    expect(service.language.value).toBe('en');
    expect(service.l10nStore.hasLocaleData('de')).toBe(true);
  });

  it('translates with fallback when no i18n source', () => {
    // With no translation sources, t() returns key or fallback
    expect(service.t('missing.key')).toBe('missing.key');
    expect(service.t('missing.key', undefined, 'Fallback')).toBe('Fallback');
  });

  it('translates with manually set translations', async () => {
    await service.setLanguage('en');
    service.i18nStore.setTranslation('en', 'hello', 'Hello, World!');
    expect(service.t('hello')).toBe('Hello, World!');
  });

  it('translates with params', async () => {
    await service.setLanguage('en');
    service.i18nStore.setTranslation('en', 'greeting', 'Hi, {name}!');
    expect(service.t('greeting', { name: 'Alice' })).toBe('Hi, Alice!');
  });

  it('falls back to base language for regional locale translations', async () => {
    service.i18nStore.setTranslations('de', { hello: 'Hallo', goodbye: 'Auf Wiedersehen' });
    service.i18nStore.setTranslations('de-AT', { hello: 'Servus' });
    await service.setLanguage('de-AT');
    // de-AT override
    expect(service.t('hello')).toBe('Servus');
    // Falls back to de
    expect(service.t('goodbye')).toBe('Auf Wiedersehen');
    // Missing in both → returns key
    expect(service.t('unknown')).toBe('unknown');
  });

  it('exposes timezone service', () => {
    expect(service.timezoneService).toBeDefined();
    expect(service.timezoneService.timezone.value).toBeTruthy();
  });

  it('provides l10n and i18n stores', () => {
    expect(service.l10nStore).toBeDefined();
    expect(service.i18nStore).toBeDefined();
  });
});
