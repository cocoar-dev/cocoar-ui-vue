<!-- Generated from apps/docs/components/object-editor.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Object Editor (Preview)

**Devices:** desktop ready · tablet partial · phone planned — Built for pointer and keyboard. On tablets the rows work but are dense; a phone layout is planned.

`@cocoar/vue-object-editor` edits JSON objects through a **JSON Schema** (Draft 2020-12). The schema says what a
value means — a string can be a date, an email address or a colour — and the editor shows each value with a fitting
inline control. Users never see JSON; the app gets plain JSON back.

```sh
pnpm add @cocoar/vue-object-editor
```

```ts
import { CoarObjectEditor } from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';
```

## Basic usage

Bind the object with `v-model` and pass its schema. `mode="view"` shows the formatted values; `mode="edit"` shows
the controls. Both use the same rows, so switching moves nothing.

**Demo — `object-editor/demos/ObjectEditorProduct.vue`**

```vue
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
```

What the editor does with the data:

- **A cleared value removes its key.** "Required" means the key is there and not empty.
- **Problems appear in their row**, found by the schema (`minimum`, `format`, `required` …) and by the checks
  of the value types.
- **Values the schema does not know stay in the data**, shown read-only as "not in the schema".
- **Lists of objects** are shown read-only with their number of entries and kept unchanged.

## The schema

The schema is standard JSON Schema; anything that validates JSON Schema can check the data too. A few
`x-coar-*` keywords add what JSON Schema has no word for:

| Keyword | Where | Meaning |
|---------|-------|---------|
| `x-coar-type` | property | Id of the value type. Without it the type is recognized from the schema (`format: "date"` → date) |
| `x-coar-order` | object | Order of its properties. Key order alone does not survive every database |
| `x-coar-unit` | number | Unit after the value, such as `cm` |
| `x-coar-decimals` | number | Decimal places; 0 for `integer`, 2 for `number` without it |
| `x-coar-options` | choice | Name of an option source the app passes in `optionSources` |
| `x-coar-suggestions` | tags | Suggested tags |

A **choice** is `oneOf` of `{ const, title }`; several choices are an `array` with `uniqueItems` and
`items.anyOf` of `{ const, title }`. A plain `enum` is read too.

```json
{
  "category": {
    "title": "Category",
    "oneOf": [
      { "const": "lighting", "title": "Lighting" },
      { "const": "furniture", "title": "Furniture" }
    ]
  }
}
```

## Built-in value types

| Id | Data | Control |
|----|------|---------|
| `text` | `string` | Inline text input |
| `multiline` | `string` | One-line preview, a text area once clicked |
| `number` | `number` / `integer` | Inline number input with unit |
| `boolean` | `boolean` | Switch |
| `date` | `string`, `format: "date"` | Inline date picker |
| `email` | `string`, `format: "email"` | Inline text input |
| `color` | `string`, `pattern` `#RRGGBB` | Inline text input with a swatch |
| `choice` | `oneOf` of constants | Inline select |
| `choices` | `array` of constants | Tag select |
| `tags` | `array` of `string` | Tag select that creates tags |
| `object` | `object` | The rows of its properties, collapsible |

## Types of the app and option sources

An app adds its own value types with `defineObjectEditorTypes()`. A type names the schema of its data and,
optionally, a control and a check. In the schema it is a `$ref` into `$defs`, so the schema stays valid on its
own. Without a control, a type whose data is an object is edited as nested rows.

Options that come from the app, such as people from an API, are named in the schema with `x-coar-options`; the
app passes the list, or a function that returns one, in `optionSources`.

**Demo — `object-editor/demos/ObjectEditorCustomType.vue`**

```vue
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
```

```ts
const money: CoarValueType<Money> = {
  id: 'money',                    // x-coar-type and key in $defs
  label: 'Amount of money',       // name in the type list of the schema editor
  icon: 'hash',
  schema: { type: 'object', properties: { amount: { type: 'number' }, currency: { enum: ['EUR', 'USD'] } } },
  control: markRaw(MoneyControl), // receives CoarValueControlProps, emits update:modelValue
  format: (value, { locale }) => new Intl.NumberFormat(locale, { style: 'currency', currency: value.currency }).format(value.amount),
  validate: (value) => (value.currency ? null : 'Choose a currency.'),
};
const types = defineObjectEditorTypes([money]);
```

A control receives `modelValue`, the resolved `schema`, `id`, `label`, `readonly`, `error`, `options` and
`locale`, and emits `update:modelValue`; `undefined` clears the value.

## API

### CoarObjectEditor props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `JsonObject \| undefined` | — | The object |
| `schema` | `JsonSchema` | — | Its JSON Schema |
| `types` | `CoarObjectEditorTypes` | built-in types | From `defineObjectEditorTypes()` |
| `optionSources` | `Record<string, Option[] \| () => Option[] \| Promise<Option[]>>` | `{}` | Options named by `x-coar-options` |
| `mode` | `'view' \| 'edit'` | `'edit'` | Formatted values or controls |
| `locale` | `string` | browser | Locale of numbers and dates |

The component exposes `issues`: every problem of the value, as `{ pointer, keyword, message? }`.

### Functions

| Function | Description |
|----------|-------------|
| `defineObjectEditorTypes(types?)` | The built-in types plus the given ones |
| `validateValue(schema, value)` | The problems of a value, each at its JSON Pointer |
| `createObjectSchema()` | An empty object schema |
| `getAt`, `setAt`, `parsePointer`, `formatPointer` | Read and write values by JSON Pointer, without changing the original |

Validation uses [`@cfworker/json-schema`](https://github.com/cfworker/cfworker/tree/main/packages/json-schema): it
interprets the schema and never generates code, so a Content Security Policy without `'unsafe-eval'` works.

## i18n Keys

| Key | Default |
|-----|---------|
| `coar.objectEditor.required` | `Required.` |
| `coar.objectEditor.minimum` / `maximum` | `At least {min}.` / `At most {max}.` |
| `coar.objectEditor.minLength` / `maxLength` | `At least {min} characters.` / `At most {max} characters.` |
| `coar.objectEditor.formatDate` / `formatEmail` / `format` | `Not a valid date.` / `Not a valid email address.` / `Wrong format.` |
| `coar.objectEditor.type` | `Wrong kind of value.` |
| `coar.objectEditor.notAllowed` | `Not one of the allowed values.` |
| `coar.objectEditor.unique` | `Each value may appear only once.` |
| `coar.objectEditor.additional` | `Contains values the schema does not allow.` |
| `coar.objectEditor.invalid` | `Invalid value.` |
| `coar.objectEditor.notInSchema` | `not in the schema` |
| `coar.objectEditor.noProperties` | `The schema has no properties yet.` |
| `coar.objectEditor.yes` / `no` | `Yes` / `No` |
| `coar.objectEditor.filled` | `{count} filled` |
| `coar.objectEditor.entry` / `entries` | `1 entry` / `{count} entries` |
