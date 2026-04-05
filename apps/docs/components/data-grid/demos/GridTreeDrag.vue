<template>
  <div style="height: 450px; display: flex; flex-direction: column; gap: 8px;">
    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
      <input type="checkbox" v-model="maxTwoLevels" />
      Limit to 2 levels (no nesting into children)
    </label>
    <CoarDataGrid :builder="builder" />
    <div v-if="lastAction" style="font-size: 0.85em; color: #666;">
      {{ lastAction }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

const maxTwoLevels = ref(false);

interface Task {
  id: string;
  title: string;
  status: string;
  children?: Task[];
}

const tasks = ref<Task[]>([
  {
    id: '1', title: 'Frontend', status: 'active', children: [
      { id: '1-1', title: 'Login page', status: 'done' },
      { id: '1-2', title: 'Dashboard', status: 'active' },
    ],
  },
  {
    id: '2', title: 'Backend', status: 'active', children: [
      { id: '2-1', title: 'Auth API', status: 'done' },
      { id: '2-2', title: 'User API', status: 'active' },
      { id: '2-3', title: 'Settings API', status: 'active' },
    ],
  },
  {
    id: '3', title: 'Testing', status: 'active', children: [
      { id: '3-1', title: 'Unit tests', status: 'active' },
    ],
  },
]);

const openRows = ref(['1', '2', '3']);
const lastAction = ref('');

function findAndRemove(items: Task[], id: string): Task | undefined {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) return items.splice(i, 1)[0];
    if (items[i].children) {
      const found = findAndRemove(items[i].children!, id);
      if (found) return found;
    }
  }
  return undefined;
}

function findById(items: Task[], id: string): Task | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findById(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function isDescendantOf(items: Task[], ancestorId: string, targetId: string): boolean {
  const ancestor = findById(items, ancestorId);
  if (!ancestor?.children) return false;
  return !!findById(ancestor.children, targetId);
}

const builder = CoarGridBuilder.create<Task>()
  .columns([
    (col) => col.tree('title').header('Task').flex(1).rowDrag(),
    (col) => col.field('status').header('Status').width(100),
  ])
  .treeData({
    children: (row) => row.children ?? [],
    rowId: (row) => row.id,
  })
  .openRows(openRows)
  .rowDataRef(tasks)
  .rowDragHighlight({
    canDrop: (dragged, target) => {
      if (dragged.id === target.id) return false;
      if (isDescendantOf(tasks.value, dragged.id, target.id)) return false;
      // When "max 2 levels" is on, only allow drop on root items
      if (maxTwoLevels.value) {
        const targetMeta = builder.getTreeMeta(target.id);
        if (targetMeta && targetMeta.depth > 0) return false;
      }
      return true;
    },
  })
  .onRowDragEnd((event) => {
    const dragged = event.node.data;
    const target = event.overNode?.data;
    if (!dragged) return;

    const clone = JSON.parse(JSON.stringify(tasks.value)) as Task[];
    const movedItem = findAndRemove(clone, dragged.id);
    if (!movedItem) return;

    if (!target) {
      clone.push(movedItem);
      tasks.value = clone;
      lastAction.value = `Moved "${movedItem.title}" to root level`;
      return;
    }

    if (dragged.id === target.id) return;
    if (isDescendantOf(tasks.value, dragged.id, target.id)) return;
    if (maxTwoLevels.value) {
      const targetMeta = builder.getTreeMeta(target.id);
      if (targetMeta && targetMeta.depth > 0) return;
    }

    const targetItem = findById(clone, target.id);
    if (!targetItem) return;

    if (!targetItem.children) targetItem.children = [];
    targetItem.children.push(movedItem);

    if (!openRows.value.includes(target.id)) {
      openRows.value = [...openRows.value, target.id];
    }

    tasks.value = clone;
    lastAction.value = `Moved "${movedItem.title}" into "${targetItem.title}"`;
  });
</script>
