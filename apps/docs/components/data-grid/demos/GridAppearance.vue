<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="showTitle" /> Title (left)
      </label>
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="showSearch" /> Search
      </label>
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="showActions" /> Actions (right)
      </label>
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="bordered" /> Bordered
      </label>
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="elevated" /> Elevated
      </label>
    </div>
    <div style="height: 300px;">
      <CoarDataGrid
        :builder="builder"
        :show-search="showSearch"
        :bordered="bordered"
        :elevated="elevated"
        search-placeholder="Search users..."
      >
        <template v-if="showTitle" #toolbar-left>
          <span style="font-weight: 600; white-space: nowrap;">User List</span>
        </template>
        <template v-if="showActions" #toolbar-right>
          <CoarButton size="s" variant="secondary">Export</CoarButton>
          <CoarButton size="s">Add User</CoarButton>
        </template>
      </CoarDataGrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';

const showTitle = ref(false);
const showSearch = ref(true);
const showActions = ref(true);
const bordered = ref(true);
const elevated = ref(false);

interface User {
  name: string;
  email: string;
  role: string;
}

const data: User[] = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  { name: 'Carol Williams', email: 'carol@example.com', role: 'Manager' },
  { name: 'David Brown', email: 'david@example.com', role: 'Engineer' },
  { name: 'Eve Davis', email: 'eve@example.com', role: 'Designer' },
];

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
  ])
  .rowData(data);
</script>
