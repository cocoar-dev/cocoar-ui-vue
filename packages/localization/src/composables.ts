import { inject, computed, type ComputedRef, type Ref } from 'vue';
import { COAR_LOCALIZATION_KEY } from './injection-keys';
import type { CoarLocalizationService } from './localization-service';
import type { CoarLocalizationData } from './types';
import { formatNumber, formatCurrency, formatPercent, formatDate } from './l10n/formatters';

/**
 * Access the full localization service.
 * Returns null if the localization plugin is not installed.
 */
export function useLocalization(): CoarLocalizationService | null {
  return inject(COAR_LOCALIZATION_KEY, null);
}

/**
 * Reactive localization composable with formatting utilities.
 * Provides reactive language, locale data, and formatting functions
 * that automatically update when the language changes.
 */
export function useL10n() {
  const service = inject(COAR_LOCALIZATION_KEY, null);

  const language: Ref<string> | ComputedRef<string> = service
    ? service.language
    : computed(() => navigator.language || 'en');

  const localeData: ComputedRef<CoarLocalizationData | undefined> = service
    ? service.localeData
    : computed(() => undefined);

  return {
    /** Current language (reactive) */
    language,
    /** Current locale data (reactive) */
    localeData,
    /** Format a number */
    fmtNumber: (value: number, decimals?: number): string => {
      const data = localeData.value;
      if (!data) return value.toFixed(decimals ?? 2);
      return formatNumber(value, data.number, decimals);
    },
    /** Format a currency value */
    fmtCurrency: (value: number, currencyCode?: string): string => {
      const data = localeData.value;
      if (!data) return value.toFixed(2);
      return formatCurrency(value, data, currencyCode);
    },
    /** Format a percentage (0.25 → "25%") */
    fmtPercent: (value: number, decimals?: number): string => {
      const data = localeData.value;
      if (!data) return `${(value * 100).toFixed(decimals ?? 0)}%`;
      return formatPercent(value, data, decimals);
    },
    /** Format a date */
    fmtDate: (value: Date | string, includeTime = false): string => {
      const data = localeData.value;
      if (!data) return String(value);
      return formatDate(value, data.date, includeTime);
    },
  };
}

/**
 * i18n composable for translations.
 * Provides a reactive translation function.
 */
export function useI18n() {
  const service = inject(COAR_LOCALIZATION_KEY, null);

  return {
    /** Current language (reactive) */
    language: service ? service.language : computed(() => navigator.language || 'en'),

    /**
     * Translate a key. Returns the key if no translation found.
     * Reactive — updates when language changes.
     */
    t: (key: string, params?: Record<string, unknown>, fallback?: string): string => {
      if (!service) return fallback ?? key;
      return service.t(key, params, fallback);
    },

    /**
     * Create a computed translation ref that reacts to language changes.
     */
    tRef: (key: string, params?: Record<string, unknown>, fallback?: string): ComputedRef<string> => {
      if (!service) return computed(() => fallback ?? key);
      return computed(() => service.t(key, params, fallback));
    },
  };
}

/**
 * Timezone composable.
 */
export function useTimezone() {
  const service = inject(COAR_LOCALIZATION_KEY, null);

  return {
    /** Current timezone (reactive IANA identifier) */
    timezone: service
      ? service.timezoneService.timezone
      : computed(() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch {
            return 'UTC';
          }
        }),
    /** Re-resolve timezone from providers */
    refresh: () => service?.timezoneService.refresh(),
  };
}
