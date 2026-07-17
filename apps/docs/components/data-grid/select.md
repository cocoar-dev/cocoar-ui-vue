---
description: "CoarDataGrid select column — col.select() renders the matched option label and edits via CoarSelect with auto-commit on pick, clearable, searchable, and row-aware options."
---

# Select Column

`col.select(field, configurator)` declares a select column whose renderer shows the **label** of the matched option and whose editor is `<CoarSelect>` — same visual language as forms, with the dropdown teleported to `<body>` so it can overflow the cell freely.

```ts
import { CoarGridBuilder } from '@cocoar/vue-data-grid';

const ROLES = [
  { value: 'eng', label: 'Engineer' },
  { value: 'des', label: 'Designer' },
  { value: 'mgr', label: 'Manager' },
];

CoarGridBuilder.create<Person>().columns([
  (col) => col.field('name').flex(1),
  (col) => col.select('role', s => s.options(ROLES)).editable(true),
])
```

The configurator's `options` is required — there's no useful "select column without options".

## Edit-mode flow

| Action | Result |
|--------|--------|
| Double-click cell (or Enter / F2) | Opens `CoarSelectCellEditor` and **auto-opens the dropdown** via `afterGuiAttached` |
| Click an option (or Enter on highlighted) | Auto-commits + exits edit mode in one step |
| Up / Down | Highlight previous / next option |
| Type a character (when `searchable: true`) | Filters the option list |
| Escape | Closes dropdown; pressing again cancels edit |

The auto-commit is intentional — for a select, picking an option **is** the edit. Tab-through-edit-mode still works on the surrounding cells; the select cell just commits faster than free-form text would.

## Example

<preview path="./demos/GridSelect.vue" />

```ts
CoarGridBuilder.create<Person>().columns([
  (col) => col.field('name').flex(1),

  // simple
  (col) => col.select('role', s => s.options(ROLES)).editable(true),

  // clearable + per-row gating (archived rows are read-only)
  (col) =>
    col.select('status', s => s.options(STATUSES).clearable())
       .editable(row => row.status !== 'archived'),

  // searchable for long lists
  (col) =>
    col.select('country', s => s.options(COUNTRIES).searchable())
       .editable(true),
])
.stopEditingWhenCellsLoseFocus();
```

## Row-aware options

Pass a function instead of a static array to compute options per row:

```ts
col.select('parent', s =>
  s.options(row => allowedParents(row.type))
).editable(true)
```

Both renderer (label lookup) and editor (dropdown options) call the function with the current row, so display and edit stay consistent.

## Layered overrides

```ts
// Replace the editor entirely (drops the configurator)
col.select('role', s => s.options(ROLES))
   .editable(true)
   .cellEditorConfig(MyCustomSelect, { … })

// Keep the bundled renderer + editor, override editable
col.select('role', s => s.options(ROLES)).editable(false)
```

## API

### `col.select(field, configurator)`

| Configurator method | Type | Description |
|--------|------|-------------|
| `.options(value)` | `CoarSelectOption<T>[] \| (row) => CoarSelectOption<T>[]` | **Required.** Static array or per-row function. |
| `.clearable(value?)` | `boolean = true` | Show a clear button in the editor |
| `.searchable(value?)` | `boolean = true` | Enable search/filter in the dropdown |
| `.placeholder(value)` | `string` | Placeholder shown when no value is selected |
| `.searchPlaceholder(value)` | `string` | Search-input placeholder (used with `.searchable()`) |
| `.size(value)` | `'xs' \| 's' \| 'm' \| 'l'` | Trigger size (default: `'s'`) |

`CoarSelectOption<T>` is `{ value: T, label: string, disabled?: boolean, group?: string, icon?: string }`.

Editor commits via `getValue()` returning the option `value`. The dropdown panel is teleported to `<body>` (Coar overlay-host) so it can extend past the cell / grid boundaries without clipping.
