// Types
export type {
  CoarLocalizationData,
  CoarDateFormatData,
  CoarNumberFormatData,
  CoarCurrencyFormatData,
  CoarPercentFormatData,
  CoarLocalizationConfig,
  CoarTimezoneProvider,
  CoarTranslations,
  CoarLocaleDataSource,
  CoarTranslationSource,
} from './types';

// Core service
export { CoarLocalizationService } from './localization-service';

// L10n
export { CoarLocalizationDataStore } from './l10n/localization-data-store';
export { IntlLocaleDataSource } from './l10n/intl-locale-data-source';
export { mergeLocalizationData } from './l10n/merge-localization-data';
export { formatNumber, formatCurrency, formatPercent, formatDate } from './l10n/formatters';

// i18n
export { CoarTranslationStore } from './i18n/translation-store';
export { interpolate, isMissingTranslation } from './i18n/interpolate';
export { IntlTranslationSource } from './i18n/intl-translation-source';

// Timezone
export { CoarTimezoneService, BrowserTimezoneProvider } from './timezone/timezone-service';

// Vue integration
export { createCoarLocalization } from './plugin';
export { COAR_LOCALIZATION_KEY } from './injection-keys';
export { useLocalization, useL10n, useI18n, useTimezone } from './composables';
