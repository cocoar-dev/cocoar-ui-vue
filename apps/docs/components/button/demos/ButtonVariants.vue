<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="primary">Primary</CoarButton>
    <CoarButton variant="secondary">Secondary</CoarButton>
    <CoarButton variant="tertiary">Tertiary</CoarButton>
    <CoarButton variant="danger">Danger</CoarButton>
    <CoarButton variant="ghost">Ghost</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
