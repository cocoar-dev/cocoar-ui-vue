<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarNumberInput size="xs" placeholder="xs" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarNumberInput size="s" placeholder="s" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarNumberInput size="m" placeholder="m" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarNumberInput size="l" placeholder="l" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';
</script>
