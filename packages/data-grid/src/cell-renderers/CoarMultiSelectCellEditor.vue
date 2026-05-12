<script setup lang="ts">
/**
 * Cell editor backing `col.multiSelect()`. Wraps `<CoarMultiSelect>` so the
 * cell value is an array of `TValue`.
 *
 * Edit-mode lifecycle:
 *   - `afterGuiAttached` clicks the trigger to auto-open the dropdown (same
 *     pattern as `CoarSelectCellEditor`).
 *   - User toggles options via checkboxes; the model updates on each toggle
 *     but the dropdown stays open (CoarMultiSelect's standard behavior — we
 *     do NOT auto-`stopEditing` on every change like the single-select does).
 *   - Focus-preservation listener prevents AG Grid's `stopEditingWhenCellsLoseFocus`
 *     from committing prematurely when the user clicks an option in the
 *     body-teleported dropdown. Without this, mousedown on an option would
 *     blur the editor → AG Grid commits the OLD array → option click runs too
 *     late. PreventDefault keeps focus in the editor; the click still fires
 *     and updates the model.
 *   - Commit happens when the user finishes (Tab / Enter / click outside the
 *     dropdown). AG Grid pulls the final array via `getValue()`.
 */
import { useTemplateRef, ref } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import { CoarMultiSelect } from '@cocoar/vue-ui';
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

// Always start the editor model as an array — single legacy values get
// promoted, null/undefined become []. Keeps CoarMultiSelect's contract clean.
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
    // Focus AND click — without focus the trigger's @keydown handler never
    // fires (AG Grid keeps focus on the cell wrapper, so arrow keys bubble
    // to the document and scroll the page instead of navigating options).
    const trigger = rootRef.value?.querySelector<HTMLElement>('.coar-select-trigger');
    trigger?.click();
    trigger?.focus();
  },
});
</script>

<template>
  <div ref="rootRef" class="coar-multi-select-cell-editor">
    <CoarMultiSelect
      v-model="value"
      :options="options"
      :clearable="config.clearable ?? false"
      :searchable="config.searchable ?? false"
      :show-select-all="config.showSelectAll ?? false"
      :placeholder="config.placeholder"
      :search-placeholder="config.searchPlaceholder"
      :size="config.size ?? 's'"
    />
  </div>
</template>

<style>
.coar-multi-select-cell-editor {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

/* Strip the trigger's form-context border + radius so the AG Grid cell is
   the only edit-mode frame. Mirrors the pattern used by the single-select,
   text and number editors. */
.coar-multi-select-cell-editor .coar-select-host {
  width: 100%;
}
.coar-multi-select-cell-editor .coar-select-trigger {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
</style>
