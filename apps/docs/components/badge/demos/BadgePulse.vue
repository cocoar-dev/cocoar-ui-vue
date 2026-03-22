<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="3" variant="error" pulse />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">PULSING BADGE</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge variant="error" dot pulse />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">PULSING DOT</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge content="Live" variant="error" pulse size="l" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">LIVE INDICATOR</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
