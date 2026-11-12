<script setup lang="ts">
import { CoarNumberInput } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes: placeholder, value, steppers + clearable</h2>
    <div class="vs-grid">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarNumberInput :size="size" placeholder="0" />
        <CoarNumberInput :size="size" :model-value="42" />
        <CoarNumberInput :size="size" :model-value="42" stepper-buttons="both" clearable />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Clearable, empty: plain, with steppers</h2>
    <div class="vs-grid" style="--vs-columns: 2">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarNumberInput :size="size" placeholder="Empty" clearable />
        <CoarNumberInput :size="size" placeholder="Empty" stepper-buttons="both" clearable />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Steppers and format</h2>
    <div class="vs-grid">
      <span class="vs-label">steppers</span>
      <CoarNumberInput :model-value="1" stepper-buttons="increment" />
      <CoarNumberInput :model-value="1" stepper-buttons="decrement" />
      <CoarNumberInput :model-value="1" stepper-buttons="both" />

      <span class="vs-label">0 ≤ v ≤ 10</span>
      <CoarNumberInput :model-value="0" :min="0" :max="10" stepper-buttons="both" />
      <CoarNumberInput :model-value="10" :min="0" :max="10" stepper-buttons="both" />
      <CoarNumberInput :model-value="5" :min="0" :max="10" stepper-buttons="both" />

      <span class="vs-label">format</span>
      <CoarNumberInput :model-value="1234.5" :decimals="2" locale="en-US" />
      <CoarNumberInput :model-value="1234.5" :decimals="2" locale="de-DE" />
      <CoarNumberInput :model-value="9.99" :decimals="2" prefix="€" suffix="net" clearable />
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States</h2>
    <div class="vs-grid">
      <span class="vs-label">disabled</span>
      <CoarNumberInput placeholder="0" disabled />
      <CoarNumberInput :model-value="42" disabled />
      <CoarNumberInput :model-value="42" disabled stepper-buttons="both" clearable />

      <span class="vs-label">readonly</span>
      <CoarNumberInput placeholder="0" readonly />
      <CoarNumberInput :model-value="42" readonly />
      <CoarNumberInput :model-value="42" readonly stepper-buttons="both" clearable />

      <span class="vs-label">error</span>
      <CoarNumberInput placeholder="0" error />
      <CoarNumberInput :model-value="420" error />
      <CoarNumberInput :model-value="420" error stepper-buttons="both" clearable />
    </div>
  </section>
</template>
