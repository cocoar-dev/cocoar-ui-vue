<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="primary" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">PRIMARY</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="secondary" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">SECONDARY</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="success" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">SUCCESS</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="warning" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">WARNING</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="error" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">ERROR</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="info" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">INFO</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
