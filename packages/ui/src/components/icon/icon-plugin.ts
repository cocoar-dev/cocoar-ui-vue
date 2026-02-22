import type { Plugin, App } from 'vue';
import {
  CoarIconService,
  CoarIconMapSource,
  CoarHttpIconSource,
  COAR_ICON_SERVICE_KEY,
  COAR_BUILTIN_ICON_SOURCE_KEY,
  type CoarIconSource,
} from './icon-service';
import { CORE_ICONS } from './core-icons';

// ─── Plugin options ──────────────────────────────────────────────────────────

export interface CoarIconPluginOptions {
  /**
   * Additional icon sources to register.
   * The built-in source is always registered automatically.
   */
  sources?: Array<{ key: string; source: CoarIconSource }>;

  /**
   * Override the default icon source key.
   * Defaults to the built-in source ('coar-builtin').
   */
  defaultSource?: string;

  /**
   * Override or extend built-in icons.
   * These are merged with the core icon set.
   */
  builtInOverrides?: Readonly<Record<string, string>>;
}

// ─── Service factory ─────────────────────────────────────────────────────────

/**
 * Creates a configured CoarIconService instance.
 */
export function createCoarIconService(options?: CoarIconPluginOptions): CoarIconService {
  const service = new CoarIconService();

  // Register built-in icons (with optional overrides)
  const builtInIcons = options?.builtInOverrides
    ? { ...CORE_ICONS, ...options.builtInOverrides }
    : CORE_ICONS;
  service.registerSource(COAR_BUILTIN_ICON_SOURCE_KEY, new CoarIconMapSource(builtInIcons));

  // Register additional sources
  if (options?.sources) {
    for (const { key, source } of options.sources) {
      service.registerSource(key, source);
    }
  }

  // Set default source
  if (options?.defaultSource) {
    service.setDefaultSource(options.defaultSource);
  }

  return service;
}

// ─── Vue plugin ──────────────────────────────────────────────────────────────

/**
 * Vue plugin that provides the icon service to all components.
 *
 * Usage:
 * ```ts
 * import { CoarIconPlugin } from '@cocoar/vue-ui';
 *
 * app.use(CoarIconPlugin);
 * // or with options:
 * app.use(CoarIconPlugin, {
 *   sources: [{ key: 'custom', source: new CoarHttpIconSource(...) }],
 *   defaultSource: 'custom',
 * });
 * ```
 */
export const CoarIconPlugin: Plugin<[CoarIconPluginOptions?]> = {
  install(app: App, options?: CoarIconPluginOptions) {
    const service = createCoarIconService(options);
    app.provide(COAR_ICON_SERVICE_KEY, service);
  },
};

export { CoarIconMapSource, CoarHttpIconSource };
