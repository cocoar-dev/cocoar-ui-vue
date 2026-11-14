<script setup lang="ts">
// The `size` scale of buttons and single-line inputs under coar-mobile: each size keeps its own,
// taller height (xs 44, s 48, m 52, l 56 px) instead of collapsing to one minimum.
import { ref } from 'vue';
import { CoarButton, CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
const text = ref<Record<(typeof sizes)[number], string | undefined>>({
  xs: 'xs',
  s: 's',
  m: 'm',
  l: 'l',
});
</script>

<template>
  <p class="controls-demo__intro">
    Each size keeps a height of its own: xs 44, s 48, m 52 and l 56 px, with at least 16 px text.
  </p>

  <section v-for="size in sizes" :key="size" class="controls-demo__size">
    <h2 class="controls-demo__title">
      <code>size="{{ size }}"</code>
    </h2>
    <CoarFormField label="Text input">
      <CoarTextInput v-model="text[size]" :size="size" clearable />
    </CoarFormField>
    <div class="controls-demo__buttons">
      <CoarButton :size="size">Primary</CoarButton>
      <CoarButton :size="size" variant="secondary">Secondary</CoarButton>
      <CoarButton :size="size" variant="ghost" icon-start="chevron-left" aria-label="Back" />
    </div>
  </section>
</template>

<style scoped>
.controls-demo__intro {
  margin: 0 0 var(--coar-spacing-l);
  color: var(--coar-text-neutral-secondary);
}

.controls-demo__size {
  display: grid;
  gap: var(--coar-spacing-s);
}

.controls-demo__size + .controls-demo__size {
  margin-top: var(--coar-spacing-l);
}

.controls-demo__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.controls-demo__buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--coar-spacing-s);
}
</style>
