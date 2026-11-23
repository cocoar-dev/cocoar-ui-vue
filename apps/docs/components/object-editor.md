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

## Values and absence <Badge type="warning" text="Changed" /> {#values-and-absence}

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
[Migrating the Object Editor values](/guide/migration-object-editor-values).

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

<preview path="./object-editor/demos/ObjectEditorInherited.vue" />

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
  the schema does not describe.

A missing required key is still reported where `validateSchema` is `false`: it is a check of the parent object.

<preview path="./object-editor/demos/ObjectEditorSecret.vue" />

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
| `date-time` | `string`, `format: "date-time"` | Inline date-time picker; stored as ISO 8601 with offset |
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
