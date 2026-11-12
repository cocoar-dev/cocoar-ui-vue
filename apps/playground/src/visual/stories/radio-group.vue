<script setup lang="ts">
import { CoarRadioButton, CoarRadioGroup } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes, horizontal, second selected</h2>
    <div class="vs-grid" style="--vs-columns: 1">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarRadioGroup
          :name="`size-${size}`"
          :size="size"
          orientation="horizontal"
          model-value="b"
          :label="`Size ${size}`"
        >
          <CoarRadioButton value="a">First</CoarRadioButton>
          <CoarRadioButton value="b">Second</CoarRadioButton>
          <CoarRadioButton value="c">Third</CoarRadioButton>
        </CoarRadioGroup>
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Orientation and label position</h2>
    <div class="vs-grid">
      <span class="vs-label">vertical</span>
      <CoarRadioGroup name="vertical" model-value="a" label="Vertical">
        <CoarRadioButton value="a">First</CoarRadioButton>
        <CoarRadioButton value="b">Second</CoarRadioButton>
      </CoarRadioGroup>
      <CoarRadioGroup name="none" label="Nothing selected">
        <CoarRadioButton value="a">First</CoarRadioButton>
        <CoarRadioButton value="b">Second</CoarRadioButton>
      </CoarRadioGroup>
      <CoarRadioGroup name="before" model-value="a" label="Label before" label-position="before">
        <CoarRadioButton value="a">First</CoarRadioButton>
        <CoarRadioButton value="b">Second</CoarRadioButton>
      </CoarRadioGroup>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States</h2>
    <div class="vs-grid">
      <span class="vs-label">states</span>
      <CoarRadioGroup name="disabled" model-value="a" label="Disabled group" disabled>
        <CoarRadioButton value="a">First</CoarRadioButton>
        <CoarRadioButton value="b">Second</CoarRadioButton>
      </CoarRadioGroup>
      <CoarRadioGroup name="one-disabled" model-value="a" label="One option disabled">
        <CoarRadioButton value="a">First</CoarRadioButton>
        <CoarRadioButton value="b" disabled>Second</CoarRadioButton>
      </CoarRadioGroup>
      <CoarRadioGroup name="error" model-value="a" label="Error" error required>
        <CoarRadioButton value="a">First</CoarRadioButton>
        <CoarRadioButton value="b">Second</CoarRadioButton>
      </CoarRadioGroup>
    </div>
  </section>
</template>
