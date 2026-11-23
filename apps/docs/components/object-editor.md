---
description: 'CoarObjectEditor edits a JSON object driven by a JSON Schema; CoarSchemaEditor describes that schema. Built-in value types plus types of the app.'
devices: { desktop: ready, tablet: partial, phone: planned }
devicesNote: "Built for pointer and keyboard. On tablets the rows work but are dense; a phone layout is planned."
---

# Object Editor <Badge type="warning" text="Preview" />

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

<preview path="./object-editor/demos/ObjectEditorProduct.vue" />

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

<preview path="./object-editor/demos/ObjectEditorCustomType.vue" />

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

<preview path="./object-editor/demos/SchemaAndObjectEditor.vue" />

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

The component exposes `issues`: every problem of the value, as `{ pointer, keyword, message? }`.

### CoarSchemaEditor props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `JsonSchema` | — | The schema; each change emits a new object |
| `types` | `CoarObjectEditorTypes` | built-in types | The types to choose from |

### Functions

| Function | Description |
|----------|-------------|
| `defineObjectEditorTypes(types?)` | The built-in types plus the given ones |
| `validateValue(schema, value)` | The problems of a value, each at its JSON Pointer |
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
| `coar.schemaEditor.*` | Labels of the schema editor (`key`, `title`, `type`, `required`, `addProperty` …) and its problems (`invalidKey`, `keyTaken`, `rangeOrder`, `noOptions`, `emptyOption`, `duplicateOption`) |
