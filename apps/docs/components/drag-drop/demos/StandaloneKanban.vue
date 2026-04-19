<template>
  <div class="board">
    <KanbanColumn
      v-for="col in columns"
      :key="col.id"
      :title="col.title"
      :cards="col.cards"
      :column-id="col.id"
      :drag-accept="col.dragAccept"
      @items-add="(p) => onAdd(col.id, p)"
      @items-remove="(p) => onRemove(col.id, p)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import KanbanColumn from './KanbanColumn.vue';

export interface Card { id: string; title: string; priority: 'low' | 'med' | 'high' }

const columns = ref([
  {
    id: 'backlog',
    title: 'Backlog',
    // Empty whitelist = accept nothing. Keeps Backlog as a source-only column.
    dragAccept: [] as string[] | undefined,
    cards: [
      { id: 'c1', title: 'Research virtualization', priority: 'med' },
      { id: 'c2', title: 'Audit type coverage', priority: 'low' },
      { id: 'c3', title: 'Drop indicator UX', priority: 'med' },
    ] as Card[],
  },
  {
    id: 'doing',
    title: 'In progress',
    dragAccept: ['backlog'],
    cards: [{ id: 'c4', title: 'Release Listbox v2', priority: 'high' }] as Card[],
  },
  {
    id: 'done',
    title: 'Done',
    dragAccept: ['backlog', 'doing'],
    cards: [{ id: 'c5', title: 'Ship Virtual List page', priority: 'med' }] as Card[],
  },
]);

function onAdd(colId: string, p: { items: readonly Card[] }) {
  const col = columns.value.find((c) => c.id === colId);
  if (!col) return;
  col.cards = [...col.cards, ...p.items];
}

function onRemove(colId: string, p: { items: readonly Card[] }) {
  const col = columns.value.find((c) => c.id === colId);
  if (!col) return;
  const removing = new Set(p.items.map((i) => i.id));
  col.cards = col.cards.filter((c) => !removing.has(c.id));
}
</script>

<style scoped>
.board { display: flex; gap: 16px; min-height: 340px; }
</style>
