<template>
  <div>
    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
      <label style="display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer;">
        <input type="radio" value="single" v-model="mode" /> Single
      </label>
      <label style="display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer;">
        <input type="radio" value="multiple" v-model="mode" /> Multi (Checkboxes)
      </label>
    </div>
    <div style="height: 300px;">
      <CoarDataGrid :key="mode" :builder="builders[mode]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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

const cols = [
  (col: any) => col.field('name').header('Name').flex(1),
  (col: any) => col.field('email').header('Email').flex(1),
  (col: any) => col.field('role').header('Role').width(120),
];

const mode = ref<'single' | 'multiple'>('single');

const builders = {
  single: CoarGridBuilder.create<User>().columns(cols).rowData(data).rowSelection('single'),
  multiple: CoarGridBuilder.create<User>().columns(cols).rowData(data).rowSelection('multiple', { checkboxes: true }),
};
</script>
