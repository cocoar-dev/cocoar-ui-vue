<template>
  <div>
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <CoarButton size="s" @click="addRow">Add Row</CoarButton>
      <CoarButton size="s" variant="secondary" @click="reset">Reset</CoarButton>
      <span style="font-size: 13px; color: var(--coar-text-neutral-secondary); align-self: center;">
        {{ data.length }} rows
      </span>
    </div>
    <div style="height: 300px;">
      <CoarDataGrid :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const initialData: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com', role: 'Manager' },
];

const allRows: User[] = [
  ...initialData,
  { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Engineer' },
  { id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'Designer' },
  { id: 6, name: 'Frank Miller', email: 'frank@example.com', role: 'Engineer' },
  { id: 7, name: 'Grace Wilson', email: 'grace@example.com', role: 'Manager' },
  { id: 8, name: 'Henry Taylor', email: 'henry@example.com', role: 'Designer' },
];

const data = ref<User[]>([...initialData]);

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
  ])
  .rowDataRef(data);

function addRow() {
  const next = allRows[data.value.length % allRows.length];
  if (next) {
    data.value = [...data.value, { ...next, id: Date.now() }];
  }
}

function reset() {
  data.value = [...initialData];
}
</script>
