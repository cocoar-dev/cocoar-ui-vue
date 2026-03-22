<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarNumberInput
      v-model="percentage"
      label="Percentage"
      :min="0"
      :max="100"
      :step="5"
      suffix="%"
      hint="0-100 in steps of 5"
    />
    <span style="font-size: 13px; color: #64748b;">Value: {{ percentage ?? 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput } from '@cocoar/vue-ui';

const percentage = ref<number | null>(75);
</script>
