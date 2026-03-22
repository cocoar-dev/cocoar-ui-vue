<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarCheckbox :model-value="false" label="Subscribe to newsletter" hint="Receive weekly updates about new features." />
    <CoarCheckbox :model-value="false" label="Enable analytics" hint="Help us improve the product by sharing usage data." />
  </div>
</template>

<script setup lang="ts">
import { CoarCheckbox } from '@cocoar/vue-ui';
</script>
