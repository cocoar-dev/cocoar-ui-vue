<template>
  <div class="demo">
    <CoarDataList :builder="builder">
      <template #toolbar-right>
        <CoarButton variant="ghost" size="s" @click="api.expandAll()">Expand all</CoarButton>
        <CoarButton variant="ghost" size="s" @click="api.collapseAll()">Collapse all</CoarButton>
      </template>

      <template #item="{ item, depth, hasChildren, expanded }">
        <div class="task" :class="{ 'task--child': depth > 0 }">
          <div class="task__primary">
            <span class="task__title">{{ item.title }}</span>
            <CoarBadge v-if="hasChildren && !expanded" variant="neutral">{{ item.subTasks!.length }}</CoarBadge>
            <span class="task__due">{{ item.due }}</span>
          </div>
          <div v-if="depth === 0" class="task__secondary">{{ item.summary }}</div>
        </div>
      </template>
    </CoarDataList>
    <p class="demo__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarBadge, CoarButton, CoarDataList, useDataList } from '@cocoar/vue-ui';
import type { CoarDataListDropEvent } from '@cocoar/vue-ui';

interface Task {
  id: string;
  title: string;
  due: string;
  summary?: string;
  subTasks?: Task[];
}

const tasks = ref<Task[]>([
  {
    id: 'release',
    title: 'Ship 3.2',
    due: '2026-09-30',
    summary: 'Everything that has to land before the release branch is cut.',
    subTasks: [
      { id: 'release-notes', title: 'Write release notes', due: '2026-09-28' },
      { id: 'release-tag', title: 'Tag and publish', due: '2026-09-30' },
      { id: 'release-qa', title: 'QA pass on the playground', due: '2026-09-25', subTasks: [
        { id: 'qa-touch', title: 'Touch devices', due: '2026-09-24' },
        { id: 'qa-desktop', title: 'Desktop browsers', due: '2026-09-23' },
      ] },
    ],
  },
  {
    id: 'migration',
    title: 'Migrate the todo list',
    due: '2026-10-15',
    summary: 'Replace the hand-rolled list in timetodo with CoarDataList.',
    subTasks: [
      { id: 'migration-nesting', title: 'Nesting parity', due: '2026-10-10' },
      { id: 'migration-dnd', title: 'Drag & drop parity', due: '2026-10-05' },
    ],
  },
  { id: 'docs', title: 'Docs sweep', due: '2026-10-01', summary: 'One pass over every page touched this quarter.' },
]);

const hint = ref('Parents sort by title, sub-tasks by due date. Drag onto a row to nest, Right/Left to expand and collapse.');

const { builder, api } = useDataList<Task>();

function findParentList(list: Task[], parentKey: string | number | null): Task[] | null {
  if (parentKey === null) return list;
  for (const task of list) {
    if (task.id === parentKey) return (task.subTasks ??= []);
    const nested = task.subTasks ? findParentList(task.subTasks, parentKey) : null;
    if (nested) return nested;
  }
  return null;
}

function remove(list: Task[], keys: Set<string | number>): Task[] {
  const kept: Task[] = [];
  for (const task of list) {
    if (keys.has(task.id)) continue;
    if (task.subTasks) task.subTasks = remove(task.subTasks, keys);
    kept.push(task);
  }
  return kept;
}

function applyDrop(event: CoarDataListDropEvent<Task>) {
  const keys = new Set(event.keys);
  tasks.value = remove(tasks.value, keys);
  const target = findParentList(tasks.value, event.parentKey);
  if (!target) return;
  const anchor = event.afterKey === null ? -1 : target.findIndex((task) => task.id === event.afterKey);
  target.splice(anchor + 1, 0, ...event.items);
  hint.value = event.parentKey === null
    ? `Moved ${event.keys.join(', ')} to the top level.`
    : `Moved ${event.keys.join(', ')} under "${event.parentKey}".`;
}

builder
  .items(tasks)
  .itemKey((task) => task.id)
  .children((task) => task.subTasks, (level) =>
    level.sortOption('due', 'Due date').sort({ key: 'due', direction: 'asc' }),
  )
  .expanded(['release'])
  .sortOption('title', 'Title')
  .sortOption('due', 'Due date')
  .sort({ key: 'title', direction: 'asc' })
  .searchBy(['title'])
  .selection('multiple')
  .reorderable()
  .showSearch()
  .showSort()
  .bordered()
  .height('22rem')
  .ariaLabel('Tasks')
  .onReorder(applyDrop);
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

.task {
  display: grid;
  gap: var(--coar-spacing-xxs);
  min-width: 0;
}

.task__primary {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.task__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--coar-font-weight-semibold);
}

.task--child .task__title {
  font-weight: var(--coar-font-weight-regular, 400);
}

.task__due {
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.task__secondary {
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
