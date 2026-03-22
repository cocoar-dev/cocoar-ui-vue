<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end;">
    <CoarButton size="xs">Extra Small</CoarButton>
    <CoarButton size="s">Small</CoarButton>
    <CoarButton size="m">Medium</CoarButton>
    <CoarButton size="l">Large</CoarButton>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
    <code>xs</code> 27px | <code>s</code> 32px | <code>m</code> 40px | <code>l</code> 48px
  </p>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
