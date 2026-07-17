---
description: "CoarDataGrid multi-value columns — col.multiSelect() and col.tagSelect() edit array cells via CoarMultiSelect or CoarTagSelect, with chips display, search, and allowCreate."
---

# Multi-Select & Tag-Select Columns <Badge type="tip" text="New in 2.0" />

Two column shortcuts for multi-value cells. Both store the cell value as `T[]` and share the same renderer — they differ only in the editor surface and which configurator options are available.

| | Editor | When to use |
|--|--|--|
| **`col.multiSelect()`** | `<CoarMultiSelect>` — standard trigger, dropdown shows all options with checkboxes | Curated option lists where the user picks N of M known values. Supports search, "Select all". |
| **`col.tagSelect()`** | `<CoarTagSelect>` — trigger renders selected values as removable chips inline; dropdown shows only not-yet-selected options | When the visual identity of selected values matters at-a-glance, or when you want `.allowCreate()` to let users add free-form values. |

```ts
import { CoarGridBuilder } from '@cocoar/vue-data-grid';

CoarGridBuilder.create<Person>().columns([
  (col) => col.field('name').flex(1),

  (col) => col.multiSelect('tags', s => s.options(TAGS).searchable().showSelectAll())
              .editable(true),

  (col) => col.tagSelect('skills', s => s.options(SKILLS).allowCreate().display('chips'))
              .editable(true),
])
```

## Edit-mode flow

| Action | Result |
|--------|--------|
| Double-click cell (or Enter / F2) | Opens the editor and **auto-opens the dropdown** via `afterGuiAttached` |
| Toggle a checkbox (multiSelect) / pick an option (tagSelect) | Updates the editor's working array. Dropdown stays open. |
| Click outside the dropdown / Tab / Enter | Commits — AG Grid pulls the final array via `getValue()` |
| Escape | Cancels (no commit) |

Unlike `col.select()` (which auto-commits on every pick because the single-value edit is *one* click), multi-value editors deliberately keep the dropdown open so the user can complete the selection. Focus-preservation prevents AG Grid's `stopEditingWhenCellsLoseFocus` from committing the array prematurely when the user clicks options in the body-teleported dropdown.

## Rendering

Both columns default to a comma-separated label list. Switch to chips via the configurator:

```ts
col.multiSelect('tags', s => s.options(TAGS).display('chips'))
col.tagSelect('skills', s => s.options(SKILLS).display('chips'))
```

The shared renderer (`CoarMultiSelectCellRenderer`) looks up labels from `options` — values that aren't in the option list (only possible via `col.tagSelect().allowCreate()`) fall back to `String(value)`.

## Example

<preview path="./demos/GridMultiSelect.vue" />

## Row-aware options

Pass a function for per-row option lists — both renderer (label lookup) and editor (dropdown) call it with the current row:

```ts
col.multiSelect('perms', s => s.options(row => permsFor(row.role)))
   .editable(true)
```

## API

### `col.multiSelect(field, configurator)`

Cell value type: `T[]`.

| Configurator method | Type | Description |
|---|---|---|
| `.options(value)` | `CoarSelectOption<T>[] \| (row) => CoarSelectOption<T>[]` | **Required.** Static array or per-row function. |
| `.clearable(value?)` | `boolean = true` | Show a clear button in the editor |
| `.searchable(value?)` | `boolean = true` | Enable search/filter in the dropdown |
| `.showSelectAll(value?)` | `boolean = true` | Show a "Select all" row at the top of the dropdown |
| `.placeholder(value)` | `string` | Placeholder shown when no values are selected |
| `.searchPlaceholder(value)` | `string` | Search-input placeholder (used with `.searchable()`) |
| `.size(value)` | `'xs' \| 's' \| 'm' \| 'l'` | Trigger size (default: `'s'`) |
| `.display(value)` | `'text' \| 'chips'` | Renderer display mode (default: `'text'`) |

### `col.tagSelect(field, configurator)`

Cell value type: `T[]`. The cell renderer is shared with `col.multiSelect()`; only the editor differs.

| Configurator method | Type | Description |
|---|---|---|
| `.options(value)` | `CoarSelectOption<T>[] \| (row) => CoarSelectOption<T>[]` | **Required.** Static array or per-row function. |
| `.placeholder(value)` | `string` | Placeholder shown when no values are selected |
| `.searchPlaceholder(value)` | `string` | Search-input placeholder |
| `.size(value)` | `'xs' \| 's' \| 'm' \| 'l'` | Trigger size (default: `'s'`) |
| `.allowCreate(value?)` | `boolean = true` | Let the user type free-form values not in `options` |
| `.display(value)` | `'text' \| 'chips'` | Renderer display mode (default: `'text'`) |

`CoarSelectOption<T>` is `{ value: T, label: string, disabled?: boolean, group?: string, icon?: string }`.

## Layered overrides

Same escape-hatches as the other column shortcuts — chain `.cellEditorConfig(...)` or `.cellRendererConfig(...)` after the factory call to swap in custom components while keeping the rest of the column setup.

```ts
col.multiSelect('tags', s => s.options(TAGS))
   .editable(true)
   .cellEditorConfig(MyCustomMultiEditor, { /* ... */ })
```
