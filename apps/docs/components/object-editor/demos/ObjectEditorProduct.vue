<template>
  <div class="demo">
    <div class="toolbar">
      <CoarSegmentedControl v-model="mode" :options="modes" aria-label="Mode" />
      <CoarSwitch v-model="striped" size="s" label="Striped" />
      <CoarTextInput v-model="search" size="s" placeholder="Search properties…" aria-label="Search properties" clearable />
    </div>
    <CoarObjectEditor
      v-model="product"
      v-model:search="search"
      :schema="productSchema"
      :mode="mode"
      :striped="striped"
      locale="en-US"
    />
    <details>
      <summary>JSON</summary>
      <pre>{{ JSON.stringify(product, null, 2) }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, CoarSwitch, CoarTextInput } from '@cocoar/vue-ui';
import { CoarObjectEditor } from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';
import { createProduct, productSchema } from './product-schema';

const product = ref(createProduct());
const mode = ref<'view' | 'edit'>('edit');
const striped = ref(false);
const search = ref('');
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
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
}
pre {
  font-size: 12px;
}
</style>
