<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarTag variant="neutral">Neutral</CoarTag>
    <CoarTag variant="info">Info</CoarTag>
    <CoarTag variant="success">Success</CoarTag>
    <CoarTag variant="warning">Warning</CoarTag>
    <CoarTag variant="error">Error</CoarTag>
    <CoarTag variant="accent">Accent</CoarTag>
  </div>
</template>

<script setup lang="ts">
import { CoarTag } from '@cocoar/vue-ui';
</script>
