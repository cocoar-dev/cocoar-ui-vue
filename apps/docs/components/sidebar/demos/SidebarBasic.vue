<template>
  <div style="height: 360px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden; display: flex;">
    <CoarSidebar>
      <template #header>
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px;">
          <div style="width: 28px; height: 28px; background: var(--coar-background-accent-primary); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">C</div>
          <strong>cocoar</strong>
        </div>
      </template>

      <CoarMenu borderless>
        <CoarMenuItem icon="home">Dashboard</CoarMenuItem>
        <CoarMenuItem icon="user">Profile</CoarMenuItem>
        <CoarMenuItem icon="list">Projects</CoarMenuItem>
        <CoarMenuItem icon="settings">Settings</CoarMenuItem>
      </CoarMenu>

      <template #footer>
        <CoarMenu borderless>
          <CoarMenuDivider />
          <CoarMenuItem icon="log-out">Logout</CoarMenuItem>
        </CoarMenu>
      </template>
    </CoarSidebar>
  </div>
</template>

<script setup lang="ts">
import { CoarSidebar, CoarMenu, CoarMenuItem, CoarMenuDivider } from '@cocoar/vue-ui';
</script>
