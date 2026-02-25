import { ref, type Ref } from 'vue';
import type { CoarLocalizationData } from '../types';

/**
 * Reactive store for locale-specific formatting data.
 * Uses a Map keyed by locale code with a version counter for reactivity.
 */
export class CoarLocalizationDataStore {
  private readonly data = new Map<string, CoarLocalizationData>();
  private readonly _version = ref(0);

  /** Reactive version counter — watch this to react to data changes */
  readonly version: Readonly<Ref<number>> = this._version;

  setLocaleData(locale: string, data: CoarLocalizationData): void {
    this.data.set(locale, data);
    this._version.value++;
  }

  getLocaleData(locale: string): CoarLocalizationData | undefined {
    // Access version to register reactive dependency
    void this._version.value;
    return this.data.get(locale);
  }

  hasLocaleData(locale: string): boolean {
    void this._version.value;
    return this.data.has(locale);
  }

  removeLocaleData(locale: string): void {
    this.data.delete(locale);
    this._version.value++;
  }

  clear(): void {
    this.data.clear();
    this._version.value++;
  }
}
