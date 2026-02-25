import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { CoarTranslations } from '../types';

/**
 * Reactive store for translations.
 * Stores flat key-value maps per language, supports nested JSON flattening.
 */
export class CoarTranslationStore {
  private readonly data = new Map<string, Map<string, string>>();
  private readonly _version = ref(0);

  /** Reactive version counter — use in computed() to react to changes */
  readonly version: Readonly<Ref<number>> = this._version;

  /** Reactive set of loaded language codes */
  readonly loadedLanguages: ComputedRef<Set<string>> = computed(() => {
    void this._version.value;
    return new Set(this.data.keys());
  });

  /**
   * Set translations for a language. Replaces any existing translations.
   * Nested objects are flattened to dot-separated keys.
   */
  setTranslations(language: string, translations: CoarTranslations): void {
    const flat = new Map<string, string>();
    flattenTranslations(translations, '', flat);
    this.data.set(language, flat);
    this._version.value++;
  }

  /**
   * Merge additional translations into existing ones for a language.
   */
  updateTranslations(language: string, translations: CoarTranslations): void {
    const existing = this.data.get(language) ?? new Map<string, string>();
    flattenTranslations(translations, '', existing);
    this.data.set(language, existing);
    this._version.value++;
  }

  /**
   * Get a single translation by key.
   */
  getTranslation(language: string, key: string): string | undefined {
    void this._version.value;
    return this.data.get(language)?.get(key);
  }

  /**
   * Get all translations for a language.
   */
  getTranslations(language: string): Map<string, string> | undefined {
    void this._version.value;
    return this.data.get(language);
  }

  /**
   * Set a single translation.
   */
  setTranslation(language: string, key: string, value: string): void {
    let map = this.data.get(language);
    if (!map) {
      map = new Map();
      this.data.set(language, map);
    }
    map.set(key, value);
    this._version.value++;
  }

  hasLanguage(language: string): boolean {
    void this._version.value;
    return this.data.has(language);
  }

  /**
   * Remove all translations for a specific language.
   */
  clearLanguage(language: string): void {
    this.data.delete(language);
    this._version.value++;
  }

  /**
   * Bump version to trigger reactivity without changing data.
   * Useful after external data updates.
   */
  touch(): void {
    this._version.value++;
  }

  clear(): void {
    this.data.clear();
    this._version.value++;
  }
}

/**
 * Flatten a nested translation object into dot-separated keys.
 * Example: { app: { title: 'Hello' } } → 'app.title' = 'Hello'
 */
function flattenTranslations(
  obj: CoarTranslations,
  prefix: string,
  result: Map<string, string>,
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result.set(fullKey, value);
    } else {
      flattenTranslations(value, fullKey, result);
    }
  }
}
