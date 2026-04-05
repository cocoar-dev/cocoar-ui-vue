<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';
import { useFragmentNavigation, useRoutedModals } from '@cocoar/vue-fragment-parser';

interface Todo {
  id: string;
  title: string;
  status: string;
}

const todos = ref<Todo[]>([
  { id: 'todo-1', title: 'Setup project', status: 'done' },
  { id: 'todo-2', title: 'Build components', status: 'active' },
  { id: 'todo-3', title: 'Write tests', status: 'active' },
  { id: 'todo-4', title: 'Deploy to production', status: 'pending' },
  { id: 'todo-5', title: 'User acceptance testing', status: 'pending' },
]);

const { navigateToModal } = useFragmentNavigation();
useRoutedModals();

const selectedId = ref<string | null>(null);

const builder = CoarGridBuilder.create<Todo>()
  .columns([
    (col) => col.field('title').header('Title').flex(1),
    (col) => col.field('status').header('Status').width(120),
  ])
  .rowDataRef(todos)
  .rowId((p) => p.data.id)
  .rowSelection('single')
  .onRowClicked((event) => {
    selectedId.value = event.data?.id ?? null;
  })
  .autoSize('fitGridWidth');

function openAsDialog() {
  if (selectedId.value) navigateToModal(`dialog/${selectedId.value}`);
}

function openAsModal() {
  if (selectedId.value) navigateToModal(`modal/${selectedId.value}`);
}
</script>

<template>
  <div style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
    <h2>Todos</h2>
    <p style="color: #666; font-size: 0.9em;">
      Select a row, then open it as Dialog (with shell) or Modal (raw overlay).
    </p>
    <div style="display: flex; gap: 8px;">
      <CoarButton size="s" :disabled="!selectedId" @click="openAsDialog">
        Open as Dialog
      </CoarButton>
      <CoarButton size="s" variant="secondary" :disabled="!selectedId" @click="openAsModal">
        Open as Modal
      </CoarButton>
    </div>
    <CoarDataGrid :builder="builder" />
  </div>
</template>
