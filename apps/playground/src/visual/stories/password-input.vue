<script setup lang="ts">
import { CoarPasswordInput } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes: placeholder, value, clearable</h2>
    <div class="vs-grid">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarPasswordInput :size="size" placeholder="Password" />
        <CoarPasswordInput :size="size" model-value="Secret123" />
        <CoarPasswordInput :size="size" model-value="Secret123" clearable />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Clearable, empty: plain, error</h2>
    <div class="vs-grid" style="--vs-columns: 2">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarPasswordInput :size="size" placeholder="Empty" clearable />
        <CoarPasswordInput :size="size" placeholder="Empty" clearable error />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States</h2>
    <div class="vs-grid">
      <span class="vs-label">disabled</span>
      <CoarPasswordInput placeholder="Password" disabled />
      <CoarPasswordInput model-value="Secret123" disabled />
      <CoarPasswordInput model-value="Secret123" disabled clearable />

      <span class="vs-label">readonly</span>
      <CoarPasswordInput placeholder="Password" readonly />
      <CoarPasswordInput model-value="Secret123" readonly />
      <CoarPasswordInput model-value="Secret123" readonly clearable />

      <span class="vs-label">error</span>
      <CoarPasswordInput placeholder="Password" error />
      <CoarPasswordInput model-value="Secret123" error />
      <CoarPasswordInput model-value="Secret123" error clearable />
    </div>
  </section>
</template>
