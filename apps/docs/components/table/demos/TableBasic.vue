<template>
  <CoarTable>
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="user in users" :key="user.id">
        <td>{{ user.id }}</td>
        <td>{{ user.name }}</td>
        <td>{{ user.email }}</td>
        <td>{{ user.role }}</td>
        <td>
          <CoarTag :variant="statusVariant[user.status]" size="s">{{ user.status }}</CoarTag>
        </td>
      </tr>
    </tbody>
  </CoarTable>
</template>

<script setup lang="ts">
import { CoarTable, CoarTag } from '@cocoar/vue-ui';

const users = [
  { id: 1, name: 'Alice Johnson', role: 'Admin', status: 'active', email: 'alice@example.com' },
  { id: 2, name: 'Bob Smith', role: 'Editor', status: 'active', email: 'bob@example.com' },
  { id: 3, name: 'Carol White', role: 'Viewer', status: 'pending', email: 'carol@example.com' },
  { id: 4, name: 'David Brown', role: 'Editor', status: 'inactive', email: 'david@example.com' },
  { id: 5, name: 'Eva Martinez', role: 'Admin', status: 'active', email: 'eva@example.com' },
];

const statusVariant: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'neutral',
};
</script>
