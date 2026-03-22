<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; align-items: center; gap: 6px;">
      <CoarBadge variant="success" dot />
      <span style="font-size: 13px; color: #64748b;">Online</span>
    </div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <CoarBadge variant="error" dot />
      <span style="font-size: 13px; color: #64748b;">Offline</span>
    </div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <CoarBadge variant="warning" dot />
      <span style="font-size: 13px; color: #64748b;">Away</span>
    </div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <CoarBadge variant="secondary" dot />
      <span style="font-size: 13px; color: #64748b;">Unknown</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
