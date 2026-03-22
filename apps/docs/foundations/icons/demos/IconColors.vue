<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
    <div class="color-item"><CoarIcon name="check" size="l" color="green" /><span class="color-label">green</span></div>
    <div class="color-item"><CoarIcon name="x" size="l" color="red" /><span class="color-label">red</span></div>
    <div class="color-item"><CoarIcon name="triangle-alert" size="l" color="orange" /><span class="color-label">orange</span></div>
    <div class="color-item"><CoarIcon name="circle-help" size="l" color="blue" /><span class="color-label">blue</span></div>
    <div class="color-item"><CoarIcon name="settings" size="l" color="#888" /><span class="color-label">#888</span></div>
    <div class="color-item"><CoarIcon name="user" size="l" color="var(--coar-text-accent-primary)" /><span class="color-label">accent</span></div>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';
</script>

<style scoped>
.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.color-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
  white-space: nowrap;
}
</style>
