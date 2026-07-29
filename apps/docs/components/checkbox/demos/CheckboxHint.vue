<template>
  <div style="display: flex; flex-direction: column; gap: 8px">
    <CoarFormField
      label="Subscribe to newsletter"
      hint="Receive weekly updates about new features."
      layout="inline"
      label-position="after"
    >
      <CoarCheckbox :model-value="false" />
    </CoarFormField>
    <CoarFormField
      label="Enable analytics"
      hint="Help us improve the product by sharing usage data."
      layout="inline"
      label-position="after"
    >
      <CoarCheckbox :model-value="false" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';
</script>
