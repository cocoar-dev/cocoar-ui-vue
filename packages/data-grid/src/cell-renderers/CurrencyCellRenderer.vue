<script setup lang="ts">
import { computed } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { useL10n } from '@cocoar/vue-localization';
import type { CurrencyCellRendererConfig } from './currency-cell-renderer.models';

const props = defineProps<{
  params: ICellRendererParams;
}>();

const { fmtCurrency } = useL10n();

const config = computed<CurrencyCellRendererConfig>(() => props.params.colDef?.cellRendererParams?.config ?? {});

const formattedValue = computed<string>(() => {
  const value = props.params.value;
  if (value === null || value === undefined) return '';
  return fmtCurrency(value, config.value.currencyCode);
});
</script>

<template>
  <div class="coar-currency-cell-renderer">{{ formattedValue }}</div>
</template>

<style>
.coar-currency-cell-renderer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
</style>
