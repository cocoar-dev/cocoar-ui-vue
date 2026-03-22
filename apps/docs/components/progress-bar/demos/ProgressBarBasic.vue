<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarProgressBar :value="progress" />
    <div style="display: flex; gap: 8px; align-items: center;">
      <button class="adj-btn" @click="progress = Math.max(0, progress - 10)">-10</button>
      <span style="min-width: 40px; text-align: center; font-size: 14px;">{{ progress }}%</span>
      <button class="adj-btn" @click="progress = Math.min(100, progress + 10)">+10</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarProgressBar } from '@cocoar/vue-ui';

const progress = ref(65);
</script>

<style scoped>
.adj-btn {
  padding: 4px 12px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 6px;
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  font-size: 14px;
}
.adj-btn:hover {
  background: var(--coar-background-neutral-tertiary);
}
</style>
