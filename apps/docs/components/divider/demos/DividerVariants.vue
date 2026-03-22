<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarDivider label="Default" />
    <CoarDivider label="Subtle" variant="subtle" />
    <CoarDivider label="Bold" variant="bold" />
  </div>
</template>

<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
</script>
