<script setup lang="ts">
import { CoarSelect } from '@cocoar/vue-ui';

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
    <h2 class="vs-title">Sizes: placeholder, value, clearable</h2>
    <div class="vs-grid">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarSelect
          :size="size"
          :options="options"
          :model-value="null"
          placeholder="Choose a city"
        />
        <CoarSelect :size="size" :options="options" model-value="vie" />
        <CoarSelect :size="size" :options="options" model-value="grz" clearable />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States and inline appearance</h2>
    <div class="vs-grid">
      <span class="vs-label">disabled</span>
      <CoarSelect :options="options" :model-value="null" placeholder="Choose a city" disabled />
      <CoarSelect :options="options" model-value="vie" disabled />
      <CoarSelect :options="options" model-value="vie" disabled clearable />

      <span class="vs-label">readonly</span>
      <CoarSelect :options="options" :model-value="null" placeholder="Choose a city" readonly />
      <CoarSelect :options="options" model-value="vie" readonly />
      <CoarSelect :options="options" model-value="vie" readonly clearable />

      <span class="vs-label">error</span>
      <CoarSelect :options="options" :model-value="null" placeholder="Choose a city" error />
      <CoarSelect :options="options" model-value="vie" error />
      <CoarSelect :options="options" model-value="vie" error clearable />

      <span class="vs-label">inline</span>
      <CoarSelect
        :options="options"
        :model-value="null"
        placeholder="Choose a city"
        appearance="inline"
      />
      <CoarSelect :options="options" model-value="vie" appearance="inline" />
      <CoarSelect :options="options" model-value="vie" appearance="inline" clearable />
    </div>
  </section>
</template>
