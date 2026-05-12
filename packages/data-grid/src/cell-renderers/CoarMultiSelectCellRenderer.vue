<script setup lang="ts">
/**
 * Read-only renderer for `col.multiSelect()` and `col.tagSelect()` columns.
 *
 * Cell value is `TValue[]`. Labels are looked up from the configured options
 * (static array or row-aware function); free-form values not in `options`
 * (only possible via `col.tagSelect().allowCreate()`) fall back to
 * `String(value)`.
 *
 * Default display is comma-separated text — narrow, cheap, fits any cell
 * height. `config.display === 'chips'` opts into a `<CoarTag>` per value;
 * overflow is handled by `overflow: hidden` on the host (the editor opens
 * on edit-mode entry, so the renderer is purely a display surface).
 */
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarTag } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';
import type { MultiSelectCellEditorConfig } from './multi-select-cell-editor.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const config = computed<MultiSelectCellEditorConfig>(
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

const values = computed<unknown[]>(() => {
  const v = props.params.value;
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
});

const labels = computed<string[]>(() => {
  const options = resolveOptions();
  return values.value.map((v) => options.find((o) => o.value === v)?.label ?? String(v));
});

const text = computed(() => labels.value.join(', '));

const isChips = computed(() => config.value.display === 'chips');
</script>

<template>
  <div class="coar-multi-select-cell-renderer">
    <template v-if="isChips">
      <CoarTag v-for="(label, i) in labels" :key="i" size="s">{{ label }}</CoarTag>
    </template>
    <template v-else>{{ text }}</template>
  </div>
</template>

<style>
.coar-multi-select-cell-renderer {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
