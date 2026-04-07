<template>
  <div style="height: 250px; width: 220px;">
    <CoarMenu style="height: 100%; width: 100%;">
      <CoarMenuHeading label="Navigation" />
      <CoarMenuItem icon="home" label="Dashboard" />
      <CoarMenuItem icon="users" label="Users" />
      <CoarMenuItem icon="settings" label="Settings" />
      <CoarMenuItem icon="bell" label="Notifications" />
      <CoarMenuDivider />
      <CoarMenuHeading label="Projects" />
      <CoarMenuItem icon="folder" label="Frontend" />
      <CoarMenuItem icon="folder" label="Backend" />
      <CoarMenuItem icon="folder" label="Mobile App" />
      <CoarMenuItem icon="folder" label="Design System" />
      <CoarMenuItem icon="folder" label="Documentation" />
      <CoarMenuDivider />
      <CoarMenuHeading label="Admin" />
      <CoarMenuItem icon="database" label="Database" />
      <CoarMenuItem icon="code" label="API Keys" />
      <CoarMenuItem icon="clipboard" label="Audit Log" />
      <CoarMenuItem icon="download" label="Exports" />
    </CoarMenu>
  </div>
</template>

<script setup lang="ts">
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading } from '@cocoar/vue-ui';
</script>
