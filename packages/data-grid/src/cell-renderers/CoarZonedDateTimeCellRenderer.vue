<script setup lang="ts">
/**
 * Read-only renderer for `col.zonedDateTime()` columns.
 *
 * Cell value is `Temporal.ZonedDateTime | null`. Display shows the wallclock
 * in the event's own zone plus a short zone-name suffix (`"15:30 GMT+1"`),
 * so cross-zone columns stay unambiguous at a glance. Locale comes from
 * `useL10n()` or `config.locale`.
 */
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { Temporal } from '@js-temporal/polyfill';
import { useL10n } from '@cocoar/vue-localization';
import type { ZonedDateTimeCellEditorConfig } from './zoned-date-time-cell-editor.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const { language } = useL10n();

const config = computed<ZonedDateTimeCellEditorConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);

const formatted = computed(() => {
  const v = props.params.value;
  if (v == null) return '';
  if (!(v instanceof Temporal.ZonedDateTime)) return '';
  return v.toLocaleString(config.value.locale ?? language.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZoneName: 'short',
  });
});
</script>

<template>
  <div class="coar-zoned-date-time-cell-renderer">{{ formatted }}</div>
</template>

<style>
.coar-zoned-date-time-cell-renderer {
  display: flex;
  align-items: center;
  height: 100%;
  font-variant-numeric: tabular-nums;
}
</style>
