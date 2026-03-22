<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="xs" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">xs</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="s" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">s</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="m" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">m</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">l</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="xl" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">xl</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarAvatar } from '@cocoar/vue-ui';
</script>
