/**
 * Leaflet controller for `<CoarMapEditor>`. Owns the map lifecycle, the
 * in-place layer reconcile, the drag / click / route-insert handlers and the
 * property-popup positioning, and exposes the edit operations. Keeping it here
 * leaves the component as a thin template + style shell.
 *
 * All edits go through the immutable ops in `map-edit.ts` and are emitted via
 * the `emit*` callbacks — the composable never mutates `data`.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref } from 'vue';
import type { LeafletMouseEvent, Map as LeafletMap, Marker, Polyline } from 'leaflet';
import type { MapConfig, MapData, MapPoint } from '../types';
import { boundsOf, resolveBasemap, stopColor, stopEmoji } from './map-model';
import {
  addPointForType,
  insertOnSegment,
  movePoint,
  nearestSegment,
  removePoint,
  reorderPoint,
  setViewport,
  updatePoint,
  type NewPointInit,
} from './map-edit';

type Leaflet = typeof import('leaflet');

export interface UseMapEditorOptions {
  data: () => MapData;
  config: () => MapConfig | null;
  selected: () => number | null;
  readonly: () => boolean;
  emitData: (next: MapData) => void;
  emitSelected: (index: number | null) => void;
  emitPointClick: (payload: { point: MapPoint; index: number }) => void;
}

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

export function useMapEditor(mapEl: Ref<HTMLElement | null>, opts: UseMapEditorOptions) {
  const mapRef = shallowRef<LeafletMap | null>(null);
  const ready = ref(false);

  let L: Leaflet | null = null;
  /** point index (into `data().points`) → its draggable handle. */
  const markers = new Map<number, Marker>();
  let polyline: Polyline | null = null;
  let dragging = false;

  /** Container-pixel position of the property popup (null = hidden). */
  const editPos = ref<{ x: number; y: number } | null>(null);
  /** Anchor the popup below the marker instead of above (near the top edge). */
  const editBelow = ref(false);
  const selectedPoint = computed<MapPoint | null>(() => {
    const index = opts.selected();
    return index !== null ? opts.data().points[index] ?? null : null;
  });
  const editing = computed(() => !opts.readonly() && selectedPoint.value !== null);

  function commit(next: MapData): void {
    opts.emitData(next);
  }

  function onMarkerClick(index: number): void {
    const point = opts.data().points[index];
    if (!point) return;
    opts.emitSelected(index);
    opts.emitPointClick({ point, index });
  }

  // ---- Leaflet layer building ----------------------------------------------

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

  /** Current vertex positions, reading live marker coords (drag preview). */
  function liveLatLngs(): [number, number][] {
    return opts.data().points.map((p, i) => {
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
    const readonly = opts.readonly();
    const icon = point.kind === 'stop' ? stopIcon(point, config) : shapeIcon();
    const marker = L.marker([point.lat, point.lng], { icon, draggable: !readonly });
    if (point.label) marker.bindTooltip(escapeHtml(point.label));
    marker.on('click', () => onMarkerClick(index));
    if (!readonly) {
      marker.on('dragstart', () => {
        dragging = true;
      });
      marker.on('drag', updatePolylineLive);
      marker.on('dragend', () => {
        dragging = false;
        const ll = marker.getLatLng();
        commit(movePoint(opts.data(), index, ll.lat, ll.lng));
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

  /** Sync Leaflet layers to `data()` (full rebuild — cheap at editing scale). */
  function buildLayers(): void {
    const map = mapRef.value;
    const config = opts.config();
    if (!map || !L || !config) return;
    clearLayers();

    const data = opts.data();
    const readonly = opts.readonly();
    if (data.type === 'route' && data.points.length >= 2) {
      polyline = L.polyline(
        data.points.map((p) => [p.lat, p.lng] as [number, number]),
        // `bubblingMouseEvents: false` keeps a line click from also firing the
        // map click (which would append a point instead of inserting one).
        { color: '#3b82f6', weight: 4, opacity: 0.85, bubblingMouseEvents: false },
      ).addTo(map);
      if (!readonly) polyline.on('click', onPolylineClick);
    }
    data.points.forEach((point, index) => {
      // Editor shows a draggable handle for every point — including the unnamed
      // shape vertices that `<CoarMap>` renders as pure geometry — so they can
      // be moved. In read-only mode we match the read view and hide those.
      if (point.kind === 'stop' || point.label || !readonly) {
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
    const selectedIndex = opts.selected();
    for (const index of markers.keys()) {
      markerElement(index)?.classList.toggle('coar-map-marker--selected', index === selectedIndex);
    }
  }

  function onMapClick(e: LeafletMouseEvent): void {
    if (opts.readonly()) return;
    // With a point selected, an empty-map click dismisses the popup (no point
    // added). Otherwise add a point — but don't auto-select it, so dropping
    // several points in a row stays fluid (no popup in the way).
    if (opts.selected() !== null) {
      opts.emitSelected(null);
      return;
    }
    commit(addPointForType(opts.data(), e.latlng.lat, e.latlng.lng));
  }

  /** Click the route line → insert a waypoint there (snapped to the line). */
  function onPolylineClick(e: LeafletMouseEvent): void {
    if (opts.readonly()) return;
    const hit = nearestSegment(opts.data().points, e.latlng.lat, e.latlng.lng);
    if (!hit) return;
    commit(insertOnSegment(opts.data(), hit.segmentIndex, hit.lat, hit.lng));
    // Clear selection: the insert shifts indices (avoid staleness) + adds don't pop.
    opts.emitSelected(null);
  }

  // ---- Property popup -------------------------------------------------------

  /** Reposition the popup over the selected marker (in container pixels). */
  function updateEditPos(): void {
    const map = mapRef.value;
    const point = selectedPoint.value;
    if (!map || !point || opts.readonly()) {
      editPos.value = null;
      return;
    }
    const pt = map.latLngToContainerPoint([point.lat, point.lng]);
    editPos.value = { x: pt.x, y: pt.y };
    // Flip below the marker when there isn't room for the popup above it.
    editBelow.value = pt.y < 190;
  }

  function updateSelected(patch: Partial<MapPoint>): void {
    const index = opts.selected();
    if (index === null) return;
    commit(updatePoint(opts.data(), index, patch));
  }

  function removeSelected(): void {
    const index = opts.selected();
    if (index === null) return;
    commit(removePoint(opts.data(), index));
    opts.emitSelected(null);
  }

  function moveSelected(direction: -1 | 1): void {
    const index = opts.selected();
    if (index === null) return;
    const to = index + direction;
    const next = reorderPoint(opts.data(), index, to);
    if (next === opts.data()) return;
    commit(next);
    opts.emitSelected(to);
  }

  /** Close the popup (clear selection) — the × button + Escape. */
  function deselect(): void {
    if (opts.selected() !== null) opts.emitSelected(null);
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && !opts.readonly() && opts.selected() !== null) {
      e.stopPropagation();
      deselect();
    }
  }

  // ---- Map lifecycle --------------------------------------------------------

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
    const config = opts.config();
    if (!el || !config) return;

    destroyMap();

    const mod = await import('leaflet');
    L = (mod as Leaflet & { default?: Leaflet }).default ?? mod;
    await import('leaflet/dist/leaflet.css');
    if (mapEl.value !== el) return;

    const map = L.map(el);
    mapRef.value = map;

    const data = opts.data();
    const base = resolveBasemap(data, config);
    if (base) {
      L.tileLayer(base.url, {
        subdomains: base.subdomains ?? 'abc',
        attribution: base.attribution,
        maxZoom: base.maxZoom ?? 19,
      }).addTo(map);
    }

    map.on('click', onMapClick);
    map.on('move zoom resize', updateEditPos);
    buildLayers();

    const viewport = data.viewport;
    if (viewport) {
      map.setView([viewport.centerLat, viewport.centerLng], viewport.zoom);
    } else {
      const bounds = boundsOf(data.points);
      if (bounds) map.fitBounds(bounds, { padding: [28, 28] });
      else map.setView([0, 0], 2);
    }

    requestAnimationFrame(() => mapRef.value?.invalidateSize());
    ready.value = true;
    updateEditPos();
  }

  // ---- Imperative bridge (parity with <CoarMap>) ----------------------------

  function focusPoint(index: number): void {
    const point = opts.data().points[index];
    if (!point || !mapRef.value) return;
    mapRef.value.panTo([point.lat, point.lng]);
    if (opts.selected() !== index) opts.emitSelected(index);
  }

  function highlightPoint(index: number | null): void {
    for (const i of markers.keys()) {
      markerElement(i)?.classList.toggle('coar-map-marker--highlight', i === index);
    }
  }

  /** Add a point (type-aware) — for a consumer toolbar; mirrors a map click. */
  function addPoint(lat: number, lng: number, init?: NewPointInit): void {
    commit(addPointForType(opts.data(), lat, lng, init));
  }

  function updatePointAt(index: number, patch: Partial<MapPoint>): void {
    commit(updatePoint(opts.data(), index, patch));
  }

  function removePointAt(index: number): void {
    commit(removePoint(opts.data(), index));
    if (opts.selected() === index) opts.emitSelected(null);
  }

  function reorder(from: number, to: number): void {
    const next = reorderPoint(opts.data(), from, to);
    if (next !== opts.data()) commit(next);
  }

  /** Save the map's current center + zoom into `data.viewport`. */
  function captureViewport(): void {
    const map = mapRef.value;
    if (!map) return;
    const center = map.getCenter();
    commit(setViewport(opts.data(), { centerLat: center.lat, centerLng: center.lng, zoom: map.getZoom() }));
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
    void initMap();
  });
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
    destroyMap();
  });

  // Re-create the map only when the resolved config changes; data edits just
  // reconcile the layers (never during a drag, never re-fitting the view).
  watch(opts.config, () => void initMap());
  watch(
    opts.data,
    () => {
      if (!dragging) buildLayers();
      updateEditPos();
    },
    { deep: true },
  );
  watch([opts.selected, opts.readonly], () => {
    applySelectedVisual();
    updateEditPos();
  });

  return {
    ready,
    editPos,
    editBelow,
    selectedPoint,
    editing,
    updateSelected,
    removeSelected,
    moveSelected,
    deselect,
    focusPoint,
    highlightPoint,
    addPoint,
    updatePoint: updatePointAt,
    removePoint: removePointAt,
    reorder,
    captureViewport,
  };
}
