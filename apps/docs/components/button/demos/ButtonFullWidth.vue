<template>
  <div style="max-width: 360px; display: flex; flex-direction: column; gap: 8px;">
    <CoarButton :full-width="true">Full Width Primary</CoarButton>
    <CoarButton variant="secondary" :full-width="true">Full Width Secondary</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
