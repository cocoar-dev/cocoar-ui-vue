<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarFormField hint="Receive weekly updates about new features.">
      <CoarCheckbox :model-value="false" label="Subscribe to newsletter" />
    </CoarFormField>
    <CoarFormField hint="Help us improve the product by sharing usage data.">
      <CoarCheckbox :model-value="false" label="Enable analytics" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';
</script>
