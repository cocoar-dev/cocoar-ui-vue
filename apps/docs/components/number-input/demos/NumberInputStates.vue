<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarNumberInput :model-value="42" label="Disabled" :disabled="true" />
    <CoarNumberInput :model-value="42" label="Readonly" :readonly="true" />
    <CoarNumberInput label="Required" :required="true" placeholder="Required" />
    <CoarNumberInput label="With Error" error="Value must be between 1 and 100" />
  </div>
</template>

<script setup lang="ts">
import { CoarNumberInput } from '@cocoar/vue-ui';
</script>
