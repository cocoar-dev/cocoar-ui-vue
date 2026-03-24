<template>
  <div>
    <div style="height: 300px;">
      <CoarDataGrid :builder="builder" />
    </div>

    <!-- Cell context menu (right-click on a row) -->
    <CoarContextMenu :menu="cellMenu">
      <CoarMenuItem icon="pencil" label="Edit" @clicked="onCellAction('Edit', selectedUser)" />
      <CoarMenuItem icon="copy" label="Duplicate" @clicked="onCellAction('Duplicate', selectedUser)" />
      <CoarMenuDivider />
      <CoarMenuItem icon="trash-2" label="Delete" @clicked="onCellAction('Delete', selectedUser)" />
    </CoarContextMenu>

    <!-- Viewport context menu (right-click on empty area) -->
    <CoarContextMenu :menu="viewportMenu">
      <CoarMenuItem icon="plus" label="Add user" @clicked="onViewportAction('Add user')" />
      <CoarMenuItem icon="refresh-cw" label="Refresh" @clicked="onViewportAction('Refresh')" />
    </CoarContextMenu>

    <p class="status">Last action: {{ lastAction || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import type { CellContextMenuEvent } from '@cocoar/vue-data-grid';
import { useContextMenu, CoarContextMenu, CoarMenuItem, CoarMenuDivider } from '@cocoar/vue-ui';

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

const cellMenu = useContextMenu();
const viewportMenu = useContextMenu();
const selectedUser = ref<User | null>(null);
const lastAction = ref('');

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
  ])
  .rowData(data)
  .onCellContextMenu((event: CellContextMenuEvent<User>) => {
    selectedUser.value = event.data ?? null;
    if (event.event) {
      cellMenu.open(event.event as MouseEvent);
    }
  })
  .onViewportContextMenu((event: MouseEvent) => {
    viewportMenu.open(event);
  });

function onCellAction(action: string, user: User | null) {
  lastAction.value = `${action}: ${user?.name ?? 'unknown'}`;
}

function onViewportAction(action: string) {
  lastAction.value = action;
}
</script>

<style scoped>
.status {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
