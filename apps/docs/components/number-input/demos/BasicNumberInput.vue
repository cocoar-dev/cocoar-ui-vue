<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarNumberInput
      v-model="value"
      label="Count"
      placeholder="Enter a number"
      hint="Whole numbers only"
    />
    <span style="font-size: 13px; color: #64748b;">Value: {{ value ?? 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput } from '@cocoar/vue-ui';

const value = ref<number | null>(null);
</script>
