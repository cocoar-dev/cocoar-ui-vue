<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <span
      v-tooltip="'This is a span'"
      style="padding: 4px 8px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 4px; font-size: 13px; cursor: default;"
    >Hover me (span)</span>
    <CoarIcon name="circle-help" size="l" v-tooltip="'Help: Click for more info'" style="cursor: help" />
    <code
      v-tooltip="'CSS custom property'"
      style="cursor: default; background: var(--coar-background-neutral-tertiary); padding: 2px 6px; border-radius: 3px; font-size: 13px;"
    >--coar-spacing-m</code>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon, vTooltip } from '@cocoar/vue-ui';
</script>
