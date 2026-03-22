<template>
  <div style="background: var(--coar-background-neutral-secondary); border-radius: 8px; padding: 8px;">
    <CoarMenu borderless>
      <CoarMenuHeading>Navigation</CoarMenuHeading>
      <CoarMenuItem icon="home">Home</CoarMenuItem>
      <CoarMenuItem icon="user">Profile</CoarMenuItem>
      <CoarMenuItem icon="settings">Settings</CoarMenuItem>
    </CoarMenu>
  </div>
</template>

<script setup lang="ts">
import { CoarMenu, CoarMenuItem, CoarMenuHeading } from '@cocoar/vue-ui';
</script>
