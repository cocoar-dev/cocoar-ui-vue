<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface User {
  id: string;
  userName: string;
  email: string;
}

const users = ref<User[]>([
  { id: '1', userName: 'admin', email: 'admin@cocoar.local' },
  { id: '2', userName: 'user1', email: 'user1@test.com' },
]);

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('userName').header('Username').flex(1),
    (col) => col.field('email').header('Email').width(200),
  ])
  .rowDataRef(users)
  .autoSize('fitGridWidth');
</script>

<template>
  <div style="height: calc(100vh - 100px);">
    <h2>Flex Debug</h2>
    <CoarDataGrid :builder="builder" />
  </div>
</template>
