import type { App, Plugin } from 'vue';
import type { CoarLocalizationConfig } from './types';
import { CoarLocalizationService } from './localization-service';
import { COAR_LOCALIZATION_KEY } from './injection-keys';

/**
 * Create the Coar Localization Vue plugin.
 *
 * @example
 * ```ts
 * import { createCoarLocalization } from '@cocoar/vue-localization';
 *
 * const app = createApp(App);
 * app.use(createCoarLocalization({
 *   defaultLanguage: 'en',
 *   i18nUrl: (lang) => `/i18n/${lang}.json`,
 *   l10nUrl: (lang) => `/locales/${lang}.json`,
 * }));
 * ```
 */
export function createCoarLocalization(config: CoarLocalizationConfig = {}): Plugin & {
  service: CoarLocalizationService;
} {
  const service = new CoarLocalizationService(config);

  const plugin: Plugin & { service: CoarLocalizationService } = {
    service,
    install(app: App) {
      app.provide(COAR_LOCALIZATION_KEY, service);
    },
  };

  return plugin;
}
