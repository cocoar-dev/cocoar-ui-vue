<template>
  <div style="border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden;">
    <CoarNavbar bordered>
      <template #start>
        <strong>App</strong>
      </template>
      <template #end>
        <CoarButton variant="ghost" size="s">Menu</CoarButton>
      </template>
    </CoarNavbar>
  </div>
</template>

<script setup lang="ts">
import { CoarNavbar, CoarButton } from '@cocoar/vue-ui';
</script>
