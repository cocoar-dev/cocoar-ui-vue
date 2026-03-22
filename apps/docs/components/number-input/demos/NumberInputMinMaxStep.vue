<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Percentage" hint="0-100 in steps of 5">
      <CoarNumberInput
        v-model="percentage"
        :min="0"
        :max="100"
        :step="5"
        suffix="%"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Value: {{ percentage ?? 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput, CoarFormField } from '@cocoar/vue-ui';

const percentage = ref<number | null>(75);
</script>
