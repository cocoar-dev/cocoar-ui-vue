<script setup lang="ts">
/**
 * `<CoarMap>` and `<CoarMapPointList>` (profile-neutral): Leaflet
 * zoom control and attribution, pins with one selected (ring), the route, legend and
 * caption; beside it the point list with a selected row, drag handles and delete buttons.
 * Fixed viewport, no tiles (compact-map-fixtures.ts).
 */
import { CoarMap, CoarMapPointList } from '@cocoar/vue-map';
import { config, data } from './compact-map-fixtures';
</script>

<template>
  <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 240px); gap: 12px; align-items: start">
    <CoarMap :data="data" :config="config" :selected="2" show-legend />
    <CoarMapPointList :data="data" :config="config" :selected="2" reorderable removable />
  </div>
</template>
