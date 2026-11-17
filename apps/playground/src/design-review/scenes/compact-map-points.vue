<script setup lang="ts">
/**
 * Map + point list + editor with real two-way data (profile-neutral), so removal, reordering and the
 * map bridge change something the spec can read:
 *  - `<CoarMap>` and `<CoarMapPointList reorderable removable>` share `data` / `selected` (`v-model`); a row
 *    activation calls `CoarMap.focusPoint(index)` (pan + Leaflet popup), hover calls `highlightPoint`.
 *  - `[data-scene-part=order]` lists the point labels in order, `[data-scene-part=editor-order]` the editor's.
 *  - `<CoarMapEditor v-model:data v-model:selected>` on its own copy: select a pin -> property popup with
 *    move earlier/later and delete; dragging a pin updates the coordinates read from
 *    `[data-scene-part=editor-coords]`.
 * Fixed data, no tiles (compact-map-fixtures.ts). Built-in controls only.
 */
import { computed, ref } from 'vue';
import { CoarMap, CoarMapEditor, CoarMapPointList } from '../../../../../packages/map/src/index';
import type { MapData } from '../../../../../packages/map/src/index';
import { config, data as base } from './compact-map-fixtures';

const clone = (): MapData => JSON.parse(JSON.stringify(base)) as MapData;

const data = ref<MapData>(clone());
const selected = ref<number | null>(null);
const map = ref<InstanceType<typeof CoarMap> | null>(null);
const order = computed(() => data.value.points.map((p) => p.label ?? '?').join(' > '));

const editorData = ref<MapData>(clone());
const editorSelected = ref<number | null>(null);
const editorOrder = computed(() => editorData.value.points.map((p) => p.label ?? '?').join(' > '));
const editorCoords = computed(() =>
  editorData.value.points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(' ; '));
</script>

<template>
  <div data-scene="map-points" style="display: grid; gap: 12px">
    <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 260px); gap: 12px; align-items: start">
      <div data-scene-part="map">
        <CoarMap ref="map" :data="data" :config="config" :selected="selected" @update:selected="selected = $event" />
      </div>
      <CoarMapPointList
        v-model:data="data"
        v-model:selected="selected"
        :config="config"
        reorderable
        removable
        @focus="map?.focusPoint($event)"
        @highlight="map?.highlightPoint($event)"
      />
    </div>
    <span data-scene-part="order" style="font-size: 12px">{{ order }}</span>
    <div data-scene-part="editor" style="padding-top: 8px">
      <CoarMapEditor v-model:data="editorData" v-model:selected="editorSelected" :config="config" />
    </div>
    <span data-scene-part="editor-order" style="font-size: 12px">{{ editorOrder }}</span>
    <span data-scene-part="editor-coords" style="font-size: 12px">{{ editorCoords }}</span>
  </div>
</template>
