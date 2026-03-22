<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopover mode="hover">
      <CoarButton variant="ghost">Hover me</CoarButton>
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <p style="margin: 0; font-size: 13px;">This popover opens on hover. Great for supplementary information.</p>
        </div>
      </template>
    </CoarPopover>

    <CoarPopover mode="both">
      <CoarButton variant="secondary">Hover or click</CoarButton>
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <p style="margin: 0; font-size: 13px;">Opens on hover. Click to pin it open — then click again to close.</p>
        </div>
      </template>
    </CoarPopover>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, CoarPopover } from '@cocoar/vue-ui';
</script>
