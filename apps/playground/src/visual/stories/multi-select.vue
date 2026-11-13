<script setup lang="ts">
import { CoarMultiSelect } from '@cocoar/vue-ui';

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
    <h2 class="vs-title">Sizes: placeholder, one selected, three selected</h2>
    <div class="vs-grid">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarMultiSelect
          :size="size"
          :options="options"
          :model-value="[]"
          placeholder="Choose cities"
        />
        <CoarMultiSelect :size="size" :options="options" :model-value="['vie']" />
        <CoarMultiSelect
          :size="size"
          :options="options"
          :model-value="['vie', 'grz', 'ber']"
          clearable
        />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States</h2>
    <div class="vs-grid">
      <span class="vs-label">disabled</span>
      <CoarMultiSelect :options="options" :model-value="[]" placeholder="Choose cities" disabled />
      <CoarMultiSelect :options="options" :model-value="['vie']" disabled />
      <CoarMultiSelect :options="options" :model-value="['vie', 'grz', 'ber']" disabled />

      <span class="vs-label">readonly</span>
      <CoarMultiSelect :options="options" :model-value="[]" placeholder="Choose cities" readonly />
      <CoarMultiSelect :options="options" :model-value="['vie']" readonly />
      <CoarMultiSelect :options="options" :model-value="['vie', 'grz', 'ber']" readonly />

      <span class="vs-label">error</span>
      <CoarMultiSelect :options="options" :model-value="[]" placeholder="Choose cities" error />
      <CoarMultiSelect :options="options" :model-value="['vie']" error />
      <CoarMultiSelect :options="options" :model-value="['vie', 'grz', 'ber']" error />
    </div>
  </section>
</template>
