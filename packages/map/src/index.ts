/**
 * `@cocoar/vue-map` — a standalone, data-driven interactive Leaflet map for
 * Vue 3. It has no dependency on (or knowledge of) markdown or any embedding
 * layer; a consumer feeds it resolved {@link MapData} + {@link MapConfig}.
 */
export { default as CoarMap } from './CoarMap.vue';
export { COAR_MAP_CONFIG_KEY } from './context';

// Pure model helpers — useful for consumers building their own fallbacks/legends.
export {
  boundsOf,
  categoryMap,
  fallbackEntries,
  legendCategories,
  resolveBasemap,
  stopColor,
  stopEmoji,
} from './internal/map-model';
export type { FallbackEntry } from './internal/map-model';

export type {
  MapBasemap,
  MapCategory,
  MapConfig,
  MapData,
  MapPoint,
  MapPointKind,
  MapType,
  MapViewport,
} from './types';
