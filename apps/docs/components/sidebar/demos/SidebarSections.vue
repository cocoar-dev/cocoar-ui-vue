<template>
  <div style="height: 360px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden; display: flex;">
    <CoarSidebar>
      <template #header>
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px;">
          <div style="width: 28px; height: 28px; background: var(--coar-background-accent-primary); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">A</div>
          <strong>Admin Panel</strong>
        </div>
      </template>

      <CoarMenu borderless>
        <CoarMenuHeading>Main</CoarMenuHeading>
        <CoarMenuItem icon="home">Dashboard</CoarMenuItem>
        <CoarMenuItem icon="list">Projects</CoarMenuItem>
        <CoarMenuHeading>Management</CoarMenuHeading>
        <CoarSubExpand label="Users">
          <CoarMenuItem>All Users</CoarMenuItem>
          <CoarMenuItem>Roles</CoarMenuItem>
          <CoarMenuItem>Permissions</CoarMenuItem>
        </CoarSubExpand>
        <CoarSubExpand label="Reports">
          <CoarMenuItem>Sales</CoarMenuItem>
          <CoarMenuItem>Analytics</CoarMenuItem>
        </CoarSubExpand>
        <CoarMenuHeading>System</CoarMenuHeading>
        <CoarMenuItem icon="settings">Settings</CoarMenuItem>
        <CoarMenuItem icon="globe">Localization</CoarMenuItem>
      </CoarMenu>

      <template #footer>
        <CoarMenu borderless>
          <CoarMenuDivider />
          <CoarMenuItem icon="user">John Doe</CoarMenuItem>
          <CoarMenuItem icon="log-out">Logout</CoarMenuItem>
        </CoarMenu>
      </template>
    </CoarSidebar>
  </div>
</template>

<script setup lang="ts">
import { CoarSidebar, CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading, CoarSubExpand } from '@cocoar/vue-ui';
</script>
