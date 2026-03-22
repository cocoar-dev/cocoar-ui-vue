<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Quantity (both)">
      <CoarNumberInput
        v-model="quantity"
        stepper-buttons="both"
        :min="1"
        :max="99"
      />
    </CoarFormField>
    <CoarFormField label="Price (end)">
      <CoarNumberInput
        v-model="price"
        stepper-buttons="end"
        :min="0"
        :step="0.01"
        suffix="€"
      />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';

const quantity = ref<number | null>(1);
const price = ref<number | null>(null);
</script>
