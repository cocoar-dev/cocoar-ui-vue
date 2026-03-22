<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Count" hint="Whole numbers only">
      <CoarNumberInput
        v-model="value"
        placeholder="Enter a number"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Value: {{ value ?? 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';

const value = ref<number | null>(null);
</script>
