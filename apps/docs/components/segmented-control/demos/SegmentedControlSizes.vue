<template>
  <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
    <CoarSegmentedControl v-model="density" :options="options" size="xs" aria-label="Density xs" />
    <CoarSegmentedControl v-model="density" :options="options" size="s" aria-label="Density s" />
    <CoarSegmentedControl v-model="density" :options="options" size="m" aria-label="Density m" />
    <CoarSegmentedControl v-model="density" :options="options" size="l" aria-label="Density l" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

const density = ref<'comfortable' | 'compact'>('comfortable');
const options: CoarSegmentedControlOption<'comfortable' | 'compact'>[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];
</script>
