<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarDivider label="Start" align="start" />
    <CoarDivider label="Center (default)" align="center" />
    <CoarDivider label="End" align="end" />
  </div>
</template>

<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
</script>
