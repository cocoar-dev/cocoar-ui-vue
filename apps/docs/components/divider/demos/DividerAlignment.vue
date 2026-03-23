<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarDivider align="left">Left</CoarDivider>
    <CoarDivider align="center">Center (default)</CoarDivider>
    <CoarDivider align="right">Right</CoarDivider>
  </div>
</template>

<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
</script>
