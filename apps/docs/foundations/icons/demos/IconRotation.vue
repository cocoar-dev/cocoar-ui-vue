<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
    <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="0" /><span class="rotation-label">0&deg;</span></div>
    <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="90" /><span class="rotation-label">90&deg;</span></div>
    <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="180" /><span class="rotation-label">180&deg;</span></div>
    <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="270" /><span class="rotation-label">270&deg;</span></div>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';
</script>

<style scoped>
.rotation-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.rotation-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
  white-space: nowrap;
}
</style>
