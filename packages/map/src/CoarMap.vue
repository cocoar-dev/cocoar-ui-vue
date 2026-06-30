<script setup lang="ts">
/**
 * Interactive Leaflet map. Standalone and data-driven — it takes resolved
 * {@link MapData} + {@link MapConfig} and knows nothing about where they came
 * from (no ids, no fetching, no markdown).
 *
 * Leaflet (JS + CSS) is imported **lazily** on mount, so it only loads on pages
 * that actually render a map. A crawlable, no-JS `<ol>` fallback of the named
 * points is shown until the map hydrates (and if Leaflet fails to load).
 */
import { computed, inject, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { CircleMarker, Map as LeafletMap, Marker } from 'leaflet';
import type { MapConfig, MapData, MapPoint } from './types';
import { COAR_MAP_CONFIG_KEY } from './context';
import {
  boundsOf,
  fallbackEntries,
  legendCategories,
  resolveBasemap,
  stopColor,
  stopEmoji,
} from './internal/map-model';
import './internal/map-base.css';

type Leaflet = typeof import('leaflet');

const props = defineProps<{
  data: MapData;
  /** Falls back to an app-wide `COAR_MAP_CONFIG_KEY` provide when omitted. */
  config?: MapConfig;
  /**
   * Selected point index (index into `data.points`). Two-way via
   * `v-model:selected` — set it to highlight a marker, read updates when a
   * marker is clicked. The selection drives a visual ring only (use
   * `focusPoint` to also pan + open the popup).
   */
  selected?: number | null;
  /** Show the legend (off by default). It then appears when ≥ 2 categories are present. */
  showLegend?: boolean;
}>();

const emit = defineEmits<{
  'update:selected': [number | null];
  'point-click': [{ point: MapPoint; index: number }];
}>();

const injectedConfig = inject(COAR_MAP_CONFIG_KEY, undefined);
const cfg = computed<MapConfig | null>(() => props.config ?? injectedConfig ?? null);

const EMPTY_CONFIG: MapConfig = { defaultBasemap: '', basemaps: [] };

const mapEl = ref<HTMLElement | null>(null);
const mapRef = shallowRef<LeafletMap | null>(null);
const ready = ref(false);

/** point index (into `data.points`) → its marker (stops + named shapes). */
const markers = new Map<number, Marker | CircleMarker>();

const fallback = computed(() => fallbackEntries(props.data, cfg.value ?? EMPTY_CONFIG));
const legend = computed(() => (cfg.value ? legendCategories(props.data, cfg.value) : []));
const legendVisible = computed(() => !!props.showLegend && legend.value.length > 1);

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

/** XSS-safe popup built from DOM text nodes (never an HTML string). */
function popupEl(point: MapPoint): HTMLElement {
  const root = document.createElement('div');
  root.className = 'coar-map-popup';
  if (point.label) {
    const title = document.createElement('strong');
    title.textContent = point.label;
    root.appendChild(title);
  }
  if (point.note) {
    const note = document.createElement('div');
    note.className = 'coar-map-popup__note';
    note.textContent = point.note;
    root.appendChild(note);
  }
  return root;
}

function onMarkerClick(index: number, point: MapPoint): void {
  emit('update:selected', index);
  emit('point-click', { point, index });
}

function addStop(
  L: Leaflet,
  map: LeafletMap,
  point: MapPoint,
  index: number,
  config: MapConfig,
): void {
  const color = safeColor(stopColor(point, config));
  const emoji = stopEmoji(point, config);
  const icon = L.divIcon({
    className: 'coar-map-pin-wrap',
    html: `<span class="coar-map-pin" style="--coar-map-pin-color:${color}"><span class="coar-map-pin__emoji">${escapeHtml(emoji)}</span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
  const marker = L.marker([point.lat, point.lng], { icon });
  if (point.label) marker.bindTooltip(escapeHtml(point.label));
  if (point.label || point.note) marker.bindPopup(popupEl(point));
  marker.on('click', () => onMarkerClick(index, point));
  marker.addTo(map);
  markers.set(index, marker);
}

function addShape(L: Leaflet, map: LeafletMap, point: MapPoint, index: number): void {
  const marker = L.circleMarker([point.lat, point.lng], {
    radius: 4,
    color: '#475569',
    weight: 2,
    fillColor: '#ffffff',
    fillOpacity: 1,
  });
  if (point.label) marker.bindTooltip(escapeHtml(point.label));
  if (point.note) marker.bindPopup(popupEl(point));
  marker.on('click', () => onMarkerClick(index, point));
  marker.addTo(map);
  markers.set(index, marker);
}

function destroyMap(): void {
  if (mapRef.value) {
    mapRef.value.remove();
    mapRef.value = null;
  }
  markers.clear();
  ready.value = false;
}

/** The DOM/SVG element backing a marker, for toggling state classes. */
function markerElement(index: number): Element | null {
  const layer = markers.get(index);
  const el = layer?.getElement?.();
  return el ?? null;
}

/** Reflect the `selected` prop as a ring on the matching marker. */
function applySelectedVisual(): void {
  const selectedIndex = props.selected ?? null;
  for (const index of markers.keys()) {
    markerElement(index)?.classList.toggle('coar-map-marker--selected', index === selectedIndex);
  }
}

async function initMap(): Promise<void> {
  const el = mapEl.value;
  const config = cfg.value;
  if (!el || !config) return;

  destroyMap();

  const mod = await import('leaflet');
  const L = (mod as Leaflet & { default?: Leaflet }).default ?? mod;
  await import('leaflet/dist/leaflet.css');
  // The component may have unmounted (or re-initialised) during the await.
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

  const points = props.data.points;
  if (props.data.type === 'route' && points.length >= 2) {
    L.polyline(
      points.map((p) => [p.lat, p.lng] as [number, number]),
      { color: '#3b82f6', weight: 4, opacity: 0.85 },
    ).addTo(map);
  }
  points.forEach((point, index) => {
    if (point.kind === 'stop') addStop(L, map, point, index, config);
    else if (point.label) addShape(L, map, point, index);
  });

  const viewport = props.data.viewport;
  if (viewport) {
    map.setView([viewport.centerLat, viewport.centerLng], viewport.zoom);
  } else {
    const bounds = boundsOf(points);
    if (bounds) map.fitBounds(bounds, { padding: [28, 28] });
    else map.setView([0, 0], 2);
  }

  // Container may have been zero-sized at init (flex / initially hidden).
  requestAnimationFrame(() => mapRef.value?.invalidateSize());
  ready.value = true;
  applySelectedVisual();
}

/**
 * Imperative bridge for a consumer-built list/UI. Pan to a point, open its popup
 * and select it. `index` is into `data.points` (see `fallbackEntries(...).index`).
 */
function focusPoint(index: number): void {
  const point = props.data.points[index];
  if (!point || !mapRef.value) return;
  mapRef.value.panTo([point.lat, point.lng]);
  markers.get(index)?.openPopup();
  if ((props.selected ?? null) !== index) emit('update:selected', index);
}

/** Transient hover emphasis on a marker (pass `null` to clear). */
function highlightPoint(index: number | null): void {
  for (const i of markers.keys()) {
    markerElement(i)?.classList.toggle('coar-map-marker--highlight', i === index);
  }
}

defineExpose({ focusPoint, highlightPoint });

onMounted(initMap);
onBeforeUnmount(destroyMap);

// Re-initialise when the data or resolved config changes.
watch([() => props.data, cfg], () => void initMap(), { deep: true });
// Reflect external selection changes as the marker ring.
watch(() => props.selected, applySelectedVisual);
</script>

<template>
  <div class="coar-map" :class="{ 'coar-map--ready': ready }">
    <div ref="mapEl" class="coar-map__canvas" />

    <!-- Crawlable / no-JS fallback — removed once the map hydrates. -->
    <ol v-if="!ready" class="coar-map__fallback">
      <li v-for="(entry, i) in fallback" :key="i" class="coar-map__fallback-item">
        <span class="coar-map__fallback-emoji">{{ entry.emoji }}</span>
        <span class="coar-map__fallback-label">{{ entry.label }}</span>
        <span class="coar-map__fallback-coords">{{ entry.lat.toFixed(4) }}, {{ entry.lng.toFixed(4) }}</span>
      </li>
    </ol>

    <ul v-if="legendVisible" class="coar-map__legend">
      <li v-for="category in legend" :key="category.id" class="coar-map__legend-item">
        <span class="coar-map__legend-swatch" :style="{ background: category.color }" />
        <span v-if="category.emoji" class="coar-map__legend-emoji">{{ category.emoji }}</span>
        <span class="coar-map__legend-label">{{ category.label }}</span>
      </li>
    </ul>

    <p v-if="data.caption" class="coar-map__caption">{{ data.caption }}</p>

    <p v-if="!cfg" class="coar-map__nocfg">No map config provided (pass <code>config</code> or provide one).</p>
  </div>
</template>

<!--
  Unscoped: Leaflet injects markers / popups / tooltips into its own panes,
  outside this component's scoped DOM, so the rules must be global. Shared base
  visuals live in `internal/map-base.css` (imported above); the fallback list +
  legend below are CoarMap-only. Every selector is prefixed `coar-map`.
-->
<style>
/* No-JS fallback list. */
.coar-map__fallback {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--coar-map-fallback-color, #444);
}
.coar-map__fallback-item {
  margin: 2px 0;
}
.coar-map__fallback-emoji {
  margin-right: 6px;
}
.coar-map__fallback-coords {
  margin-left: 6px;
  color: #888;
  font-variant-numeric: tabular-nums;
}

/* Legend. */
.coar-map__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}
.coar-map__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.coar-map__legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}
</style>
