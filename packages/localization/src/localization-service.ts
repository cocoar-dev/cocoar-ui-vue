import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type {
  CoarLocalizationConfig,
  CoarLocalizationData,
  CoarLocaleDataSource,
  CoarTranslationSource,
  CoarTranslations,
} from './types';
import { CoarLocalizationDataStore } from './l10n/localization-data-store';
import { IntlLocaleDataSource } from './l10n/intl-locale-data-source';
import { mergeLocalizationData } from './l10n/merge-localization-data';
import { CoarTranslationStore } from './i18n/translation-store';
import { interpolate } from './i18n/interpolate';
import { IntlTranslationSource } from './i18n/intl-translation-source';
import { CoarTimezoneService } from './timezone/timezone-service';

/**
 * Core localization service.
 * Manages language state, locale data loading, translations, and timezone.
 */
export class CoarLocalizationService {
  private readonly defaultLanguage: string;
  private readonly _language: Ref<string>;
  private readonly _loading: Ref<boolean>;

  readonly l10nStore: CoarLocalizationDataStore;
  readonly i18nStore: CoarTranslationStore;
  readonly timezoneService: CoarTimezoneService;

  private readonly l10nSources: CoarLocaleDataSource[];
  private readonly i18nSources: CoarTranslationSource[];

  /** Reactive current language */
  get language(): Readonly<Ref<string>> {
    return this._language;
  }

  /** Reactive loading state */
  get loading(): Readonly<Ref<boolean>> {
    return this._loading;
  }

  /** Computed current locale data — reactive, updates on language change */
  readonly localeData: ComputedRef<CoarLocalizationData | undefined>;

  constructor(config: CoarLocalizationConfig = {}) {
    this.defaultLanguage = config.defaultLanguage ?? 'en';
    this._language = ref(this.defaultLanguage);
    this._loading = ref(false);

    this.l10nStore = new CoarLocalizationDataStore();
    this.i18nStore = new CoarTranslationStore();
    this.timezoneService = new CoarTimezoneService(config.timezoneProviders);

    // Build source chains
    const intlSource = new IntlLocaleDataSource();
    this.l10nSources = [intlSource];

    // Intl translation source always first (auto-generates common keys)
    const intlTranslationSource = new IntlTranslationSource();
    this.i18nSources = [intlTranslationSource];

    // Add HTTP sources if configured
    if (config.l10nUrl) {
      this.l10nSources.push(new HttpLocaleDataSource(config.l10nUrl));
    }
    if (config.i18nUrl) {
      this.i18nSources.push(new HttpTranslationSource(config.i18nUrl));
    }

    // Computed locale data for current language
    this.localeData = computed(() => {
      return this.l10nStore.getLocaleData(this._language.value);
    });
  }

  /** Get the configured default language */
  getDefaultLanguage(): string {
    return this.defaultLanguage;
  }

  /**
   * Change the current language.
   * Loads locale data and translations if not already cached.
   */
  async setLanguage(language: string): Promise<void> {
    this._loading.value = true;
    try {
      await this.loadDataForLanguage(language);
      this._language.value = language;
    } finally {
      this._loading.value = false;
    }
  }

  /**
   * Preload data for a language without switching to it.
   */
  async preloadLanguage(language: string): Promise<void> {
    await this.loadDataForLanguage(language);
  }

  /**
   * Force reload data for a language from all sources, clearing the cache.
   * Useful when external data changes at runtime (e.g. SignalR push, user profile update).
   * If no language is specified, reloads the current language.
   */
  async reloadLanguage(language?: string): Promise<void> {
    const lang = language ?? this._language.value;
    this._loading.value = true;
    try {
      // Clear cached data so sources are re-queried
      this.l10nStore.removeLocaleData(lang);
      this.i18nStore.clearLanguage(lang);
      await this.loadDataForLanguage(lang);
      // Trigger reactivity even if language ref hasn't changed
      this.i18nStore.touch();
    } finally {
      this._loading.value = false;
    }
  }

  /**
   * Translate a key using the current language.
   * For regional locales (e.g. de-AT), falls back to the base language (de).
   * Returns the key itself if no translation is found.
   */
  t(key: string, params?: Record<string, unknown>, fallback?: string): string {
    const lang = this._language.value;
    let value = this.i18nStore.getTranslation(lang, key);
    // Fallback to base language for regional locales (e.g. de-AT → de)
    if (value === undefined && lang.includes('-')) {
      const baseLang = lang.split('-')[0];
      value = this.i18nStore.getTranslation(baseLang, key);
    }
    const template = value ?? fallback ?? key;
    return interpolate(template, params);
  }

