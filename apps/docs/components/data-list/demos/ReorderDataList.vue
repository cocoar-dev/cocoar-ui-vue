<template>
  <div class="demo">
    <div class="demo__bar">
      <span class="demo__label">Drag engine</span>
      <CoarSegmentedControl v-model="engine" :options="engineOptions" size="s" aria-label="Drag engine" />
      <span class="demo__hint">{{ hint }}</span>
    </div>

    <div class="board">
      <CoarDataList v-for="column in columns" :key="column.id" :builder="column.builder" class="board__column">
        <template #toolbar-left>
          <span class="board__title">{{ column.title }}</span>
          <CoarBadge variant="neutral">{{ column.api.count.value }}</CoarBadge>
        </template>

        <template #item="{ item, dragging }">
          <div class="task" :class="{ 'task--dragging': dragging }">
            <CoarIcon name="grip-vertical" size="s" class="task__grip" />
            <div class="task__text">
              <span class="task__title">{{ item.title }}</span>
              <span class="task__meta">{{ item.owner }} · {{ item.points }} pt</span>
            </div>
          </div>
        </template>

        <template #empty>
          <span class="board__empty">Drop tasks here</span>
        </template>
      </CoarDataList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarBadge, CoarDataList, CoarIcon, CoarSegmentedControl, useDataList } from '@cocoar/vue-ui';
import type { CoarDataListDragEngine, CoarDataListDropEvent, CoarDataListItemsRemoveEvent } from '@cocoar/vue-ui';

interface Task {
  id: number;
  title: string;
  owner: string;
  points: number;
}

const engine = ref<CoarDataListDragEngine>('native');
const engineOptions = [
  { value: 'native' as const, label: 'Native' },
  { value: 'pointer' as const, label: 'Pointer' },
  { value: 'auto' as const, label: 'Auto' },
];
const hint = ref('Drag within a column to reorder, across columns to move. Keyboard: Ctrl+X, arrows, Ctrl+V.');

const people = ['Ada', 'Grace', 'Linus', 'Margaret'];
let nextId = 1;
const makeTasks = (titles: string[]) =>
  titles.map((title, index) => ({ id: nextId++, title, owner: people[(nextId + index) % people.length], points: 1 + ((nextId * 3) % 5) }));

function column(id: string, title: string, initial: Task[]) {
  const items = ref<Task[]>(initial);
  const { builder, api } = useDataList<Task>();

  // The list reports where the block should go; the data is ours to change.
  function insertAt(target: Task[], moved: Task[], event: CoarDataListDropEvent<Task>) {
    const remaining = target.filter((task) => !event.keys.includes(task.id));
    const anchor = event.afterKey === null ? -1 : remaining.findIndex((task) => task.id === event.afterKey);
    remaining.splice(anchor + 1, 0, ...moved);
    return remaining;
  }

  builder
    .items(items)
    .itemKey((task) => task.id)
    .selection('multiple')
    .reorderable()
    .dragEngine(engine)
    .dragGroup('board')
    .dragId(id)
    .density('s')
    .gap(6)
    .bordered()
    .height('18rem')
    .ariaLabel(title)
    .onReorder((event) => {
      items.value = insertAt(items.value, event.items, event);
      hint.value = `Moved ${event.keys.length} task(s) in "${title}".`;
    })
    .onItemsAdd((event) => {
      items.value = insertAt(items.value, event.items, event);
      hint.value = `Moved ${event.keys.length} task(s) from "${event.sourceId}" to "${title}".`;
    })
    .onItemsRemove((event: CoarDataListItemsRemoveEvent<Task>) => {
      items.value = items.value.filter((task) => !event.keys.includes(task.id));
    });

  return { id, title, builder, api };
}

const columns = [
  column('backlog', 'Backlog', makeTasks(['Write release notes', 'Fix login timeout', 'Design empty state', 'Review PR #42', 'Update dependencies'])),
  column('doing', 'In progress', makeTasks(['Migrate todo list', 'Grid layout'])),
  column('done', 'Done', makeTasks(['Gap prop'])),
];
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
  flex-wrap: wrap;
}

.demo__label,
.demo__hint {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.demo__hint {
  margin-left: auto;
}

.board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--coar-spacing-s);
}

.board__title {
  font-weight: var(--coar-font-weight-semibold);
}

.board__empty {
  color: var(--coar-text-neutral-secondary);
}

.task {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  min-width: 0;
}

.task__grip {
  color: var(--coar-icon-neutral-secondary);
  flex-shrink: 0;
  cursor: grab;
}

.task__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.task__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}
</style>
