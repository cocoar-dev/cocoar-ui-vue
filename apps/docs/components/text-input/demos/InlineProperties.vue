<template>
  <div class="inline-properties">
    <div class="inline-properties__row">
      <span class="inline-properties__label">Name</span>
      <div><CoarTextInput v-model="name" appearance="inline" width="content" placeholder="–" /></div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">Price</span>
      <div>
        <CoarNumberInput v-model="price" appearance="inline" width="content" :decimals="2" suffix="EUR" />
      </div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">Category</span>
      <div>
        <CoarSelect v-model="category" :options="categories" appearance="inline" width="content" searchable />
      </div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">Available from</span>
      <div><CoarPlainDatePicker v-model="availableFrom" appearance="inline" width="content" /></div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">Stock</span>
      <div>
        <CoarNumberInput v-model="stock" appearance="inline" width="content" :min="0" stepper-buttons="both" />
      </div>
    </div>
    <div class="inline-properties__row">
      <span class="inline-properties__label">SKU</span>
      <div><CoarTextInput v-model="sku" appearance="inline" width="content" error /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarTextInput, CoarNumberInput, CoarSelect, CoarPlainDatePicker } from '@cocoar/vue-ui';

const name = ref('Cocoar Desk Lamp');
const price = ref<number | null>(49.9);
const category = ref<string | null>('lighting');
const categories = [
  { value: 'lighting', label: 'Lighting' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'office', label: 'Office supplies' },
  { value: 'decoration', label: 'Decoration' },
];
const availableFrom = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-12-01'));
const stock = ref<number | null>(12);
const sku = ref('LAMP 01');
</script>

<style scoped>
.inline-properties {
  display: grid;
  max-width: 520px;
}
.inline-properties__row {
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--coar-radius-s);
}
.inline-properties__label {
  color: var(--coar-text-neutral-secondary);
}
/* A row hover in the colour the fills must stand out from. */
.inline-properties__row:hover {
  background: var(--coar-background-neutral-secondary);
}
</style>
