<script setup lang="ts">
/**
 * Read-only renderer for `col.zonedDateTime()` columns.
 *
 * Thin wrapper around `<CoarZonedDateTimeView>` from `@cocoar/vue-ui` —
 * formatting + locale reactivity + cross-realm-safe type-checks live there.
 * Each row's value is rendered in its own zone by default; consumers can
 * project every row into a fixed zone via `config.displayTimeZone`.
 */
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarZonedDateTimeView } from '@cocoar/vue-ui';
import type { ZonedDateTimeCellEditorConfig } from './zoned-date-time-cell-editor.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const config = computed<ZonedDateTimeCellEditorConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);
</script>

<template>
  <div class="coar-zoned-date-time-cell-renderer">
    <CoarZonedDateTimeView
      :value="params.value"
      :locale="config.locale"
      :display-time-zone="config.displayTimeZone"
    />
  </div>
</template>

<style>
.coar-zoned-date-time-cell-renderer {
  display: flex;
  align-items: center;
  height: 100%;
}
</style>
