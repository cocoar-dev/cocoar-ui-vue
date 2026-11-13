<script setup lang="ts">
import { CoarCheckbox } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes: unchecked, checked, indeterminate, label before</h2>
    <div class="vs-grid" style="--vs-columns: 4">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarCheckbox :size="size" label="Unchecked" />
        <CoarCheckbox :size="size" :model-value="true" label="Checked" />
        <CoarCheckbox :size="size" indeterminate label="Indeterminate" />
        <CoarCheckbox :size="size" :model-value="true" label="Before" label-position="before" />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States</h2>
    <div class="vs-grid" style="--vs-columns: 4">
      <span class="vs-label">disabled</span>
      <CoarCheckbox disabled label="Unchecked" />
      <CoarCheckbox disabled :model-value="true" label="Checked" />
      <CoarCheckbox disabled indeterminate label="Indeterminate" />
      <span />

      <span class="vs-label">readonly</span>
      <CoarCheckbox readonly label="Unchecked" />
      <CoarCheckbox readonly :model-value="true" label="Checked" />
      <span />
      <span />

      <span class="vs-label">error</span>
      <CoarCheckbox error label="Unchecked" />
      <CoarCheckbox error :model-value="true" label="Checked" />
      <span />
      <span />

      <span class="vs-label">other</span>
      <CoarCheckbox required label="Required" />
      <CoarCheckbox :model-value="true" aria-label="Without label" />
      <span />
      <span />
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Long label</h2>
    <div style="max-width: 280px">
      <CoarCheckbox
        :model-value="true"
        label="I accept the terms and conditions, the privacy policy and the processing of my data"
      />
    </div>
  </section>
</template>
