<template>
  <div style="height: 350px; display: flex; flex-direction: column; gap: 8px;">
    <CoarDataGrid :builder="builder" />
    <div v-if="lastOrder" style="font-size: 0.85em; color: #666;">
      Order: {{ lastOrder }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Step {
  id: number;
  title: string;
  priority: string;
}

const steps = ref<Step[]>([
  { id: 1, title: 'Gather requirements', priority: 'High' },
  { id: 2, title: 'Create wireframes', priority: 'Medium' },
  { id: 3, title: 'Implement prototype', priority: 'High' },
  { id: 4, title: 'User testing', priority: 'Medium' },
  { id: 5, title: 'Final review', priority: 'Low' },
]);

const lastOrder = ref('');

const builder = CoarGridBuilder.create<Step>()
  .columns([
    (col) => col.field('title').header('Step').flex(1).rowDrag(),
    (col) => col.field('priority').header('Priority').width(120).sortable(),
  ])
  .rowDataRef(steps)
  .rowId((p) => String(p.data.id))
  .rowDragManaged()
  .onRowDragEnd(() => {
    const newOrder = builder.getDisplayedRowData();
    lastOrder.value = newOrder.map((s) => s.title).join(' → ');
    // In a real app: store.updateOrder(newOrder) or api.reorder(newOrder)
  });
</script>
