<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';

const variants = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;
const sizes = ['xs', 's', 'm', 'l', 'xl'] as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Variants × sizes</h2>
    <div class="vs-grid" style="--vs-columns: 1">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <div class="vs-row">
          <CoarBadge
            v-for="variant in variants"
            :key="variant"
            :size="size"
            :variant="variant"
            :content="7"
          />
        </div>
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Text, max, dot, bordered, pulse (reduced motion)</h2>
    <div class="vs-grid" style="--vs-columns: 1">
      <span class="vs-label">text</span>
      <div class="vs-row">
        <CoarBadge v-for="variant in variants" :key="variant" :variant="variant" content="New" />
      </div>
      <span class="vs-label">max 99</span>
      <div class="vs-row">
        <CoarBadge
          v-for="variant in variants"
          :key="variant"
          :variant="variant"
          :content="150"
          :max="99"
        />
      </div>
      <span class="vs-label">dot</span>
      <div class="vs-row">
        <CoarBadge v-for="variant in variants" :key="variant" :variant="variant" dot />
      </div>
      <span class="vs-label">bordered</span>
      <div class="vs-row">
        <CoarBadge
          v-for="variant in variants"
          :key="variant"
          :variant="variant"
          :content="3"
          bordered
        />
      </div>
      <span class="vs-label">pulse</span>
      <div class="vs-row">
        <CoarBadge
          v-for="variant in variants"
          :key="variant"
          :variant="variant"
          :content="1"
          pulse
        />
      </div>
    </div>
  </section>
</template>
