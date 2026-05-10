<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { CoarCheckbox } from '@cocoar/vue-ui';
import type { CheckboxCellRendererConfig } from './checkbox-cell-renderer.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const config = computed<CheckboxCellRendererConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);

const checked = computed(() => Boolean(props.params.value));

const indeterminate = computed(() => {
  const fn = config.value.indeterminate;
  if (!fn) return false;
  const data = props.params.data as unknown;
  return data ? Boolean(fn(data)) : false;
});

const size = computed(() => config.value.size ?? 's');

const label = computed(() => {
  const v = config.value.label;
  if (v == null) return '';
  if (typeof v === 'function') {
    const data = props.params.data as unknown;
    return data ? String(v(data)) : '';
  }
  return v;
});
</script>

<template>
  <!--
    Renderer is read-only by design. Interactivity lives in CoarCheckboxCellEditor,
    entered via AG Grid's standard edit-mode (double-click / Enter / F2). This keeps
    Tab-through-edit-mode navigation working — pressing Tab inside the editor commits
    and moves focus to the next editable cell, opening its editor automatically.

    `pointer-events: none` on the wrapper means clicks pass through to the AG Grid cell
    behind, so cell-selection and double-click-to-edit still work.
  -->
  <div class="coar-checkbox-cell-renderer">
    <CoarCheckbox
      :model-value="checked"
      :indeterminate="indeterminate"
      :size="size"
      :label="label"
    />
  </div>
</template>

<style>
.coar-checkbox-cell-renderer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  pointer-events: none;
}

/*
 * Override CoarCheckbox's form-context layout so the box centers vertically
 * within the grid cell. CoarCheckbox is built for forms — the host is `display: block`
 * (gets line-box height from inherited text styles), the wrapper has
 * `align-items: flex-start` + `min-height: <component>-height`, and the box has
 * a hard-coded `margin-top` to fake centering against form-component height.
 * In a grid cell none of those assumptions hold; we strip them all here.
 */
.coar-checkbox-cell-renderer .coar-checkbox-host {
  display: flex;
  align-items: center;
  height: 100%;
}
.coar-checkbox-cell-renderer .coar-checkbox-wrapper {
  align-items: center !important;
  min-height: 0 !important;
}
.coar-checkbox-cell-renderer .coar-checkbox-box {
  margin-top: 0 !important;
}
</style>
