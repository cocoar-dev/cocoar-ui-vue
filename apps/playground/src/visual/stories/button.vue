<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
const variants = ['primary', 'secondary', 'tertiary', 'danger', 'ghost'] as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Variants × sizes</h2>
    <div class="vs-grid" style="--vs-columns: 1">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <div class="vs-row">
          <CoarButton v-for="variant in variants" :key="variant" :size="size" :variant="variant">
            {{ variant }}
          </CoarButton>
        </div>
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Disabled</h2>
    <div class="vs-grid" style="--vs-columns: 1">
      <span class="vs-label">m</span>
      <div class="vs-row">
        <CoarButton v-for="variant in variants" :key="variant" :variant="variant" disabled>
          {{ variant }}
        </CoarButton>
      </div>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Icons, loading, link</h2>
    <div class="vs-grid" style="--vs-columns: 1">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <div class="vs-row">
          <CoarButton :size="size" icon-start="plus">Add</CoarButton>
          <CoarButton :size="size" variant="secondary" icon-end="chevron-right">Next</CoarButton>
          <CoarButton :size="size" icon-start="plus" aria-label="Add" />
          <CoarButton :size="size" variant="ghost" icon-start="trash-2" aria-label="Delete" />
          <CoarButton :size="size" loading>Loading</CoarButton>
          <CoarButton :size="size" variant="tertiary" to="/">Link</CoarButton>
        </div>
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Full width</h2>
    <div class="vs-stack" style="align-items: stretch">
      <CoarButton full-width>Full width</CoarButton>
      <CoarButton full-width variant="secondary" icon-start="plus">Full width with icon</CoarButton>
    </div>
  </section>
</template>
