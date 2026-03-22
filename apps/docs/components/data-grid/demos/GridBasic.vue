<template>
  <div style="height: 350px;">
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

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
