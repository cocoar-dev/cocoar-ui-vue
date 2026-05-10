<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import { CoarCheckbox } from '@cocoar/vue-ui';
import type { CheckboxCellRendererConfig } from './checkbox-cell-renderer.models';

const props = defineProps<{
  params: ICellEditorParams<unknown, boolean> & {
    config?: CheckboxCellRendererConfig<unknown>;
  };
}>();

const config = props.params.config ?? {};

const value = ref<boolean>(Boolean(props.params.value));
const rootRef = useTemplateRef<HTMLDivElement>('rootRef');

const indeterminate = (() => {
  const fn = config.indeterminate;
  if (!fn) return false;
  const data = props.params.data as unknown;
  return data ? Boolean(fn(data)) : false;
})();

const size = config.size ?? 's';

const label = (() => {
  const v = config.label;
  if (v == null) return '';
  if (typeof v === 'function') {
    const data = props.params.data as unknown;
    return data ? String(v(data)) : '';
  }
  return v;
})();

defineExpose({
  // Mandatory: AG Grid calls this on commit (Enter, Tab, blur with stopEditingWhenCellsLoseFocus).
  getValue: () => value.value,

  // Recommended: focus the input so Space toggles immediately. Tab/Enter then
  // commit + navigate via AG Grid's native edit-mode flow.
  afterGuiAttached: () => {
    const input = rootRef.value?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    input?.focus();
  },
});
</script>

<template>
  <div ref="rootRef" class="coar-checkbox-cell-editor">
    <CoarCheckbox
      v-model="value"
      :indeterminate="indeterminate"
      :size="size"
      :label="label"
    />
  </div>
</template>

<style>
.coar-checkbox-cell-editor {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

/* Match the renderer's vertical centering so editor-mount doesn't shift the box. */
.coar-checkbox-cell-editor .coar-checkbox-host {
  display: flex;
  align-items: center;
  height: 100%;
}
.coar-checkbox-cell-editor .coar-checkbox-wrapper {
  align-items: center !important;
  min-height: 0 !important;
}
.coar-checkbox-cell-editor .coar-checkbox-box {
  margin-top: 0 !important;
}
</style>
