<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import { CoarTextInput } from '@cocoar/vue-ui';
import type { TextCellEditorConfig } from './text-cell-editor.models';

const props = defineProps<{
  params: ICellEditorParams<unknown, string> & {
    config?: TextCellEditorConfig;
  };
}>();

const config = props.params.config ?? {};

// Replace-on-type: if the user started edit by pressing a printable key, seed
// the input with that key (matches AG Grid's default text editor behavior).
const initialValue = (() => {
  const k = props.params.eventKey;
  if (k && k.length === 1) return k;
  return String(props.params.value ?? '');
})();

const value = ref<string>(initialValue);
const rootRef = useTemplateRef<HTMLDivElement>('rootRef');

defineExpose({
  getValue: () => value.value,
  afterGuiAttached: () => {
    const input = rootRef.value?.querySelector<HTMLInputElement>('input');
    if (!input) return;
    input.focus();
    // If the user double-clicked or pressed F2/Enter to start editing, select
    // the existing value so typing replaces. If they started via a printable
    // key, the eventKey-seeded value is already set and we keep the caret at end.
    const k = props.params.eventKey;
    if (!k || k.length !== 1) input.select();
  },
});
</script>

<template>
  <div ref="rootRef" class="coar-text-cell-editor">
    <CoarTextInput
      v-model="value"
      :size="config.size ?? 's'"
      :placeholder="config.placeholder"
      :prefix="config.prefix"
      :suffix="config.suffix"
      :maxlength="config.maxLength"
      :clearable="false"
    />
  </div>
</template>

<style>
.coar-text-cell-editor {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

/*
 * Strip CoarTextInput's form-context chrome inside a cell. AG Grid's cell
 * already provides the editing frame (border + focus shadow) — Coar's container
 * border + radius + focus ring would render a "frame inside a frame".
 *
 * We keep the inner input's left/right padding so the text isn't flush against
 * the cell edge.
 */
.coar-text-cell-editor .coar-text-input-host {
  width: 100%;
  margin: 0;
}
.coar-text-cell-editor .coar-text-input-container {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  height: 100%;
}
.coar-text-cell-editor .coar-text-input-container.coar-text-input-focused {
  /* Cell already shows the focused state — no extra ring */
  box-shadow: none !important;
  outline: none !important;
}
</style>
