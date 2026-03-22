<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="JD" shape="circle" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">circle</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="JD" shape="square" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">square</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar src="https://i.pravatar.cc/150?img=5" name="JD" shape="circle" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">circle + image</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar src="https://i.pravatar.cc/150?img=5" name="JD" shape="square" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">square + image</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarAvatar } from '@cocoar/vue-ui';
</script>
