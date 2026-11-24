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
the controls. Both use the same rows, so switching moves nothing. `striped` puts every second row on a light
background; a theme can do that for every editor (see [Theming](#theming)).

**Demo — `object-editor/demos/ObjectEditorProduct.vue`**

```vue
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
```

What the editor does with the data:

- **A value is there when its key is.** `null`, `""`, `[]` and `{}` are values; only **Remove** in the
  row's menu deletes a key (see [Values and absence](#values-and-absence)).
- **Problems appear in their row**, found by the schema (`minimum`, `format`, `required` …) and by the checks
  of the value types. A problem of a part without its own row names that part (`mode: Required.`); one that
  belongs to no row is listed above the rows.
- **A definition that contains itself** (`$ref` to an enclosing definition) starts closed and opens one level
  per click.
- **Values the schema does not know stay in the data**, shown read-only as "not in the schema".
- **Lists and maps** of single values get a row per entry, see [Lists and maps](#lists-and-maps). **Lists of
  groups** (arrays of objects) are shown read-only with their number of entries and kept unchanged.
- **Search** (`v-model:search`) finds rows by title, key or path, see [Search](#search).

## Values and absence (Changed) {#values-and-absence}

The editor stores exactly what is set, the way JSON Schema reads it:

| State | Shown as | In the JSON |
|-------|----------|-------------|
| not set | `–` | no key |
| `null` | `null` | `"x": null` |
| empty | `""`, `[]`, `{}` | `"x": ""` … |

- An emptied text is `""`, an emptied tag list `[]`. The row's menu (⋯) has **Remove value**, which deletes the
  key, and **Set to null** where the schema allows `null` (`type: ["boolean", "null"]`, an `anyOf` with
  `{ "type": "null" }`, or `null` in `enum`). `false` and `0` are always values.
- A field that cannot show "no value" — an emptied number, date or choice — writes `null` when the schema allows
  it. Otherwise nothing is written: the row asks for a value, and leaving the field restores the old one.
- `required` is met by the key, also with `null`.
- Rows below a group that is `null` are locked: editing them would replace that `null` with an object. The
  group's menu has **Fill in this group**, which writes `{}`.

Forms that want "empty means missing" pass `presence="filled"`: emptying a value then removes its key, and an
empty value fails `required`. This was the behaviour before; see
[Migrating the Object Editor values](../guide/migration-object-editor-values.md).

## Lists and maps {#lists-and-maps}

An **ordered list** (`type: "array"` with single-value `items`) and a **map** (`type: "object"` with a schema in
`additionalProperties`) show one row per entry, with the control of the entry's type. The product above has both:
`highlights` and `prices`.

- A list keeps its order and duplicates; `false` and `0` are values. The list's menu adds an item; an item's menu
  moves, inserts below and removes it. **Alt+↑** / **Alt+↓** move the focused item.
- A map's keys are edited in place. A key that exists already is refused and marked at the key; the map's menu
  adds an entry.
- A problem of an entry appears in its row (`/prices/AT`).
- An inherited list or map is copied into the document when one of its entries changes: the copy replaces it.

Strings that must be unique are `tags` (`uniqueItems: true`); strings in order are a `list`.

## Search {#search}

`v-model:search` filters the rows by title, key or path (`dimensions.width`), also below closed groups, and keeps
the groups that lead to a match. Clearing it brings back the groups as they were. Values are never searched, so a
secret cannot match. It works together with `view="local"`.

`focus(pointer)` (on the component's ref) opens the groups of a row, scrolls to it and focuses its control — for
links from search results or from the app's own messages.

## Inherited values {#inherited-values}

A layered configuration edits one layer and shows what the layers below give. `base` holds those values,
read-only: a row without a local key shows the base value, softer and marked with where it comes from. Editing
writes the local document; **Reset to inherited** in the menu removes the local key again, and a group the reset
leaves empty goes with it. `view="local"` shows only
the keys the document sets — also `false`, `0`, `null` and empty values — with the groups that lead to them.
Switching views never changes the document.

**Demo — `object-editor/demos/ObjectEditorInherited.vue`**

```vue
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
```

```vue
<CoarObjectEditor
  v-model="layer"
  :schema="schema"
  :base="inherited"
  :origin="(pointer) => ({ label: sourceOf(pointer) })"
  :view="onlyLocal ? 'local' : 'all'"
/>
```

The editor looks up a value per path: the local one, else the base one. A group inherits the keys it does not set;
a local list or map replaces the inherited one as a whole, also when it is empty, and **Reset to inherited** on the
list or map brings the inherited entries back. It does not merge — how layers combine is the app's rule. `origin` names the source of an inherited value; `conflict: true` shows "differs by context"
instead of a value that would look authoritative. To check the effective document, turn `validate` off and pass
the app's own `issues`: missing local keys are then no error, and the problems still appear in their rows.

## Sensitive values {#sensitive-values}

Secrets stay with the app: its control writes them, its type decides how they look. Three hooks keep them out of
everything else:

- **`resolveType`** chooses a type from a marker the schema already has, without changing the stored schema:
  `({ schema }) => schema['x-cocoar-secret'] ? 'secret' : undefined`.
- **`sensitive: true`** on the type: its value appears only through the type's own `format` or `view`, never
  as generic text. **`validateSchema: false`**: the stored form (an encrypted envelope) differs from the logical
  schema (`type: "string"`), so the schema's checks are skipped at this value.
- **`redact(pointer, value)`** masks any other value as dots, read-only and without a control, also unknown keys
  the schema does not describe. It is asked for every value inside a row's value too: a redacted value deep in an
  unknown object or a list masks the whole row.

A missing required key is still reported where `validateSchema` is `false`: it is a check of the parent object.

**Demo — `object-editor/demos/ObjectEditorSecret.vue`**

```vue
<template>
  <div class="demo">
    <CoarObjectEditor
      v-model="settings"
      :schema="schema"
      :types="types"
      :resolve-type="resolveType"
      :redact="isEnvelope"
      locale="en-US"
    />
    <pre>{{ JSON.stringify(settings, null, 2) }}</pre>
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
  type JsonValue,
} from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';
import SecretControl from './SecretControl.vue';

// The app's secret type: its own control, shown as dots, stored as an envelope.
const secret: CoarValueType = {
  id: 'secret',
  label: 'Secret',
  icon: 'lock',
  hue: 0,
  schema: { type: 'string' },
  sensitive: true,
  validateSchema: false,
  control: markRaw(SecretControl),
  format: () => '••••••',
};
const types = defineObjectEditorTypes([secret]);

// The schema keeps its own marker; the editor picks the type from it.
const schema: JsonSchema = {
  type: 'object',
  properties: {
    user: { type: 'string', title: 'User' },
    password: { type: 'string', title: 'Password', 'x-cocoar-secret': true },
  },
};
const resolveType = ({ schema: property }: { schema: JsonSchema }) => (property['x-cocoar-secret'] ? 'secret' : undefined);
const isEnvelope = (_pointer: string, value: JsonValue) => typeof value === 'object' && value !== null && '$enc' in value;

const settings = ref<JsonObject | undefined>({
  user: 'service',
  password: { $enc: 'demo', data: 'c2VjcmV0' },
  legacyToken: { $enc: 'demo', data: 'b2xk' },
});
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

## Values outside the schema (Preview) {#values-outside-the-schema}

A value the schema does not describe stays in the document and has a row of its own, marked "not in the schema"
and read-only. `editUnknown(pointer, value)` lets the user edit such a value as JSON where the app returns `true`,
for a legacy field or one only newer clients know. It is asked for each existing value; it never adds keys, and it
does not lift `additionalProperties: false`: validation still reports the key.

- The value changes only when the text is valid JSON and differs. Invalid text shows a message and leaves the
  document as it was; Esc restores the text.
- `null`, `""`, `[]` and `{}` are written as entered, also with `presence="filled"`.
- A value that `redact` masks, or that holds a masked value, is never editable.

**Demo — `object-editor/demos/ObjectEditorUnknown.vue`**

```vue
<template>
  <div class="demo">
    <CoarObjectEditor v-model="settings" :schema="schema" :edit-unknown="editUnknown" locale="en-US" />
    <pre class="json">{{ JSON.stringify(settings, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarObjectEditor, type JsonObject, type JsonSchema, type JsonValue } from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    DatabaseSettings: {
      type: 'object',
      title: 'Database',
      properties: { Host: { type: 'string', title: 'Host' }, Port: { type: 'integer', title: 'Port' } },
    },
  },
};

// A legacy field and one only newer clients know: neither is in the schema.
const settings = ref<JsonObject | undefined>({
  DatabaseSettings: { Host: 'db.internal', Port: 5432, UnknownLegacy: { Keep: 1 } },
  FeatureFlags: ['beta-search'],
});

// The app decides per value. Here: everything except the legacy field.
const editUnknown = (pointer: string, _value: JsonValue) => pointer !== '/DatabaseSettings/UnknownLegacy';
</script>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
}
.json {
  margin: 0;
  font-size: 12px;
}
</style>
```

## The schema

The schema is standard JSON Schema; anything that validates JSON Schema can check the data too. A few
`x-coar-*` keywords add what JSON Schema has no word for:

| Keyword | Where | Meaning |
|---------|-------|---------|
| `x-coar-type` | property | Id of the value type. Without it the type is recognized from the schema (`format: "date"` → date) |
| `x-coar-order` | object | Order of its properties. Key order alone does not survive every database |
| `x-coar-unit` | number | Unit after the value, such as `cm` |
| `x-coar-decimals` | number | Fixed decimal places, for a known use such as money. Without it a `number` keeps every digit; an `integer` has none |
| `x-coar-options` | choice | Name of an option source the app passes in `optionSources` |
| `x-coar-suggestions` | tags | Suggested tags |

A **number** is stored as entered, within JavaScript number precision, and leaving a field unchanged never rewrites
it. Entry accepts the decimal separator of `locale` or a point, so `12,3456` and `12.3456` are the same value in
German. Thousands separators are not accepted: in English `12,3456` is refused with a message instead of becoming
`123456`, and so is an entry with more decimals than `x-coar-decimals` allows.

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
| `date-time` | `string`, `format: "date-time"` | Inline date-time picker with seconds (milliseconds for a value that has them), shown in the browser's zone; a change keeps the value's own offset (`Z` stays `Z`), and a value nobody changed stays as written |
| `email` | `string`, `format: "email"` | Inline text input |
| `color` | `string`, `pattern` `#RRGGBB` | Inline text input with a swatch |
| `choice` | `oneOf` of constants | Inline select |
| `choices` | `array` of constants | Tag select |
| `tags` | `array` of unique `string` | Tag select that creates tags |
| `list` | `array` of single values, in order | A row per item |
| `map` | `object` with `additionalProperties` | A row per key |
| `group-list` | `array` of objects | Read-only, number of entries |
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

## Schema editor

`CoarSchemaEditor` describes the object: add properties, choose their type, mark them required, set limits, units
and the allowed values of a choice. Groups hold properties of their own. It writes the same JSON Schema the object
editor reads, so both can work on one schema side by side. Types of the app appear in its type list; their schema
goes to `$defs` once a property uses them, and leaves again with the last one.

**Demo — `object-editor/demos/SchemaAndObjectEditor.vue`**

```vue
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
```

```vue
<CoarSchemaEditor v-model="schema" :types="types" />
<CoarObjectEditor v-model="data" :schema="schema" :types="types" />
```

Every change emits a new schema object; the one passed in is never changed. Keys are letters, digits, `_` and
`-`, starting with a letter; renaming a property keeps its place and whether it is required. Problems the JSON
Schema itself cannot express — a minimum above the maximum, a choice without values, a value twice — are marked in
the list and explained in the inspector; `checkSchema(schema)` returns them for code.

The same operations exist as functions: `addProperty`, `removeProperty`, `renameProperty`, `moveProperty`,
`changePropertyType`, `updateProperty`, `setRequired` and `setOptions` take a schema and a path of keys
(`['dimensions', 'width']`) and return the new schema.

### Profiles of the app

An app whose backend accepts only part of JSON Schema passes a `profile`:

```vue
<CoarSchemaEditor
  v-model="schema"
  :profile="{
    types: ['text', 'number', 'boolean', 'choice', 'list', 'map'], // offered types
    choiceEncoding: 'enum',                       // choices as a plain enum, without texts
    diagnostics: (schema) => backendProblems(schema), // [{ path: ['retries'], message: '…' }]
  }"
/>
```

The schema editor changes only what is edited: `$defs`, annotations (`$comment`, `x-…` of other tools) and
references stay as imported. A property with keywords it cannot edit (`allOf`, `if`, `patternProperties` …) shows
them and offers only key, title and description. A type change that would drop keywords names them and waits for
a confirmation. **Allows null** writes `type: [t, "null"]`, and keeps an existing `anyOf` with `{ "type": "null" }`.

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
| `striped` | `boolean` | `false` | Every second row on a light background, for this editor (see [Theming](#theming)) |
| `presence` | `'key' \| 'filled'` | `'key'` | When a value counts as there, see [Values and absence](#values-and-absence) |
| `base` | `JsonObject` | — | Read-only values where the document has no key, see [Inherited values](#inherited-values) |
| `origin` | `(pointer) => { label, title?, conflict? }` | — | Where an inherited value comes from |
| `view` | `'all' \| 'local'` | `'all'` | `local`: only keys the document sets, with their groups |
| `validate` | `boolean` | `true` | `false`: no built-in validation |
| `issues` | `ObjectEditorIssue[]` | `[]` | Problems the app found, shown in their rows |
| `resolveType` | `({ schema, pointer, typeId }) => string \| undefined` | — | Chooses the type of a property, see [Sensitive values](#sensitive-values) |
| `redact` | `(pointer, value) => boolean` | — | Masks a value as dots |
| `editUnknown` (Preview) | `(pointer, value) => boolean` | — | Edits a value the schema does not describe as JSON, see [Values outside the schema](#values-outside-the-schema) |
| `v-model:search` | `string` | `''` | Filters rows by title, key or path, see [Search](#search) |

The component exposes `issues` (every problem of the value, as `{ pointer, keyword, message? }`) and
`focus(pointer)`.

### CoarSchemaEditor props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `JsonSchema` | — | The schema; each change emits a new object |
| `types` | `CoarObjectEditorTypes` | built-in types | The types to choose from |
| `profile` | `{ types?, choiceEncoding?, diagnostics? }` | — | What can be authored, see [Profiles of the app](#profiles-of-the-app) |

### Functions

| Function | Description |
|----------|-------------|
| `defineObjectEditorTypes(types?)` | The built-in types plus the given ones |
| `validateValue(schema, value, { presence? })` | The problems of a value, each at its JSON Pointer |
| `allowsNull(schema)`, `nonNullSchema(root, schema)` | Whether a schema allows `null`; the schema without its `null` alternative |
| `createObjectSchema()` | An empty object schema |
| `checkSchema(schema)` | Bad keys, ranges and option lists, each at its path |
| `getAt`, `setAt`, `parsePointer`, `formatPointer` | Read and write values by JSON Pointer, without changing the original |

Validation uses [`@cfworker/json-schema`](https://github.com/cfworker/cfworker/tree/main/packages/json-schema): it
interprets the schema and never generates code, so a Content Security Policy without `'unsafe-eval'` works.

## Theming

The rows sit on the background of the page. To give every second row a background in every object editor of an
app, set its token in the theme or style preset; the `striped` prop sets the same token for one editor.

| Token | Default | Description |
|-------|---------|-------------|
| `--coar-object-editor-row-stripe` | `transparent` | Background of every second row |

```css
:root {
  --coar-object-editor-row-stripe: var(--coar-background-neutral-secondary);
}
```

## i18n Keys

| Key | Default |
|-----|---------|
| `coar.objectEditor.required` | `Required.` |
| `coar.objectEditor.minimum` / `maximum` | `At least {min}.` / `At most {max}.` |
| `coar.objectEditor.minLength` / `maxLength` | `At least {min} characters.` / `At most {max} characters.` |
| `coar.objectEditor.formatDate` / `formatEmail` / `format` | `Not a valid date.` / `Not a valid email address.` / `Wrong format.` |
| `coar.objectEditor.type` | `Wrong kind of value.` |
| `coar.objectEditor.invalidJson` | `Not valid JSON: the value is unchanged. Esc restores it.` |
| `coar.objectEditor.invalidDate` | `Not a date: the value is unchanged. Esc restores it.` |
| `coar.objectEditor.invalidDateTime` | `Not a date and time: the value is unchanged. Esc restores it.` |
| `coar.objectEditor.invalidNumber` | `Enter a number with one decimal separator, without thousands separators.` |
| `coar.objectEditor.invalidNumberScale` | `Enter a number with at most {count} decimal places, without thousands separators.` |
| `coar.objectEditor.notAllowed` | `Not one of the allowed values.` |
| `coar.objectEditor.unique` | `Each value may appear only once.` |
| `coar.objectEditor.additional` | `Contains values the schema does not allow.` |
| `coar.objectEditor.invalid` | `Invalid value.` |
| `coar.objectEditor.notInSchema` | `not in the schema` |
| `coar.objectEditor.noProperties` | `The schema has no properties yet.` |
| `coar.objectEditor.yes` / `no` | `Yes` / `No` |
| `coar.objectEditor.filled` | `{count} filled` |
| `coar.objectEditor.entry` / `entries` | `1 entry` / `{count} entries` |
| `coar.objectEditor.type.<id>` | The `label` of the type |
| `coar.objectEditor.remove` / `reset` / `setNull` | `Remove value` / `Reset to inherited` / `Set to null` |
| `coar.objectEditor.actions` | `Actions for {title}` |
| `coar.objectEditor.needsValue` | `Enter a value, or remove it from the menu.` |
| `coar.objectEditor.lockedByNull` | `{group} is null: fill it in from its menu to edit this value` |
| `coar.objectEditor.fillGroup` | `Fill in this group` |
| `coar.objectEditor.inherited` / `conflict` | `inherited` / `differs by context` |
| `coar.objectEditor.literalHint` | `This value is set; Remove deletes it.` |
| `coar.objectEditor.noLocalValues` | `No values are set here.` |
| `coar.objectEditor.noMatches` | `No property matches the search.` |
| `coar.objectEditor.item` / `items` | `1 item` / `{count} items` |
| `coar.objectEditor.addItem` / `addEntry` / `insertBelow` / `moveUp` / `moveDown` / `removeEntry` | `Add item` / `Add entry` / `Insert below` / `Move up` / `Move down` / `Remove` |
| `coar.objectEditor.mapKey` / `keyEmpty` / `keyTaken` | `Key` / `A key cannot be empty.` / `This key exists already.` |
| `coar.schemaEditor.*` | Labels of the schema editor (`key`, `title`, `type`, `required`, `addProperty` …) and its problems (`invalidKey`, `keyTaken`, `rangeOrder`, `noOptions`, `emptyOption`, `duplicateOption`), and `allowsNull`, `itemType`, `valueType`, `unsupported`, `typeDrops`, `changeType` |
