<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarNote variant="info"><strong>Info:</strong> Informational message for guidance or context.</CoarNote>
    <CoarNote variant="success"><strong>Success:</strong> Action completed successfully.</CoarNote>
    <CoarNote variant="warning"><strong>Warning:</strong> Pay attention, potential issue ahead.</CoarNote>
    <CoarNote variant="error"><strong>Error:</strong> Something went wrong. Action required.</CoarNote>
    <CoarNote variant="neutral">Neutral note for general content without semantic meaning.</CoarNote>
    <CoarNote variant="brand">Brand-colored note for promotional or feature highlights.</CoarNote>
  </div>
</template>

<script setup lang="ts">
import { CoarNote } from '@cocoar/vue-ui';
</script>
