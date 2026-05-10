<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import { CoarNumberInput } from '@cocoar/vue-ui';
import type { NumberCellEditorConfig } from './number-cell-editor.models';

const props = defineProps<{
  params: ICellEditorParams<unknown, number> & {
    config?: NumberCellEditorConfig;
  };
}>();

const config = props.params.config ?? {};

// Replace-on-type: if the user started edit by pressing a digit / minus / dot,
// seed the input with the parsed numeric value (matches AG Grid's default
// number editor behavior — non-numeric printable keys are ignored).
const initialValue = (() => {
  const k = props.params.eventKey;
  if (k && k.length === 1 && /[\d.,-]/.test(k)) {
    const parsed = Number(k.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  const v = props.params.value;
  return typeof v === 'number' ? v : null;
})();

const value = ref<number | null>(initialValue);
const rootRef = useTemplateRef<HTMLDivElement>('rootRef');

defineExpose({
  getValue: () => value.value,
  afterGuiAttached: () => {
    const input = rootRef.value?.querySelector<HTMLInputElement>('input');
    if (!input) return;
    input.focus();
    const k = props.params.eventKey;
    // Select existing value on double-click / F2 / Enter; keep caret at end
    // when the user typed a digit to start editing.
    if (!k || k.length !== 1) input.select();
  },
});
</script>

<template>
  <div ref="rootRef" class="coar-number-cell-editor">
    <CoarNumberInput
      v-model="value"
      :size="config.size ?? 's'"
      :placeholder="config.placeholder"
      :min="config.min"
      :max="config.max"
      :step="config.step"
      :decimals="config.decimals"
      :stepper-buttons="config.stepperButtons ?? 'none'"
      :clearable="false"
    />
  </div>
</template>

<style>
.coar-number-cell-editor {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

/*
 * Strip CoarNumberInput's form-context chrome inside a cell — same reasoning
 * as CoarTextCellEditor: AG Grid's cell is the editing frame; Coar's container
 * border + radius + focus ring would create a "frame inside a frame".
 */
.coar-number-cell-editor .coar-number-input-host {
  width: 100%;
  margin: 0;
}
.coar-number-cell-editor .coar-number-input-container {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  height: 100%;
}
.coar-number-cell-editor .coar-number-input-container.coar-number-input-focused {
  box-shadow: none !important;
  outline: none !important;
}
</style>
