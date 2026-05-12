<script setup lang="ts">
/**
 * Read-only renderer for `col.plainDateTime()` columns.
 *
 * Cell value is `Temporal.PlainDateTime | null` — a floating wallclock.
 * Locale comes from `useL10n()` or `config.locale`. Strict typing: non-
 * PlainDateTime values render as empty string.
 */
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { Temporal } from '@js-temporal/polyfill';
import { useL10n } from '@cocoar/vue-localization';
import type { PlainDateTimeCellEditorConfig } from './plain-date-time-cell-editor.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const { language } = useL10n();

const config = computed<PlainDateTimeCellEditorConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);

const formatted = computed(() => {
  const v = props.params.value;
  if (v == null) return '';
  if (!(v instanceof Temporal.PlainDateTime)) return '';
  return v.toLocaleString(config.value.locale ?? language.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
});
</script>

<template>
  <div class="coar-plain-date-time-cell-renderer">{{ formatted }}</div>
</template>

<style>
.coar-plain-date-time-cell-renderer {
  display: flex;
  align-items: center;
  height: 100%;
  font-variant-numeric: tabular-nums;
}
</style>
