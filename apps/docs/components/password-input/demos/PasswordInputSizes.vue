<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarPasswordInput size="xs" label="Extra Small" placeholder="xs" />
    <CoarPasswordInput size="s" label="Small" placeholder="s" />
    <CoarPasswordInput size="m" label="Medium" placeholder="m" />
    <CoarPasswordInput size="l" label="Large" placeholder="l" />
  </div>
</template>

<script setup lang="ts">
import { CoarPasswordInput } from '@cocoar/vue-ui';
</script>
