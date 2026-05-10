<template>
  <div>
    <div style="height: 320px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click any quantity or price cell. Locale-aware parsing — try <code>1.234,56</code> in German or <code>1,234.56</code> in English.
    </div>
    <div
      v-if="lastChange"
      style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--coar-surface-neutral-subtle); font-size: 13px;"
    >
      Last change: <strong>{{ lastChange.field }}</strong> on
      <strong>{{ lastChange.row }}</strong> →
      <code>{{ lastChange.newValue }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Item {
  id: number;
  product: string;
  qty: number;
  price: number;
}

const data = ref<Item[]>([
  { id: 1, product: 'Widget A', qty: 12, price: 49.95 },
  { id: 2, product: 'Widget B', qty: 0,  price: 19.50 },
  { id: 3, product: 'Widget C', qty: 5,  price: 199.00 },
  { id: 4, product: 'Widget D', qty: 28, price: 7.25 },
]);

const lastChange = shallowRef<{ row: string; field: string; newValue: number } | null>(null);

const builder = CoarGridBuilder.create<Item>()
  .columns([
    (col) => col.field('product').header('Product').flex(1),
    (col) =>
      col
        .number('qty', (n) => n.decimals(0).min(0).max(9999).step(1).stepperButtons('both').size('s'))
        .header('Qty')
        .width(140)
        .editable(true),
    (col) =>
      col
        .number('price', (n) => n.decimals(2).min(0).step(0.01))
        .header('Price')
        .width(140)
        .editable(true),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus()
  .onCellValueChanged((event) => {
    if (!event.data || !event.colDef.field) return;
    lastChange.value = {
      row: event.data.product,
      field: event.colDef.field,
      newValue: event.newValue,
    };
  });
</script>
