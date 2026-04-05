<template>
  <div style="height: 400px; display: flex; flex-direction: column; gap: 8px;">
    <h4 style="margin: 0;">Custom Layout</h4>
    <CoarDataGridSearch v-model="search" placeholder="Filter by name or tags...">
      <CoarButton size="s" variant="secondary" @click="showAll = !showAll">
        {{ showAll ? 'Active Only' : 'Show All' }}
      </CoarButton>
    </CoarDataGridSearch>
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarDataGridSearch, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';

interface Task {
  title: string;
  status: string;
  tags: string[];
  assignee: string;
}

const tasks: Task[] = [
  { title: 'Fix login bug', status: 'active', tags: ['bug', 'urgent'], assignee: 'Alice' },
  { title: 'Add dark mode', status: 'active', tags: ['feature', 'ui'], assignee: 'Bob' },
  { title: 'Update docs', status: 'done', tags: ['docs'], assignee: 'Carol' },
  { title: 'Refactor API', status: 'active', tags: ['refactor', 'backend'], assignee: 'David' },
  { title: 'Fix typo in header', status: 'done', tags: ['bug'], assignee: 'Eve' },
  { title: 'Add search to grid', status: 'active', tags: ['feature', 'ui'], assignee: 'Frank' },
];

const search = ref('');
const showAll = ref(true);

const builder = CoarGridBuilder.create<Task>()
  .columns([
    (col) => col.field('title').header('Title').flex(1),
    (col) => col.field('status').header('Status').width(100),
    (col) => col.field('tags').header('Tags').flex(1)
      .valueFormatter((p) => p.value?.join(', ') ?? '')
      .quickFilter((tags) => tags.join(' ')),
    (col) => col.field('assignee').header('Assignee').width(120),
  ])
  .rowData(tasks)
  .quickFilterText(search)
  .externalFilter((node) => showAll.value || node.data?.status === 'active')
  .updateExternalFilterWhen(showAll);
</script>
