<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Disabled">
      <CoarPasswordInput :model-value="'secret123'" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarPasswordInput :model-value="'readonly-pass'" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPasswordInput, CoarFormField } from '@cocoar/vue-ui';
</script>
