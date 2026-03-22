<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <p style="font-size: 13px; color: #64748b; margin: 0 0 4px;">Status</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <CoarTag variant="success">Active</CoarTag>
        <CoarTag variant="warning">Pending</CoarTag>
        <CoarTag variant="error">Expired</CoarTag>
      </div>
    </div>
    <div>
      <p style="font-size: 13px; color: #64748b; margin: 0 0 4px;">Technologies</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <CoarTag variant="accent">Vue 3</CoarTag>
        <CoarTag variant="accent">TypeScript</CoarTag>
        <CoarTag variant="accent">Vite</CoarTag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarTag } from '@cocoar/vue-ui';
</script>
