<script setup lang="ts">
import { CoarTag } from '@cocoar/vue-ui';

const variants = ['neutral', 'success', 'warning', 'error', 'info', 'accent'] as const;
const sizes = ['s', 'm', 'l'] as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Variants × sizes</h2>
    <div class="vs-grid" style="--vs-columns: 1">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <div class="vs-row">
          <CoarTag v-for="variant in variants" :key="variant" :size="size" :variant="variant">{{
            variant
          }}</CoarTag>
        </div>
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Closable, elevated, borderless</h2>
    <div class="vs-grid" style="--vs-columns: 1">
      <span class="vs-label">closable</span>
      <div class="vs-row">
        <CoarTag v-for="variant in variants" :key="variant" :variant="variant" closable>{{
          variant
        }}</CoarTag>
      </div>
      <span class="vs-label">elevated</span>
      <div class="vs-row">
        <CoarTag v-for="variant in variants" :key="variant" :variant="variant" elevated>{{
          variant
        }}</CoarTag>
      </div>
      <span class="vs-label">borderless</span>
      <div class="vs-row">
        <CoarTag v-for="variant in variants" :key="variant" :variant="variant" borderless>{{
          variant
        }}</CoarTag>
      </div>
    </div>
  </section>
</template>
