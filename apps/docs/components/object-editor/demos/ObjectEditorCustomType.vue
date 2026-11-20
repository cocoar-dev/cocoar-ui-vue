<template>
  <div class="demo">
    <CoarObjectEditor
      v-model="offer"
      :schema="schema"
      :types="types"
      :option-sources="{ people }"
      locale="en-US"
    />
    <pre>{{ JSON.stringify(offer, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { markRaw, ref } from 'vue';
import {
  CoarObjectEditor,
  defineObjectEditorTypes,
  type CoarValueType,
  type JsonObject,
  type JsonSchema,
} from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';
import MoneyControl from './MoneyControl.vue';
import type { Money } from './money';

// A type of the app: its data is an object, its control one field with the currency in the suffix.
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
  format: (value, { locale }) =>
    value.amount === undefined
      ? '–'
      : new Intl.NumberFormat(locale, { style: 'currency', currency: value.currency ?? 'EUR' }).format(value.amount),
  validate: (value) => (value.amount !== undefined && !value.currency ? 'Choose a currency.' : null),
};
const types = defineObjectEditorTypes([money]);

// The schema names the source; the app gives its options, here after a short delay.
const people = () =>
  new Promise<{ value: string; label: string; description: string }[]>((resolve) =>
    setTimeout(
      () =>
        resolve([
          { value: 'u1', label: 'Anna Berger', description: 'Product management' },
          { value: 'u2', label: 'Lukas Huber', description: 'Design' },
          { value: 'u3', label: 'Sophie Wagner', description: 'Purchasing' },
        ]),
      300,
    ),
  );

const schema: JsonSchema = {
  type: 'object',
  required: ['price'],
  properties: {
    price: { $ref: '#/$defs/money', title: 'Price', 'x-coar-type': 'money' },
    owner: { type: 'string', title: 'Owner', 'x-coar-type': 'choice', 'x-coar-options': 'people' },
  },
  $defs: { money: money.schema },
};

const offer = ref<JsonObject | undefined>({ price: { amount: 129.9, currency: 'EUR' }, owner: 'u2' });
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
