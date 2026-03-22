<template>
  <div style="display: flex; gap: 16px; align-items: center;">
    <CoarCheckbox :model-value="false" aria-label="Select row 1" />
    <CoarCheckbox :model-value="true" aria-label="Select row 2" />
    <CoarCheckbox :model-value="false" :indeterminate="true" aria-label="Select all" />
  </div>
</template>

<script setup lang="ts">
import { CoarCheckbox } from '@cocoar/vue-ui';
</script>
