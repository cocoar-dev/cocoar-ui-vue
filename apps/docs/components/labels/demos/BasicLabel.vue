<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarLabel text="Username" />
    <CoarLabel text="Email address" />
    <CoarLabel text="Phone number" />
  </div>
</template>

<script setup lang="ts">
import { CoarLabel } from '@cocoar/vue-ui';
</script>
