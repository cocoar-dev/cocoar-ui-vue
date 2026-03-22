<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <CoarSpinner size="s" />
      <span style="font-size: 14px;">Loading data...</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <CoarSpinner size="m" />
      <span style="font-size: 14px;">Saving changes...</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <CoarSpinner size="l" />
      <span>Processing request...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarSpinner } from '@cocoar/vue-ui';
</script>
