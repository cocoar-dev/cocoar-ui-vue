<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarTextInput size="xs" placeholder="27px" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarTextInput size="s" placeholder="32px" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarTextInput size="m" placeholder="40px" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarTextInput size="l" placeholder="48px" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';
</script>
