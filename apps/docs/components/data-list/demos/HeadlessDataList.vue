<template>
  <div class="demo">
    <div class="demo__bar">
      <CoarTextInput v-model="search" placeholder="Filter products…" size="s" clearable style="flex: 1" />
      <CoarSegmentedControl v-model="sortKey" :options="sortChoices" size="s" />
      <span class="demo__count">{{ list.count.value }} / {{ list.total.value }}</span>
    </div>

    <div class="cards">
      <button
        v-for="product in list.items.value"
        :key="product.sku"
        type="button"
        class="card"
        :class="{ 'card--selected': list.isSelected(product.sku) }"
        @click="list.select(product.sku, $event.ctrlKey || $event.metaKey ? 'toggle' : 'replace')"
      >
        <span class="card__name">{{ product.name }}</span>
        <span class="card__price">{{ product.price.toFixed(2) }} €</span>
        <span class="card__stock" :class="{ 'card__stock--low': product.stock < 5 }">{{ product.stock }} in stock</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarSegmentedControl, CoarTextInput, useDataList } from '@cocoar/vue-ui';
import type { CoarDataListSortOption } from '@cocoar/vue-ui';

interface Product {
  sku: string;
  name: string;
  price: number;
  stock: number;
}

const products: Product[] = [
  { sku: 'A-1', name: 'Anchor bolt M12', price: 1.2, stock: 240 },
  { sku: 'A-2', name: 'Ångström ruler', price: 18.5, stock: 3 },
  { sku: 'B-1', name: 'Brass hinge', price: 4.75, stock: 61 },
  { sku: 'C-1', name: 'Cable tie 200 mm', price: 0.08, stock: 5000 },
  { sku: 'C-2', name: 'Café table leg', price: 32, stock: 2 },
  { sku: 'D-1', name: 'Drill bit set', price: 24.9, stock: 17 },
  { sku: 'E-1', name: 'Étagère bracket', price: 6.3, stock: 0 },
  { sku: 'F-1', name: 'Felt pad 10 pack', price: 2.1, stock: 88 },
];

const sortOptions: CoarDataListSortOption<Product>[] = [
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
  { key: 'stock', label: 'Stock' },
];
const sortChoices = sortOptions.map((option) => ({ value: option.key, label: option.label }));

const search = ref('');
const sortKey = ref('name');

// The same pipeline the component uses — rendered here as a card grid.
const list = useDataList<Product>({
  items: products,
  itemKey: (product) => product.sku,
  search,
  searchBy: ['name', 'sku'],
  sort: computed(() => ({ key: sortKey.value, direction: 'asc' as const })),
  sortOptions,
  selectionMode: 'multiple',
});
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__bar {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
}

.demo__count {
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
  white-space: nowrap;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: var(--coar-spacing-s);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xxs);
  padding: var(--coar-spacing-s);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  background: var(--coar-surface-neutral-primary, transparent);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.card--selected {
  border-color: var(--coar-border-accent-primary);
  background: var(--coar-background-accent-tertiary);
}

.card__name {
  font-weight: var(--coar-font-weight-semibold);
}

.card__price {
  font-variant-numeric: tabular-nums;
}

.card__stock {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.card__stock--low {
  color: var(--coar-text-error-primary, #c0392b);
}
</style>
