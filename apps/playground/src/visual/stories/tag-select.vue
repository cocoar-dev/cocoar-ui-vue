<script setup lang="ts">
import { CoarTagSelect } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
const options = [
  { value: 'vie', label: 'Vienna', group: 'Austria' },
  { value: 'grz', label: 'Graz', group: 'Austria' },
  { value: 'lnz', label: 'Linz (closed)', group: 'Austria', disabled: true },
  { value: 'ber', label: 'Berlin', group: 'Germany' },
  { value: 'muc', label: 'Munich', group: 'Germany' },
];
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes: placeholder, two tags</h2>
    <div class="vs-grid" style="--vs-columns: 2">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarTagSelect :size="size" :options="options" :model-value="[]" placeholder="Add cities" />
        <CoarTagSelect :size="size" :options="options" :model-value="['vie', 'ber']" />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States</h2>
    <div class="vs-grid" style="--vs-columns: 2">
      <span class="vs-label">disabled</span>
      <CoarTagSelect :options="options" :model-value="[]" placeholder="Add cities" disabled />
      <CoarTagSelect :options="options" :model-value="['vie', 'ber']" disabled />

      <span class="vs-label">readonly</span>
      <CoarTagSelect :options="options" :model-value="[]" placeholder="Add cities" readonly />
      <CoarTagSelect :options="options" :model-value="['vie', 'ber']" readonly />

      <span class="vs-label">error</span>
      <CoarTagSelect :options="options" :model-value="[]" placeholder="Add cities" error />
      <CoarTagSelect :options="options" :model-value="['vie', 'ber']" error />
    </div>
  </section>
</template>
