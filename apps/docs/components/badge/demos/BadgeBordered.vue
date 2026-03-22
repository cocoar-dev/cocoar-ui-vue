<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="5" bordered />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">WITH BORDER</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="5" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">WITHOUT BORDER</span>
    </div>
    <div style="position: relative; display: inline-flex; align-items: flex-end; gap: 6px;">
      <CoarAvatar name="JD" size="l" />
      <CoarBadge :content="3" variant="error" bordered style="position: absolute; top: -4px; right: -4px;" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace; align-self: center; margin-left: 6px;">ON AVATAR</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge, CoarAvatar } from '@cocoar/vue-ui';
</script>
