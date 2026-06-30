<script setup lang="ts">
/**
 * Visual editor for {@link MapData} — the write counterpart of `<CoarMap>`.
 *
 * Controlled via `v-model:data`: it never mutates the prop, every edit emits a
 * fresh `MapData` (see `internal/map-edit.ts`). Unlike `<CoarMap>` (which tears
 * the whole map down on each data change), the editor builds Leaflet **once**
 * and reconciles its layers in place, so a drag is never interrupted by the
 * `v-model` round-trip.
 *
 * Leaflet (JS + CSS) is imported lazily on mount, exactly like `<CoarMap>`.
 *
 * Slice 1: add-on-click (type-aware), drag-to-move with a live route polyline,
 * selection. Property editing / delete / reorder / route-insert land next.
 */
import { computed, inject, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { LeafletMouseEvent, Map as LeafletMap, Marker, Polyline } from 'leaflet';
import type { MapConfig, MapData, MapPoint } from './types';
import { COAR_MAP_CONFIG_KEY } from './context';
import { boundsOf, resolveBasemap, stopColor, stopEmoji } from './internal/map-model';
import { addPointForType, movePoint } from './internal/map-edit';
import './internal/map-base.css';

type Leaflet = typeof import('leaflet');

const props = defineProps<{
  data: MapData;
  /** Falls back to an app-wide `COAR_MAP_CONFIG_KEY` provide when omitted. */
  config?: MapConfig;
  /** Selected point index (into `data.points`). Two-way via `v-model:selected`. */
  selected?: number | null;
  /** Pause all editing — behaves like a read-only `<CoarMap>` (default `false`). */
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:data': [MapData];
  'update:selected': [number | null];
  'point-click': [{ point: MapPoint; index: number }];
}>();

const injectedConfig = inject(COAR_MAP_CONFIG_KEY, undefined);
const cfg = computed<MapConfig | null>(() => props.config ?? injectedConfig ?? null);

const mapEl = ref<HTMLElement | null>(null);
const mapRef = shallowRef<LeafletMap | null>(null);
const ready = ref(false);

let L: Leaflet | null = null;
/** point index (into `data.points`) → its draggable handle. */
const markers = new Map<number, Marker>();
let polyline: Polyline | null = null;
let dragging = false;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Defensive: keep a category color from breaking out of the inline style. */
function safeColor(value: string): string {
  return /[;"'<>]/.test(value) ? '#3b82f6' : value;
}

function commit(next: MapData): void {
  emit('update:data', next);
}

function onMarkerClick(index: number): void {
  const point = props.data.points[index];
  if (!point) return;
  emit('update:selected', index);
  emit('point-click', { point, index });
}

// ---- Leaflet layer building -------------------------------------------------

function stopIcon(point: MapPoint, config: MapConfig) {
  const color = safeColor(stopColor(point, config));
  const emoji = stopEmoji(point, config);
  return L!.divIcon({
    className: 'coar-map-pin-wrap',
    html: `<span class="coar-map-pin" style="--coar-map-pin-color:${color}"><span class="coar-map-pin__emoji">${escapeHtml(emoji)}</span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function shapeIcon() {
  return L!.divIcon({
    className: 'coar-map-edit-vertex-wrap',
    html: '<span class="coar-map-edit-vertex"></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/** Current vertex positions, reading live marker coords (for the drag preview). */
function liveLatLngs(): [number, number][] {
  return props.data.points.map((p, i) => {
    const ll = markers.get(i)?.getLatLng();
    return ll ? [ll.lat, ll.lng] : [p.lat, p.lng];
  });
}

function updatePolylineLive(): void {
  if (polyline) polyline.setLatLngs(liveLatLngs());
}

function addMarker(point: MapPoint, index: number, config: MapConfig): void {
  const map = mapRef.value;
  if (!map || !L) return;
  const icon = point.kind === 'stop' ? stopIcon(point, config) : shapeIcon();
  const marker = L.marker([point.lat, point.lng], { icon, draggable: !props.readonly });
  if (point.label) marker.bindTooltip(escapeHtml(point.label));
  marker.on('click', () => onMarkerClick(index));
  if (!props.readonly) {
    marker.on('dragstart', () => {
      dragging = true;
    });
    marker.on('drag', updatePolylineLive);
    marker.on('dragend', () => {
      dragging = false;
      const ll = marker.getLatLng();
      commit(movePoint(props.data, index, ll.lat, ll.lng));
    });
  }
  marker.addTo(map);
  markers.set(index, marker);
}

function clearLayers(): void {
  for (const marker of markers.values()) marker.remove();
  markers.clear();
  polyline?.remove();
  polyline = null;
}

/** Sync Leaflet layers to `props.data` (full rebuild — cheap at editing scale). */
function buildLayers(): void {
  const map = mapRef.value;
  const config = cfg.value;
  if (!map || !L || !config) return;
  clearLayers();

  const points = props.data.points;
  if (props.data.type === 'route' && points.length >= 2) {
    polyline = L.polyline(
      points.map((p) => [p.lat, p.lng] as [number, number]),
      { color: '#3b82f6', weight: 4, opacity: 0.85 },
    ).addTo(map);
  }
  points.forEach((point, index) => {
    // Editor shows a draggable handle for every point — including the unnamed
    // shape vertices that `<CoarMap>` renders as pure geometry — so they can be
    // moved. In read-only mode we match the read view and hide those.
    if (point.kind === 'stop' || point.label || !props.readonly) {
      addMarker(point, index, config);
    }
  });
  applySelectedVisual();
}

/** The DOM element backing a marker, for toggling state classes. */
function markerElement(index: number): Element | null {
  return markers.get(index)?.getElement() ?? null;
}

function applySelectedVisual(): void {
  const selectedIndex = props.selected ?? null;
  for (const index of markers.keys()) {
    markerElement(index)?.classList.toggle('coar-map-marker--selected', index === selectedIndex);
  }
}

function onMapClick(e: LeafletMouseEvent): void {
  if (props.readonly) return;
  const next = addPointForType(props.data, e.latlng.lat, e.latlng.lng);
  commit(next);
  emit('update:selected', next.points.length - 1);
}

// ---- Map lifecycle ----------------------------------------------------------

function destroyMap(): void {
  clearLayers();
  if (mapRef.value) {
    mapRef.value.remove();
    mapRef.value = null;
  }
  ready.value = false;
}

async function initMap(): Promise<void> {
  const el = mapEl.value;
  const config = cfg.value;
  if (!el || !config) return;

  destroyMap();

  const mod = await import('leaflet');
  L = (mod as Leaflet & { default?: Leaflet }).default ?? mod;
  await import('leaflet/dist/leaflet.css');
  if (mapEl.value !== el) return;

  const map = L.map(el);
  mapRef.value = map;

  const base = resolveBasemap(props.data, config);
  if (base) {
    L.tileLayer(base.url, {
      subdomains: base.subdomains ?? 'abc',
      attribution: base.attribution,
      maxZoom: base.maxZoom ?? 19,
    }).addTo(map);
  }

  map.on('click', onMapClick);
  buildLayers();

  const viewport = props.data.viewport;
  if (viewport) {
    map.setView([viewport.centerLat, viewport.centerLng], viewport.zoom);
  } else {
    const bounds = boundsOf(props.data.points);
    if (bounds) map.fitBounds(bounds, { padding: [28, 28] });
    else map.setView([0, 0], 2);
  }

  requestAnimationFrame(() => mapRef.value?.invalidateSize());
  ready.value = true;
}

// ---- Imperative bridge (parity with <CoarMap>) ------------------------------

function focusPoint(index: number): void {
  const point = props.data.points[index];
  if (!point || !mapRef.value) return;
  mapRef.value.panTo([point.lat, point.lng]);
  if ((props.selected ?? null) !== index) emit('update:selected', index);
}

function highlightPoint(index: number | null): void {
  for (const i of markers.keys()) {
    markerElement(i)?.classList.toggle('coar-map-marker--highlight', i === index);
  }
}

defineExpose({ focusPoint, highlightPoint });

onMounted(initMap);
onBeforeUnmount(destroyMap);

// Re-create the map only when the resolved config changes; data edits just
// reconcile the layers (never during a drag, never re-fitting the view).
watch(cfg, () => void initMap());
watch(
  () => props.data,
  () => {
    if (!dragging) buildLayers();
  },
  { deep: true },
);
watch(() => props.selected, applySelectedVisual);
</script>

<template>
  <div class="coar-map coar-map-editor" :class="{ 'coar-map--ready': ready }">
    <div ref="mapEl" class="coar-map__canvas" />
    <p v-if="data.caption" class="coar-map__caption">{{ data.caption }}</p>
    <p v-if="!cfg" class="coar-map__nocfg">No map config provided (pass <code>config</code> or provide one).</p>
  </div>
</template>

<!--
  Unscoped: Leaflet injects markers into its own panes, outside this component's
  scoped DOM (same reason as <CoarMap>). Every selector is prefixed `coar-map`.
-->
<style>
.coar-map-editor .coar-map__canvas {
  cursor: crosshair;
}
.coar-map-editor .coar-map-pin-wrap,
.coar-map-editor .coar-map-edit-vertex-wrap {
  cursor: grab;
}

/* Draggable vertex handle for shape (and, in the editor, route) points. */
.coar-map-edit-vertex {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #475569;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
}
.coar-map-marker--highlight .coar-map-edit-vertex,
.coar-map-marker--selected .coar-map-edit-vertex {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
}
</style>
