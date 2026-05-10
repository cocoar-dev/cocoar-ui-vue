<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import type { CoarSelectOption } from '@cocoar/vue-ui';
import type { SelectCellEditorConfig } from './select-cell-editor.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const config = computed<SelectCellEditorConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);

function resolveOptions(): CoarSelectOption<unknown>[] {
  const o = config.value.options;
  if (typeof o === 'function') {
    const data = props.params.data as unknown;
    return data ? o(data) : [];
  }
  return o ?? [];
}

const label = computed(() => {
  const value = props.params.value;
  if (value == null || value === '') return '';
  const found = resolveOptions().find((opt) => opt.value === value);
  return found?.label ?? String(value);
});
</script>

<template>
  <div class="coar-select-cell-renderer">{{ label }}</div>
</template>

<style>
.coar-select-cell-renderer {
  display: flex;
  align-items: center;
  height: 100%;
}
</style>
