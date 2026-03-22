<template>
  <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-end; justify-content: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <CoarSpinner size="xs" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">xs</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <CoarSpinner size="s" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">s</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <CoarSpinner size="m" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">m</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <CoarSpinner size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">l</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <CoarSpinner size="xl" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">xl</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarSpinner } from '@cocoar/vue-ui';
</script>
