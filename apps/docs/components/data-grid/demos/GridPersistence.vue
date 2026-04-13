<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <CoarButton size="s" @click="builder.resetPersistedStates()">Reset columns</CoarButton>
    </div>

    <div style="height: 250px;">
      <CoarDataGrid :builder="builder" bordered>
        <template #toolbar-left>
          <span style="font-weight: 600;">Team A</span>
        </template>
      </CoarDataGrid>
    </div>

    <div style="height: 250px;">
      <CoarDataGrid :builder="builder2" bordered>
        <template #toolbar-left>
          <span style="font-weight: 600;">Team B</span>
        </template>
      </CoarDataGrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';

interface User {
  name: string;
  email: string;
  role: string;
  department: string;
}

const teamA: User[] = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer', department: 'Platform' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer', department: 'Platform' },
  { name: 'Carol Williams', email: 'carol@example.com', role: 'Manager', department: 'Platform' },
];

const teamB: User[] = [
  { name: 'David Brown', email: 'david@example.com', role: 'Engineer', department: 'Product' },
  { name: 'Eve Davis', email: 'eve@example.com', role: 'Designer', department: 'Product' },
  { name: 'Frank Miller', email: 'frank@example.com', role: 'Manager', department: 'Product' },
];

const columns = [
  (col: any) => col.field('name').header('Name').flex(1),
  (col: any) => col.field('email').header('Email').flex(1),
  (col: any) => col.field('role').header('Role').width(120),
  (col: any) => col.field('department').header('Dept').width(120),
];

const builder = CoarGridBuilder.create<User>()
  .persistColumnState('docs-persistence-demo')
  .columns(columns)
  .rowData(teamA);

const builder2 = CoarGridBuilder.create<User>()
  .persistColumnState('docs-persistence-demo')
  .columns(columns)
  .rowData(teamB);
</script>
