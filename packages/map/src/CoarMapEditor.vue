<script setup lang="ts">
/**
 * Visual editor for {@link MapData} — the write counterpart of `<CoarMap>`.
 *
 * Controlled via `v-model:data`: it never mutates the prop, every edit emits a
 * fresh `MapData` (see `internal/map-edit.ts`). Unlike `<CoarMap>` (which tears
 * the whole map down on each data change), the editor builds Leaflet **once**
 * and reconciles its layers in place (see `internal/use-map-editor.ts`), so a
 * drag is never interrupted by the `v-model` round-trip. Leaflet (JS + CSS) is
 * imported lazily on mount, exactly like `<CoarMap>`.
 *
 * Capabilities: add-on-click (type-aware), drag-to-move with a live route
 * polyline, click-the-route-to-insert, a property popup over the selected
 * marker (overridable via the `#point-form` slot) with delete + reorder, and a
 * `captureViewport` action. Consumer-built toolbars/lists can drive the same
 * edits through the exposed `addPoint` / `updatePoint` / `removePoint` /
 * `reorder` / `captureViewport` / `focusPoint` / `highlightPoint` methods.
 */
import { computed, inject, ref } from 'vue';
import type { MapConfig, MapData, MapPoint } from './types';
import { COAR_MAP_CONFIG_KEY } from './context';
import { useMapEditor } from './internal/use-map-editor';
import MapPointForm from './internal/MapPointForm.vue';
import './internal/map-base.css';

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

const {
  ready,
  editPos,
  editBelow,
  selectedPoint,
  editing,
  updateSelected,
  removeSelected,
  moveSelected,
  focusPoint,
  highlightPoint,
  addPoint,
  updatePoint,
  removePoint,
  reorder,
  captureViewport,
} = useMapEditor(mapEl, {
  data: () => props.data,
  config: () => cfg.value,
  selected: () => props.selected ?? null,
  readonly: () => !!props.readonly,
  emitData: (next) => emit('update:data', next),
  emitSelected: (index) => emit('update:selected', index),
  emitPointClick: (payload) => emit('point-click', payload),
});

defineExpose({
  focusPoint,
  highlightPoint,
  addPoint,
  updatePoint,
  removePoint,
  reorder,
  captureViewport,
});
</script>

<template>
  <div class="coar-map coar-map-editor" :class="{ 'coar-map--ready': ready }">
    <div class="coar-map-editor__stage">
      <div ref="mapEl" class="coar-map__canvas" />

      <!-- Property popup, anchored over the selected marker. -->
      <div
        v-if="editing && editPos && selectedPoint && selected != null"
        class="coar-map-edit-popup"
        :class="{ 'coar-map-edit-popup--below': editBelow }"
        :style="{ left: `${editPos.x}px`, top: `${editPos.y}px` }"
      >
        <slot
          name="point-form"
          :point="selectedPoint"
          :index="selected"
          :update="updateSelected"
          :remove="removeSelected"
          :move-up="() => moveSelected(-1)"
          :move-down="() => moveSelected(1)"
        >
          <MapPointForm
            :point="selectedPoint"
            :config="cfg"
            :type="data.type"
            :index="selected"
            :count="data.points.length"
            @update="updateSelected"
            @remove="removeSelected"
            @move-up="moveSelected(-1)"
            @move-down="moveSelected(1)"
          />
        </slot>
      </div>
    </div>

    <p v-if="data.caption" class="coar-map__caption">{{ data.caption }}</p>
    <p v-if="!cfg" class="coar-map__nocfg">No map config provided (pass <code>config</code> or provide one).</p>
  </div>
</template>

<!--
  Unscoped: Leaflet injects markers into its own panes, outside this component's
  scoped DOM (same reason as <CoarMap>). Every selector is prefixed `coar-map`.
-->
<style>
.coar-map-editor__stage {
  position: relative;
}
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

/* Floating property popup — a Vue overlay (not a Leaflet popup) so the
   #point-form slot keeps full reactivity. Anchored above its marker. */
.coar-map-edit-popup {
  position: absolute;
  z-index: 1000;
  transform: translate(-50%, calc(-100% - 20px));
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(15, 23, 42, 0.18);
  padding: 10px;
}
.coar-map-edit-popup--below {
  transform: translate(-50%, 20px);
}
/* Little pointer tail, pointing at the marker (below the popup, or above when flipped). */
.coar-map-edit-popup::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -7px;
  width: 12px;
  height: 12px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  transform: translateX(-50%) rotate(45deg);
}
.coar-map-edit-popup--below::after {
  bottom: auto;
  top: -7px;
  border: 0;
  border-left: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
}
</style>
