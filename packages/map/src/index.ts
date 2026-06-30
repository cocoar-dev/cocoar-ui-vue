/**
 * `@cocoar/vue-map` — a standalone, data-driven interactive Leaflet map for
 * Vue 3. It has no dependency on (or knowledge of) markdown or any embedding
 * layer; a consumer feeds it resolved {@link MapData} + {@link MapConfig}.
 */
export { default as CoarMap } from './CoarMap.vue';
export { default as CoarMapEditor } from './CoarMapEditor.vue';
export { default as CoarMapPointList } from './CoarMapPointList.vue';
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

// Pure editing operations — for consumers driving edits from their own UI.
export {
  addPointForType,
  insertOnSegment,
  movePoint,
  nearestSegment,
  normalizeLatLng,
  removePoint,
  reorderPoint,
  selectionAfterRemove,
  selectionAfterReorder,
  setViewport,
  updatePoint,
} from './internal/map-edit';
export type { NewPointInit } from './internal/map-edit';

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
