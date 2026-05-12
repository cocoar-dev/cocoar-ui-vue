<script setup lang="ts">
/**
 * Read-only renderer for `col.plainDate()` columns.
 *
 * Cell value is `Temporal.PlainDate | null`. Locale comes from the consumer
 * app via `useL10n()` (reactive — display updates on language change), or
 * from the per-column `config.locale` override.
 *
 * Strict typing: non-PlainDate values render as empty string. Consumers
 * convert ISO strings / native `Date` at the data layer.
 */
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { Temporal } from '@js-temporal/polyfill';
import { useL10n } from '@cocoar/vue-localization';
import type { PlainDateCellEditorConfig } from './plain-date-cell-editor.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const { language } = useL10n();

const config = computed<PlainDateCellEditorConfig>(
  () => props.params.colDef?.cellRendererParams?.config ?? {},
);

const formatted = computed(() => {
  const v = props.params.value;
  if (v == null) return '';
  if (!(v instanceof Temporal.PlainDate)) return '';
  return v.toLocaleString(config.value.locale ?? language.value, { dateStyle: 'medium' });
});
</script>

<template>
  <div class="coar-plain-date-cell-renderer">{{ formatted }}</div>
</template>

<style>
.coar-plain-date-cell-renderer {
  display: flex;
  align-items: center;
  height: 100%;
  font-variant-numeric: tabular-nums;
}
</style>
