<script setup lang="ts">
import { CoarTextInput } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes: placeholder, value, clearable</h2>
    <div class="vs-grid">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarTextInput :size="size" placeholder="Placeholder" />
        <CoarTextInput :size="size" model-value="Value" />
        <CoarTextInput :size="size" model-value="Clearable" clearable />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Clearable, empty: plain, error</h2>
    <div class="vs-grid" style="--vs-columns: 2">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarTextInput :size="size" placeholder="Empty" clearable />
        <CoarTextInput :size="size" placeholder="Empty" clearable error />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States</h2>
    <div class="vs-grid">
      <span class="vs-label">disabled</span>
      <CoarTextInput placeholder="Placeholder" disabled />
      <CoarTextInput model-value="Disabled" disabled />
      <CoarTextInput model-value="Disabled" disabled clearable />

      <span class="vs-label">readonly</span>
      <CoarTextInput placeholder="Placeholder" readonly />
      <CoarTextInput model-value="Readonly" readonly />
      <CoarTextInput model-value="Readonly" readonly clearable />

      <span class="vs-label">error</span>
      <CoarTextInput placeholder="Placeholder" error />
      <CoarTextInput model-value="Invalid" error />
      <CoarTextInput model-value="Invalid" error clearable />

      <span class="vs-label">affixes</span>
      <CoarTextInput prefix="https://" placeholder="example.com" />
      <CoarTextInput suffix="EUR" model-value="12.50" />
      <CoarTextInput prefix="@" suffix=".com" model-value="cocoar" clearable />
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Multiline (rows 3): placeholder, value + clearable, disabled</h2>
    <div class="vs-grid">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarTextInput :size="size" :rows="3" placeholder="Placeholder" />
        <CoarTextInput :size="size" :rows="3" model-value="First line&#10;Second line" clearable />
        <CoarTextInput :size="size" :rows="3" model-value="Disabled" disabled />
      </template>
    </div>
  </section>
</template>
