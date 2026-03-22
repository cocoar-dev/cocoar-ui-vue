<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 16px 0;">
    <CoarButton v-tooltip="{ text: 'Top tooltip', placement: 'top' }">Top</CoarButton>
    <CoarButton v-tooltip="{ text: 'Bottom tooltip', placement: 'bottom' }">Bottom</CoarButton>
    <CoarButton v-tooltip="{ text: 'Left tooltip', placement: 'left' }">Left</CoarButton>
    <CoarButton v-tooltip="{ text: 'Right tooltip', placement: 'right' }">Right</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, vTooltip } from '@cocoar/vue-ui';
</script>
