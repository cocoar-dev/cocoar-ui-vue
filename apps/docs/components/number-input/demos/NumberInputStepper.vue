<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarNumberInput
      v-model="quantity"
      label="Quantity (both)"
      stepper-buttons="both"
      :min="1"
      :max="99"
    />
    <CoarNumberInput
      v-model="price"
      label="Price (end)"
      stepper-buttons="end"
      :min="0"
      :step="0.01"
      suffix="€"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput } from '@cocoar/vue-ui';

const quantity = ref<number | null>(1);
const price = ref<number | null>(null);
</script>
