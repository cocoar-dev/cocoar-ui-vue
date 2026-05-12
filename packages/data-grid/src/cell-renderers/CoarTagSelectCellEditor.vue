<script setup lang="ts">
/**
 * Cell editor backing `col.tagSelect()`. Wraps `<CoarTagSelect>` — same array
 * value contract as `CoarMultiSelectCellEditor`, but selected values render as
 * removable chips inside the trigger, and the dropdown only shows
 * not-yet-selected options.
 *
 * `.allowCreate()` lets the user type free-form values that aren't in
 * `options`; those are round-tripped into the cell value array verbatim. The
 * shared renderer falls back to `String(value)` for unknown labels.
 *
 * Commit semantics match `CoarMultiSelectCellEditor`: focus-preservation
 * keeps the dropdown open while editing; AG Grid commits via `getValue()` on
 * blur / Tab / Enter / Escape.
 */
import { useTemplateRef, ref } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import { CoarTagSelect } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';
import type { MultiSelectCellEditorConfig } from './multi-select-cell-editor.models';
import { usePopupEditorFocusGuard } from './use-popup-editor-focus-guard';

const props = defineProps<{
  params: ICellEditorParams<unknown, unknown[]> & {
    config?: MultiSelectCellEditorConfig<unknown, unknown>;
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

function toArray(v: unknown): unknown[] {
  if (v == null) return [];
  return Array.isArray(v) ? [...v] : [v];
}

const value = ref<unknown[]>(toArray(props.params.value));
const rootRef = useTemplateRef<HTMLDivElement>('rootRef');

usePopupEditorFocusGuard(rootRef);

defineExpose({
  getValue: () => value.value,
  afterGuiAttached: () => {
    // Tag-select's trigger contains the inline tag input — clicking opens the
    // dropdown, focusing routes keystrokes to the trigger's @keydown handler
    // (without focus, arrow keys bubble to the page and scroll instead of
    // navigating options).
    const trigger = rootRef.value?.querySelector<HTMLElement>('.coar-tag-select-trigger, .coar-select-trigger');
    trigger?.click();
    trigger?.focus();
  },
});
</script>

<template>
  <div ref="rootRef" class="coar-tag-select-cell-editor">
    <CoarTagSelect
      v-model="value"
      :options="options"
      :placeholder="config.placeholder"
      :search-placeholder="config.searchPlaceholder"
      :allow-create="config.allowCreate ?? false"
      :size="config.size ?? 's'"
    />
  </div>
</template>

<style>
.coar-tag-select-cell-editor {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

.coar-tag-select-cell-editor .coar-select-host {
  width: 100%;
}
.coar-tag-select-cell-editor .coar-select-trigger,
.coar-tag-select-cell-editor .coar-tag-select-trigger {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
</style>
