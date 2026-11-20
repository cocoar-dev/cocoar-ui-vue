<template>
  <div class="demo">
    <CoarTabGroup v-model="tab">
      <CoarTab id="schema">
        Schema
        <template #content>
          <CoarSchemaEditor v-model="schema" :types="types" class="pane" />
        </template>
      </CoarTab>
      <CoarTab id="data">
        Data
        <template #content>
          <CoarObjectEditor v-model="data" :schema="schema" :types="types" locale="en-US" class="pane" />
        </template>
      </CoarTab>
      <CoarTab id="json">
        JSON
        <template #content>
          <div class="json">
            <pre>{{ JSON.stringify(schema, null, 2) }}</pre>
            <pre>{{ JSON.stringify(data, null, 2) }}</pre>
          </div>
        </template>
      </CoarTab>
    </CoarTabGroup>
  </div>
</template>

<script setup lang="ts">
import { markRaw, ref, shallowRef } from 'vue';
import { CoarTab, CoarTabGroup } from '@cocoar/vue-ui';
import {
  CoarObjectEditor,
  CoarSchemaEditor,
  createObjectSchema,
  defineObjectEditorTypes,
  type CoarValueType,
  type JsonObject,
  type JsonSchema,
} from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';
import MoneyControl from './MoneyControl.vue';
import type { Money } from './money';

// The type of the app appears in the type list of the schema editor next to the built-in ones.
const money: CoarValueType<Money> = {
  id: 'money',
  label: 'Amount of money',
  icon: 'hash',
  hue: 165,
  schema: {
    type: 'object',
    required: ['amount', 'currency'],
    properties: { amount: { type: 'number' }, currency: { enum: ['EUR', 'USD', 'CHF'] } },
  },
  control: markRaw(MoneyControl),
};
const types = defineObjectEditorTypes([money]);

const tab = ref('schema');
const schema = shallowRef<JsonSchema>({
  ...createObjectSchema(),
  required: ['title'],
  'x-coar-order': ['title', 'budget', 'start'],
  properties: {
    title: { type: 'string', title: 'Title', 'x-coar-type': 'text' },
    budget: { $ref: '#/$defs/money', title: 'Budget', 'x-coar-type': 'money' },
    start: { type: 'string', format: 'date', title: 'Start', 'x-coar-type': 'date' },
  },
  $defs: { money: money.schema },
});
const data = shallowRef<JsonObject | undefined>({ title: 'Spring campaign' });
</script>

<style scoped>
.demo {
  width: 100%;
}
.pane {
  padding-top: 12px;
}
.json {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
pre {
  font-size: 12px;
  overflow: auto;
  max-height: 420px;
}
</style>
