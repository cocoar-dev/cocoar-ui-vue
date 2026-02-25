import { ref, type Ref } from 'vue';
import type { CoarTimezoneProvider } from '../types';

/**
 * Default timezone provider using the browser's Intl API.
 */
export class BrowserTimezoneProvider implements CoarTimezoneProvider {
  getTimezone(): string | null {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }
}

/**
 * Reactive timezone service.
 * Resolves timezone from pluggable providers with browser fallback.
 */
export class CoarTimezoneService {
  private readonly providers: CoarTimezoneProvider[];
  private readonly _timezone: Ref<string>;

  /** Reactive current timezone (IANA identifier) */
  get timezone(): Readonly<Ref<string>> {
    return this._timezone;
  }

  constructor(customProviders: CoarTimezoneProvider[] = []) {
    this.providers = [...customProviders, new BrowserTimezoneProvider()];
    this._timezone = ref(this.resolve());
  }

  /** Re-resolve the timezone from providers and update the reactive value */
  refresh(): void {
    this._timezone.value = this.resolve();
  }

  private resolve(): string {
    for (const provider of this.providers) {
      const tz = provider.getTimezone();
      if (tz) return tz;
    }
    return 'UTC';
  }
}
