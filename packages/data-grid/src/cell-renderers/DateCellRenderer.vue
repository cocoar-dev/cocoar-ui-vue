<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { useL10n } from '@cocoar/vue-localization';
import type { DateCellRendererConfig } from './date-cell-renderer.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const { fmtDate } = useL10n();

const config = computed<DateCellRendererConfig>(() => props.params.colDef?.cellRendererParams?.config ?? {});

const dateValue = computed<Date | string | null>(() => {
  const value = props.params.value;
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return value;
  return null;
});

const formattedDate = computed<string>(() => {
  if (dateValue.value == null) return '';
  return fmtDate(dateValue.value, config.value.includeTime ?? false);
});
</script>

<template>
  <div class="coar-date-cell-renderer">{{ formattedDate }}</div>
</template>

<style>
.coar-date-cell-renderer {
  display: flex;
  align-items: center;
  height: 100%;
}
</style>
