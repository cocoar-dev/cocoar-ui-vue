<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Disabled">
      <CoarNumberInput :model-value="42" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarNumberInput :model-value="42" :readonly="true" />
    </CoarFormField>
    <CoarFormField label="Required" required>
      <CoarNumberInput :required="true" placeholder="Required" />
    </CoarFormField>
    <CoarFormField label="With Error" error="Value must be between 1 and 100">
      <CoarNumberInput />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';
</script>
