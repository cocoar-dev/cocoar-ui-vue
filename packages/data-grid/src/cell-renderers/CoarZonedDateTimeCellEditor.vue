<script setup lang="ts">
/**
 * Cell editor backing `col.zonedDateTime()`. Wraps
 * `<CoarZonedDateTimePicker>` — cell value is `Temporal.ZonedDateTime | null`.
 *
 * Zone handling: when the cell already holds a `ZonedDateTime`, its zone is
 * preserved through editing unless the user explicitly changes it via the
 * picker's zone selector. When the cell is empty before the edit,
 * `config.timeZone` (or the host's `Temporal.Now.timeZoneId()` as fallback)
 * is used for the new value.
 *
 * Same lifecycle pattern as the other date editors.
 */
import { ref, useTemplateRef, onMounted, onBeforeUnmount } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import type { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';
import type { CoarDateMarker } from './plain-date-cell-editor.models';
import type { ZonedDateTimeCellEditorConfig } from './zoned-date-time-cell-editor.models';

function isZonedDateTime(v: unknown): v is Temporal.ZonedDateTime {
  return v != null && typeof v === 'object'
    && Object.prototype.toString.call(v) === '[object Temporal.ZonedDateTime]';
}

const props = defineProps<{
  params: ICellEditorParams<unknown, Temporal.ZonedDateTime | null> & {
    config?: ZonedDateTimeCellEditorConfig<unknown>;
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

const value = ref<Temporal.ZonedDateTime | null>(
  isZonedDateTime(props.params.value) ? props.params.value : null,
);
const rootRef = useTemplateRef<HTMLDivElement>('rootRef');

function preserveFocusInOverlay(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  if (target?.closest('.coar-overlay-host')) {
    e.preventDefault();
  }
}

onMounted(() => {
  document.addEventListener('mousedown', preserveFocusInOverlay, true);
});
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', preserveFocusInOverlay, true);
});

defineExpose({
  getValue: () => value.value,
  afterGuiAttached: () => {
    const trigger = rootRef.value?.querySelector<HTMLElement>('.coar-zdtp-trigger');
    trigger?.focus();
  },
});
</script>

<template>
  <div ref="rootRef" class="coar-zoned-date-time-cell-editor">
    <CoarZonedDateTimePicker
      v-model="value"
      :size="config.size ?? 's'"
      :clearable="config.clearable ?? true"
      :min="config.min ?? null"
      :max="config.max ?? null"
      :show-week-numbers="config.showWeekNumbers ?? false"
      :highlight-weekends="config.highlightWeekends ?? false"
      :markers="resolveMarkers()"
      :locale="config.locale"
      :time-zone="config.timeZone ?? null"
      :timezone-filter="config.timezoneFilter ?? []"
    />
  </div>
</template>

<style>
.coar-zoned-date-time-cell-editor {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

.coar-zoned-date-time-cell-editor .coar-zdtp {
  width: 100%;
}
.coar-zoned-date-time-cell-editor .coar-zdtp-trigger {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
</style>
