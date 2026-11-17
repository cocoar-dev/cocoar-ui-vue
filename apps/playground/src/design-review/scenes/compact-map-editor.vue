<script setup lang="ts">
/**
 * `<CoarMapEditor>`: draggable pins and shape vertices, and the property popup of the
 * selected stop with the built-in point form (labels, fields, actions). Profile-neutral:
 * the profile class comes from an ancestor.
 * Fixed viewport, no tiles (compact-map-fixtures.ts).
 */
import { CoarMapEditor } from '@cocoar/vue-map';
import { config, data } from './compact-map-fixtures';
</script>

<template>
  <div style="padding-top: 8px">
    <CoarMapEditor :data="data" :config="config" :selected="3" />
  </div>
</template>
