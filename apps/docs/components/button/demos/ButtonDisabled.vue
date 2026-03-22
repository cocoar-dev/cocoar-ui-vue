<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton :disabled="true">Primary</CoarButton>
    <CoarButton variant="secondary" :disabled="true">Secondary</CoarButton>
    <CoarButton variant="tertiary" :disabled="true">Tertiary</CoarButton>
    <CoarButton variant="danger" :disabled="true">Danger</CoarButton>
    <CoarButton variant="ghost" :disabled="true">Ghost</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
