<template>
  <div>
    <div style="height: 320px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click any "done" cell to enter edit mode. <strong>Space</strong> toggles, <strong>Tab</strong> commits and moves to the next editable cell, <strong>Escape</strong> cancels. Locked rows can't be entered.
    </div>
    <div
      v-if="lastChange"
      style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--coar-surface-neutral-subtle); font-size: 13px;"
    >
      Last change: <strong>{{ lastChange.task }}</strong> —
      <code>done</code> →
      <strong>{{ lastChange.value ? 'true' : 'false' }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Task {
  id: number;
  task: string;
  done: boolean;
  locked: boolean;
}

const data = ref<Task[]>([
  { id: 1, task: 'Write specification',     done: true,  locked: false },
  { id: 2, task: 'Implement renderer',      done: false, locked: false },
  { id: 3, task: 'Ship to production',      done: false, locked: true  },
  { id: 4, task: 'Update changelog',        done: true,  locked: false },
  { id: 5, task: 'Archive (legacy)',        done: true,  locked: true  },
]);

const lastChange = shallowRef<{ task: string; value: boolean } | null>(null);

const builder = CoarGridBuilder.create<Task>()
  .columns([
    (col) => col.checkbox('done').width(70).editable((row) => !row.locked),
    (col) => col.field('task').header('Task').flex(1),
    (col) => col.checkbox('locked').width(90),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus()
  .onCellValueChanged((event) => {
    if (event.colDef.field !== 'done' || !event.data) return;
    lastChange.value = { task: event.data.task, value: event.newValue };
  });
</script>
