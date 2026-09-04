<template>
  <div class="demo">
    <CoarDataList :builder="builder">
      <template #toolbar-right>
        <CoarButton variant="secondary" size="s" :disabled="api.selectedItems.value.length === 0" @click="archiveSelected">
          Archive {{ api.selectedItems.value.length || '' }}
        </CoarButton>
      </template>

      <template #item="{ item }">
        <div class="order">
          <div class="order__primary">
            <span class="order__number">#{{ item.number }}</span>
            <span class="order__customer">{{ item.customer }}</span>
            <span class="order__total">{{ item.total.toFixed(2) }} €</span>
          </div>
          <div class="order__secondary">
            <CoarTag :variant="item.paid ? 'success' : 'warning'" size="s">{{ item.paid ? 'Paid' : 'Open' }}</CoarTag>
            <span>{{ item.placed }}</span>
            <span class="order__items">{{ item.items }} items</span>
          </div>
        </div>
      </template>
    </CoarDataList>
    <p class="demo__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarDataList, CoarTag, useDataList } from '@cocoar/vue-ui';

interface Order {
  number: number;
  customer: string;
  total: number;
  paid: boolean;
  placed: string;
  items: number;
  archived: boolean;
}

const customers = ['Vienna Gateway', 'Danube Relay', 'Pacific Node', 'Atlantic Edge', 'Nordic Mesh'];

const orders = ref<Order[]>(
  Array.from({ length: 40 }, (_, index) => ({
    number: 5000 + index,
    customer: customers[(index * 7) % customers.length],
    total: 40 + ((index * 137) % 900) + 0.5,
    paid: index % 3 !== 0,
    placed: `2026-08-${String(1 + (index % 28)).padStart(2, '0')}`,
    items: 1 + (index % 6),
    archived: false,
  })),
);

const hint = ref('Right-click an order, or select several and use the toolbar button.');

const { builder, api } = useDataList<Order>();

builder
  .items(orders)
  .itemKey((order) => order.number)
  .filter((order) => !order.archived)
  .searchBy(['number', 'customer'])
  .sortOption('placed', 'Date', { defaultDirection: 'desc' })
  .sortOption('total', 'Total', { defaultDirection: 'desc' })
  .sortOption('customer', 'Customer')
  .sort({ key: 'placed', direction: 'desc' })
  .groupBy((order) => (order.paid ? 'Paid' : 'Open'))
  .selection('multiple')
  .showSearch()
  .showSort()
  .searchHighlight()
  .dividers()
  .bordered()
  .height('22rem')
  .ariaLabel('Orders')
  .onItemActivate((e) => { hint.value = `Opened order #${e.item.number}`; })
  .itemMenu((order, selectedItems) => [
    { label: `Open #${order.number}`, icon: 'external-link', onClick: () => { hint.value = `Opened order #${order.number}`; } },
    { label: order.paid ? 'Mark as open' : 'Mark as paid', icon: 'check', onClick: () => { order.paid = !order.paid; } },
    'divider',
    {
      label: selectedItems.length > 1 ? `Archive ${selectedItems.length} orders` : 'Archive',
      icon: 'x',
      danger: true,
      onClick: archiveSelected,
    },
  ])
  .viewportMenu(() => [
    { label: 'Select all', icon: 'check', onClick: () => api.selectAll() },
    { label: 'Clear selection', onClick: () => api.clearSelection() },
  ]);

function archiveSelected() {
  const count = api.selectedItems.value.length;
  for (const order of api.selectedItems.value) order.archived = true;
  api.clearSelection();
  hint.value = `Archived ${count} order(s).`;
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__hint {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.order {
  display: grid;
  gap: var(--coar-spacing-xxs);
  min-width: 0;
}

.order__primary,
.order__secondary {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.order__number {
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-secondary);
}

.order__customer {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--coar-font-weight-semibold);
}

.order__total {
  font-variant-numeric: tabular-nums;
}

.order__secondary {
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.order__items {
  margin-left: auto;
}
</style>
