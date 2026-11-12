<script setup lang="ts">
import { CoarSwitch } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes: off, on, label before</h2>
    <div class="vs-grid">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarSwitch :size="size" label="Off" />
        <CoarSwitch :size="size" :model-value="true" label="On" />
        <CoarSwitch :size="size" :model-value="true" label="Before" label-position="before" />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States</h2>
    <div class="vs-grid">
      <span class="vs-label">disabled</span>
      <CoarSwitch disabled label="Off" />
      <CoarSwitch disabled :model-value="true" label="On" />
      <span />

      <span class="vs-label">readonly</span>
      <CoarSwitch readonly label="Off" />
      <CoarSwitch readonly :model-value="true" label="On" />
      <span />

      <span class="vs-label">error</span>
      <CoarSwitch error label="Off" />
      <CoarSwitch error :model-value="true" label="On" />
      <CoarSwitch :model-value="true" aria-label="Without label" />
    </div>
  </section>
</template>
