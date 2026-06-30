import type { InjectionKey } from 'vue';
import type { MapConfig } from './types';

/**
 * Optional app-wide map config. Provide it once
 * (`app.provide(COAR_MAP_CONFIG_KEY, config)`) and omit the `config` prop on
 * individual `<CoarMap>`s. A per-instance `config` prop always wins.
 */
export const COAR_MAP_CONFIG_KEY: InjectionKey<MapConfig> = Symbol.for('coar:map-config');
