<template>
  <div
    class="column"
    :class="{ 'column--over': dnd.isDragOver.value }"
    @dragover="dnd.onDragOver"
    @dragleave="dnd.onDragLeave"
    @drop="dnd.onDrop($event)"
  >
    <div class="header">
      <span class="title">{{ title }}</span>
      <span class="count">{{ cards.length }}</span>
    </div>
    <div class="cards">
      <div
        v-for="card in cards"
        :key="card.id"
        class="card"
        :class="`card--${card.priority}`"
        draggable="true"
        @dragstart="dnd.startDrag($event, [card])"
        @dragend="dnd.endDrag($event)"
      >
        <div class="card-title">{{ card.title }}</div>
        <span class="badge">{{ card.priority }}</span>
      </div>
      <div v-if="cards.length === 0" class="empty">Drop here</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDragDrop } from '@cocoar/vue-ui';
import type { Card } from './StandaloneKanban.vue';

const props = defineProps<{
  title: string;
  cards: Card[];
  columnId: string;
  dragAccept?: string[];
}>();

const emit = defineEmits<{
  'items-add': [payload: { items: readonly Card[] }];
  'items-remove': [payload: { items: readonly Card[] }];
}>();

const dnd = useDragDrop<Card>({
  dragId: () => props.columnId,
  dragGroup: 'kanban',
  dragAccept: () => props.dragAccept,
  onDropAccept: ({ items }) => emit('items-add', { items }),
  onItemsRemove: ({ items }) => emit('items-remove', { items }),
});
</script>

<style scoped>
.column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.column--over {
  border-color: #3b82f6;
  background: #eff6ff;
}
.header {
  display: flex; align-items: baseline; justify-content: space-between;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: #64748b; padding: 4px 6px 8px;
}
.count { font-weight: 500; color: #94a3b8; }
.cards { flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 60px; }
.card {
  background: white;
  border: 1px solid #e2e8f0;
  border-left-width: 3px;
  border-radius: 4px;
  padding: 8px 10px;
  cursor: grab;
  display: flex; align-items: start; justify-content: space-between; gap: 8px;
  font-size: 13px;
}
.card:active { cursor: grabbing; }
.card--low { border-left-color: #10b981; }
.card--med { border-left-color: #f59e0b; }
.card--high { border-left-color: #ef4444; }
.card-title { flex: 1; min-width: 0; }
.badge {
  font-size: 10px; font-weight: 500; text-transform: uppercase;
  padding: 2px 6px; border-radius: 999px; background: #f1f5f9; color: #475569;
}
.empty {
  display: flex; align-items: center; justify-content: center;
  flex: 1; color: #cbd5e1; font-style: italic; font-size: 12px;
}
</style>
