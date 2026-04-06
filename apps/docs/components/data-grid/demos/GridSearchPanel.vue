<template>
  <div style="height: 400px;">
    <CoarDataGrid
      :builder="builder"
      show-search
      search-placeholder="Search users..."
    >
      <template #toolbar-right>
        <CoarButton size="s" variant="secondary" @click="addUser">Add User</CoarButton>
      </template>
    </CoarDataGrid>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';

interface User {
  name: string;
  email: string;
  role: string;
  department: string;
}

const users = ref<User[]>([
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer', department: 'Platform' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer', department: 'Product' },
  { name: 'Carol Williams', email: 'carol@example.com', role: 'Manager', department: 'Platform' },
  { name: 'David Brown', email: 'david@example.com', role: 'Engineer', department: 'Mobile' },
  { name: 'Eve Davis', email: 'eve@example.com', role: 'Designer', department: 'Product' },
  { name: 'Frank Miller', email: 'frank@example.com', role: 'Engineer', department: 'Mobile' },
  { name: 'Grace Wilson', email: 'grace@example.com', role: 'Manager', department: 'Product' },
  { name: 'Henry Taylor', email: 'henry@example.com', role: 'Designer', department: 'Platform' },
]);

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).sortable(),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
    (col) => col.field('department').header('Department').width(130),
  ])
  .rowDataRef(users)
  .searchHighlight();

let counter = 0;
function addUser() {
  counter++;
  users.value = [
    ...users.value,
    { name: `New User ${counter}`, email: `new${counter}@example.com`, role: 'Engineer', department: 'Platform' },
  ];
}
</script>
