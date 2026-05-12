<script setup lang="ts">
/**
 * Read-only renderer for `col.plainDate()` columns.
 *
 * Thin wrapper around `<CoarPlainDateView>` from `@cocoar/vue-ui` —
 * formatting logic, locale reactivity, and cross-realm-safe type-checks all
 * live there. This file only adapts the AG Grid cell-renderer interface
 * (`ICellRendererParams.value` + per-column config) to the view's props.
 */
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarPlainDateView } from '@cocoar/vue-ui';
import type { PlainDateCellEditorConfig } from './plain-date-cell-editor.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const config = computed<PlainDateCellEditorConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);
</script>

<template>
  <div class="coar-plain-date-cell-renderer">
    <CoarPlainDateView :value="params.value" :locale="config.locale" />
  </div>
</template>

<style>
.coar-plain-date-cell-renderer {
  display: flex;
  align-items: center;
  height: 100%;
}
</style>
