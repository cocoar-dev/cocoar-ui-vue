<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end;">
    <div v-for="size in sizes" :key="size" class="size-item">
      <CoarIcon name="settings" :size="size" />
      <span class="size-label">{{ size }} ({{ sizeLabels[size] }})</span>
    </div>
    <div class="size-item">
      <CoarIcon name="settings" size="48px" />
      <span class="size-label">custom (48px)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l', 'xl'] as const;
const sizeLabels: Record<string, string> = { xs: '12px', s: '16px', m: '20px', l: '24px', xl: '32px' };
</script>

<style scoped>
.size-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.size-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
  white-space: nowrap;
}
</style>
