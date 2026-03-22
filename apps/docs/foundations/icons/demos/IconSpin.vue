<template>
  <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start;">
    <div class="spin-item">
      <CoarIcon name="loader-circle" size="xl" :spin="true" />
      <span style="font-size: 14px;">Loading...</span>
    </div>
    <div class="spin-item">
      <CoarIcon name="settings" size="l" :spin="true" />
      <span style="font-size: 14px;">Processing</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';
</script>

<style scoped>
.spin-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
</style>
