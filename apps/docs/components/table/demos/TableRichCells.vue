<template>
  <CoarTable>
    <thead>
      <tr>
        <th>User</th>
        <th>Role</th>
        <th>Status</th>
        <th>Notifications</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="user in users" :key="user.id">
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <CoarAvatar :name="user.name" size="s" />
            <div>
              <div style="font-size: 14px; font-weight: 600;">{{ user.name }}</div>
              <div style="font-size: 14px; color: #64748b;">{{ user.email }}</div>
            </div>
          </div>
        </td>
        <td>{{ user.role }}</td>
        <td><CoarTag :variant="statusVariant[user.status]" size="s">{{ user.status }}</CoarTag></td>
        <td><CoarBadge v-if="user.status === 'active'" variant="error" size="s" :content="user.notifs" /></td>
      </tr>
    </tbody>
  </CoarTable>
</template>

<script setup lang="ts">
import { CoarTable, CoarTag, CoarAvatar, CoarBadge } from '@cocoar/vue-ui';

const users = [
  { id: 1, name: 'Alice Johnson', role: 'Admin', status: 'active', email: 'alice@example.com', notifs: 3 },
  { id: 2, name: 'Bob Smith', role: 'Editor', status: 'active', email: 'bob@example.com', notifs: 7 },
  { id: 3, name: 'Carol White', role: 'Viewer', status: 'pending', email: 'carol@example.com', notifs: 0 },
  { id: 4, name: 'David Brown', role: 'Editor', status: 'inactive', email: 'david@example.com', notifs: 0 },
  { id: 5, name: 'Eva Martinez', role: 'Admin', status: 'active', email: 'eva@example.com', notifs: 2 },
];

const statusVariant: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'neutral',
};
</script>
