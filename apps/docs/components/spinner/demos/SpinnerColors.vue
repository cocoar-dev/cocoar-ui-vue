<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center; justify-content: center;">
    <CoarSpinner />
    <CoarSpinner color="var(--coar-background-semantic-success-bold)" />
    <CoarSpinner color="var(--coar-background-semantic-error-bold)" />
    <CoarSpinner color="var(--coar-background-semantic-warning-bold)" />
    <CoarSpinner color="var(--coar-text-accent-primary)" />
  </div>
</template>

<script setup lang="ts">
import { CoarSpinner } from '@cocoar/vue-ui';
</script>