  /**
   * Add a custom locale data source (loaded after Intl, before HTTP).
   */
  addLocaleDataSource(source: CoarLocaleDataSource): void {
    // Insert before HTTP sources (which are always last)
    const httpIdx = this.l10nSources.findIndex((s) => s instanceof HttpLocaleDataSource);
    if (httpIdx >= 0) {
      this.l10nSources.splice(httpIdx, 0, source);
    } else {
      this.l10nSources.push(source);
    }
  }

  /**
   * Add a custom translation source.
   */
  addTranslationSource(source: CoarTranslationSource): void {
    this.i18nSources.push(source);
  }

  private async loadDataForLanguage(language: string): Promise<void> {
    const tasks: Promise<void>[] = [];

    // Load locale data if not cached
    if (!this.l10nStore.hasLocaleData(language)) {
      tasks.push(this.loadLocaleData(language));
    }

    // Load translations if not cached
    if (!this.i18nStore.hasLanguage(language)) {
      tasks.push(this.loadTranslations(language));
    }

    await Promise.all(tasks);
  }

  private async loadLocaleData(language: string): Promise<void> {
    let result: CoarLocalizationData | null = null;

    for (const source of this.l10nSources) {
      try {
        const data = await source.load(language);
        if (data) {
          if (result) {
            result = mergeLocalizationData(result, data);
          } else {
            result = data as CoarLocalizationData;
          }
        }
      } catch {
        // Skip failed sources, continue with next
      }
    }

    if (result) {
      this.l10nStore.setLocaleData(language, result);
    }
  }

  private async loadTranslations(language: string): Promise<void> {
    for (const source of this.i18nSources) {
      try {
        const translations = await source.load(language);
        if (translations) {
          if (this.i18nStore.hasLanguage(language)) {
            this.i18nStore.updateTranslations(language, translations);
          } else {
            this.i18nStore.setTranslations(language, translations);
          }
        }
      } catch {
        // Skip failed sources
      }
    }

    // Ensure language entry exists even if no sources provided translations
    if (!this.i18nStore.hasLanguage(language)) {
      this.i18nStore.setTranslations(language, {});
    }
  }
}

/**
 * HTTP-based locale data source.
 * For regional locales (e.g. de-AT), loads the base language (de) first,
 * then tries the regional variant and deep-merges on top.
 */
class HttpLocaleDataSource implements CoarLocaleDataSource {
  constructor(private readonly urlBuilder: (language: string) => string) {}

  async load(language: string): Promise<Partial<CoarLocalizationData> | null> {
    const baseLang = language.includes('-') ? language.split('-')[0] : null;
    let result: Partial<CoarLocalizationData> | null = null;

    // Load base language first (e.g. "de" for "de-AT")
    if (baseLang) {
      try {
        const response = await fetch(this.urlBuilder(baseLang));
        if (response.ok) {
          result = await response.json();
        }
      } catch {
        // Base language not available, continue
      }
    }

    // Load exact language (or regional override)
    try {
      const response = await fetch(this.urlBuilder(language));
      if (response.ok) {
        const data = await response.json();
        if (result) {
          result = mergeLocalizationData(result as CoarLocalizationData, data);
        } else {
          result = data;
        }
      }
    } catch {
      // Regional not available, base (if loaded) is used
    }

    return result;
  }
}

/**
 * HTTP-based translation source.
 * For regional locales (e.g. de-AT), loads the base language (de) first,
 * then tries the regional variant and merges on top.
 */
class HttpTranslationSource implements CoarTranslationSource {
  constructor(private readonly urlBuilder: (language: string) => string) {}

  async load(language: string): Promise<CoarTranslations | null> {
    const baseLang = language.includes('-') ? language.split('-')[0] : null;
    let result: CoarTranslations | null = null;

    // Load base language first (e.g. "de" for "de-AT")
    if (baseLang) {
      try {
        const response = await fetch(this.urlBuilder(baseLang));
        if (response.ok) {
          result = await response.json();
        }
      } catch {
        // Base language not available, continue
      }
    }

    // Load exact language (or regional override)
    try {
      const response = await fetch(this.urlBuilder(language));
      if (response.ok) {
        const data = await response.json();
        if (result) {
          // Merge regional over base
          result = { ...result, ...data };
        } else {
          result = data;
        }
      }
    } catch {
      // Regional not available, base (if loaded) is used
    }

    return result;
  }
}
