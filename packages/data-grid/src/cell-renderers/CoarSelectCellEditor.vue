<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import { CoarSelect } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';
import type { SelectCellEditorConfig } from './select-cell-editor.models';

const props = defineProps<{
  params: ICellEditorParams<unknown, unknown> & {
    config?: SelectCellEditorConfig<unknown, unknown>;
  };
}>();

const config = props.params.config ?? {};

const options = ((): CoarSelectOption<unknown>[] => {
  const o = config.options;
  if (typeof o === 'function') {
    const data = props.params.data as unknown;
    return data ? o(data) : [];
  }
  return o ?? [];
})();

const value = ref<unknown>(props.params.value ?? null);
const rootRef = useTemplateRef<HTMLDivElement>('rootRef');
const stopped = ref(false);

// Auto-commit on selection change. CoarSelect's `selectOption` writes the
// model and immediately closes its dropdown — once the new value lands here,
// we tell AG Grid to stopEditing(), which triggers `getValue()` and unmounts
// the editor. Guard against re-entry so the watch doesn't double-fire.
watch(value, (next, prev) => {
  if (stopped.value || next === prev) return;
  stopped.value = true;
  // Defer one microtask so v-model has fully settled before AG Grid pulls
  // the value via getValue().
  Promise.resolve().then(() => {
    if (props.params.stopEditing) props.params.stopEditing();
  });
});

defineExpose({
  // Mandatory — AG Grid commit hook
  getValue: () => value.value,
  // Open the dropdown immediately on entering edit-mode. We click the trigger
  // since CoarSelect doesn't expose a programmatic open() method yet.
  afterGuiAttached: () => {
    const trigger = rootRef.value?.querySelector<HTMLElement>('.coar-select-trigger');
    trigger?.click();
  },
});
</script>

<template>
  <div ref="rootRef" class="coar-select-cell-editor">
    <CoarSelect
      v-model="value"
      :options="options"
      :clearable="config.clearable ?? false"
      :searchable="config.searchable ?? false"
      :placeholder="config.placeholder"
      :search-placeholder="config.searchPlaceholder"
      :size="config.size ?? 's'"
    />
  </div>
</template>

<style>
.coar-select-cell-editor {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

/*
 * Strip the trigger's form-context border + radius so the AG Grid cell is
 * the only edit-mode frame. Mirrors the pattern used in the text and number
 * cell editors.
 */
.coar-select-cell-editor .coar-select-host {
  width: 100%;
}
.coar-select-cell-editor .coar-select-trigger {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
</style>
