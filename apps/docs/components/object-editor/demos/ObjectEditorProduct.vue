<template>
  <div class="demo">
    <CoarSegmentedControl v-model="mode" :options="modes" aria-label="Mode" />
    <CoarObjectEditor v-model="product" :schema="productSchema" :mode="mode" locale="en-US" />
    <details>
      <summary>JSON</summary>
      <pre>{{ JSON.stringify(product, null, 2) }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl } from '@cocoar/vue-ui';
import { CoarObjectEditor } from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';
import { createProduct, productSchema } from './product-schema';

const product = ref(createProduct());
const mode = ref<'view' | 'edit'>('edit');
const modes = [
  { value: 'view', label: 'View' },
  { value: 'edit', label: 'Edit' },
];
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
pre {
  font-size: 12px;
}
</style>
