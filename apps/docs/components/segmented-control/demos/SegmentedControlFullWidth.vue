<template>
  <div style="max-width: 480px;">
    <CoarSegmentedControl
      v-model="period"
      :options="options"
      :full-width="true"
      aria-label="Reporting period"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

type Period = '1d' | '7d' | '30d' | '90d' | '1y';

const period = ref<Period>('7d');
const options: CoarSegmentedControlOption<Period>[] = [
  { value: '1d', label: '1 Day' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
];
</script>
