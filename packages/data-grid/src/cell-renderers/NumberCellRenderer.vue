<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { useL10n } from '@cocoar/vue-localization';
import type { NumberCellRendererConfig } from './number-cell-renderer.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const { fmtNumber } = useL10n();

const config = computed<NumberCellRendererConfig>(() => props.params.colDef?.cellRendererParams?.config ?? {});

const formattedValue = computed<string>(() => {
  const value = props.params.value;
  if (value === null || value === undefined) return '';
  return fmtNumber(value, config.value.decimals);
});
</script>

<template>
  <div class="coar-number-cell-renderer">{{ formattedValue }}</div>
</template>

<style>
.coar-number-cell-renderer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
</style>
