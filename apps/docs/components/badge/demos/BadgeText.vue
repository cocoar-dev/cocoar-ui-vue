<template>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
    <CoarBadge content="New" variant="info" size="l" />
    <CoarBadge content="Beta" variant="warning" size="l" />
    <CoarBadge content="Pro" variant="success" size="l" />
    <CoarBadge content="Hot" variant="error" size="l" />
    <CoarBadge content="v2" variant="secondary" size="l" />
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
