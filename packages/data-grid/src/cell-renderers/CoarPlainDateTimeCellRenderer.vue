<script setup lang="ts">
/**
 * Read-only renderer for `col.plainDateTime()` columns.
 *
 * Thin wrapper around `<CoarPlainDateTimeView>` from `@cocoar/vue-ui` —
 * formatting + locale reactivity + cross-realm-safe type-checks live there.
 */
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarPlainDateTimeView } from '@cocoar/vue-ui';
import type { PlainDateTimeCellEditorConfig } from './plain-date-time-cell-editor.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const config = computed<PlainDateTimeCellEditorConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);
</script>

<template>
  <div class="coar-plain-date-time-cell-renderer">
    <CoarPlainDateTimeView :value="params.value" :locale="config.locale" />
  </div>
</template>

<style>
.coar-plain-date-time-cell-renderer {
  display: flex;
  align-items: center;
  height: 100%;
}
</style>
