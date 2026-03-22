<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarPasswordInput size="xs" placeholder="xs" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarPasswordInput size="s" placeholder="s" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarPasswordInput size="m" placeholder="m" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarPasswordInput size="l" placeholder="l" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPasswordInput, CoarFormField } from '@cocoar/vue-ui';
</script>
