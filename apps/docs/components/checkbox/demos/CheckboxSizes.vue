<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarCheckbox :model-value="true" size="s" label="Small checkbox" />
    <CoarCheckbox :model-value="true" size="m" label="Medium checkbox (default)" />
    <CoarCheckbox :model-value="true" size="l" label="Large checkbox" />
  </div>
</template>

<script setup lang="ts">
import { CoarCheckbox } from '@cocoar/vue-ui';
</script>
