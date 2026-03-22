<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarNumberInput size="xs" label="Extra Small" placeholder="xs" />
    <CoarNumberInput size="s" label="Small" placeholder="s" />
    <CoarNumberInput size="m" label="Medium" placeholder="m" />
    <CoarNumberInput size="l" label="Large" placeholder="l" />
  </div>
</template>

<script setup lang="ts">
import { CoarNumberInput } from '@cocoar/vue-ui';
</script>
