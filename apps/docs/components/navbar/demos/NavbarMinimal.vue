<template>
  <div style="border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden;">
    <CoarNavbar>
      <template #start>
        <strong>Brand</strong>
      </template>
      <template #end>
        <CoarButton variant="primary" size="s">Open App</CoarButton>
      </template>
    </CoarNavbar>
  </div>
</template>

<script setup lang="ts">
import { CoarNavbar, CoarButton } from '@cocoar/vue-ui';
</script>
