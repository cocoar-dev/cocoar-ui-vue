<script setup lang="ts">
/**
 * Cell editor backing `col.plainDateTime()`. Wraps
 * `<CoarPlainDateTimePicker>` — cell value is `Temporal.PlainDateTime | null`
 * (floating wallclock, no zone).
 *
 * Same lifecycle pattern as `CoarPlainDateCellEditor`: focus the trigger on
 * mount, focus-preservation in the overlay, AG Grid commits via `getValue()`
 * on focus-loss / Tab / Enter.
 */
import { ref, useTemplateRef } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import type { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';
import type { CoarDateMarker } from './plain-date-cell-editor.models';
import type { PlainDateTimeCellEditorConfig } from './plain-date-time-cell-editor.models';
import { usePopupEditorFocusGuard } from './use-popup-editor-focus-guard';

function isPlainDateTime(v: unknown): v is Temporal.PlainDateTime {
  return v != null && typeof v === 'object'
    && Object.prototype.toString.call(v) === '[object Temporal.PlainDateTime]';
}

const props = defineProps<{
  params: ICellEditorParams<unknown, Temporal.PlainDateTime | null> & {
    config?: PlainDateTimeCellEditorConfig<unknown>;
  };
}>();

const config = props.params.config ?? {};

function resolveMarkers(): CoarDateMarker[] {
  const m = config.markers;
  if (typeof m === 'function') {
    const data = props.params.data as unknown;
    return data ? m(data) : [];
  }
  return m ?? [];
}

const value = ref<Temporal.PlainDateTime | null>(
  isPlainDateTime(props.params.value) ? props.params.value : null,
);
const rootRef = useTemplateRef<HTMLDivElement>('rootRef');

usePopupEditorFocusGuard(rootRef);

defineExpose({
  getValue: () => value.value,
  afterGuiAttached: () => {
    const trigger = rootRef.value?.querySelector<HTMLElement>('.coar-pdtp-trigger');
    trigger?.focus();
  },
});
</script>

<template>
  <div ref="rootRef" class="coar-plain-date-time-cell-editor">
    <CoarPlainDateTimePicker
      v-model="value"
      :size="config.size ?? 's'"
      :clearable="config.clearable ?? true"
      :min="config.min ?? null"
      :max="config.max ?? null"
      :show-week-numbers="config.showWeekNumbers ?? false"
      :highlight-weekends="config.highlightWeekends ?? false"
      :markers="resolveMarkers()"
      :locale="config.locale"
    />
  </div>
</template>

<style>
.coar-plain-date-time-cell-editor {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

.coar-plain-date-time-cell-editor .coar-pdtp-wrapper {
  width: 100%;
}
.coar-plain-date-time-cell-editor .coar-pdtp-trigger {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
</style>
