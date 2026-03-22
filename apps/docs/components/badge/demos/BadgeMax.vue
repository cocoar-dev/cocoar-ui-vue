<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="5" :max="99" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">5 (max 99)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="99" :max="99" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">99 (max 99)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="100" :max="99" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">100 → "99+"</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="999" :max="99" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">999 → "99+"</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
