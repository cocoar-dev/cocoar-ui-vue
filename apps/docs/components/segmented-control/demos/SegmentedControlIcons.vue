<template>
  <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
    <CoarSegmentedControl
      v-model="layout"
      :options="options"
      aria-label="Layout mode"
    />
    <p style="margin: 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Layout: <strong>{{ layout }}</strong>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

type Layout = 'list' | 'grid' | 'columns';

const layout = ref<Layout>('list');
const options: CoarSegmentedControlOption<Layout>[] = [
  { value: 'list', label: 'List', icon: 'list' },
  { value: 'grid', label: 'Grid', icon: 'layout-grid' },
  { value: 'columns', label: 'Columns', icon: 'columns' },
];
</script>
