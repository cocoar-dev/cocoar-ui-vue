import type { InjectionKey } from 'vue';
import type { CoarLocalizationService } from './localization-service';

/**
 * Injection key for the localization service.
 * Used by useLocalization(), useI18n(), and useTimezone() composables.
 * Also used by vue-ui components for optional inject.
 */
export const COAR_LOCALIZATION_KEY: InjectionKey<CoarLocalizationService> =
  Symbol('coar-localization');
