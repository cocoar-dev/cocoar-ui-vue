<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarNote variant="info" padding="s">Small padding — compact notes in tight spaces.</CoarNote>
    <CoarNote variant="info" padding="m">Medium padding (default) — standard note spacing.</CoarNote>
  </div>
</template>

<script setup lang="ts">
import { CoarNote } from '@cocoar/vue-ui';
</script>
