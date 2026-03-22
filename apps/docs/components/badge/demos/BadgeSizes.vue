<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="xs" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">XS (12px)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="s" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">S (16px)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="m" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">M (20px)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="l" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">L (24px)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="xl" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">XL (32px)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
