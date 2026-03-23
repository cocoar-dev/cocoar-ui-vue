<template>
  <div class="loading-overlay">
    <CoarSpinner size="l" />
    <span style="font-size: 14px;">Loading application...</span>
  </div>
</template>

<script setup lang="ts">
import { CoarSpinner } from '@cocoar/vue-ui';
</script>

<style scoped>
.loading-overlay {
  background: var(--coar-background-neutral-primary);
  border-radius: 8px;
  border: 1px solid var(--coar-border-neutral-secondary);
  padding: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 160px;
  justify-content: center;
}
</style>
