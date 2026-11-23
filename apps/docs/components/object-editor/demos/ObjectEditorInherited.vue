<template>
  <div class="demo">
    <div class="toolbar">
      <CoarSegmentedControl v-model="view" :options="views" aria-label="Rows" />
    </div>
    <CoarObjectEditor
      v-model="layer"
      :schema="schema"
      :base="product"
      :origin="origin"
      :view="view"
      :validate="false"
      locale="en-US"
    />
    <div class="json">
      <div>
        <strong>Inherited (product)</strong>
        <pre>{{ JSON.stringify(product, null, 2) }}</pre>
      </div>
      <div>
        <strong>This layer (customer)</strong>
        <pre>{{ JSON.stringify(layer, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl } from '@cocoar/vue-ui';
import { CoarObjectEditor, type JsonObject, type JsonSchema } from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';

const schema: JsonSchema = {
  type: 'object',
  'x-coar-order': ['enabled', 'retries', 'region', 'proxy'],
  properties: {
    enabled: { type: ['boolean', 'null'], title: 'Enabled' },
    retries: { type: 'integer', title: 'Retries', minimum: 0 },
    region: { title: 'Region', enum: ['eu', 'us', 'asia'] },
    proxy: {
      type: ['object', 'null'],
      title: 'Proxy',
      properties: { host: { type: 'string', title: 'Host' }, port: { type: 'integer', title: 'Port' } },
    },
  },
};

// What the product layer gives. The app owns how layers combine; the editor only shows it.
const product: JsonObject = { enabled: true, retries: 3, region: 'eu', proxy: { host: 'proxy.example', port: 8080 } };
const layer = ref<JsonObject | undefined>({ retries: 0, proxy: { port: 3128 } });

const origin = () => ({ label: 'product', title: 'Inherited from the product defaults' });
const view = ref<'all' | 'local'>('all');
const views = [
  { value: 'all', label: 'All properties' },
  { value: 'local', label: 'Only this layer' },
];
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.json {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
pre {
  font-size: 12px;
}
</style>
