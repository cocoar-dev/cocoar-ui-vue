<!-- Generated from apps/docs/components/data-grid/multi-select.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Multi-Select & Tag-Select Columns (New in 2.0)

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

**Demo — `data-grid/demos/GridMultiSelect.vue`**

```vue
<template>
  <div>
    <div style="height: 380px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click <code>tags</code> for a checkbox-list dropdown (multi-select). Double-click <code>skills</code> for a chip-style trigger (tag-select). Both cells store <code>T[]</code>; commit happens on click-outside / Tab / Enter.
    </div>
    <div
      v-if="lastChange"
      style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--coar-surface-neutral-subtle); font-size: 13px;"
    >
      Last change: <strong>{{ lastChange.row }}</strong> —
      <code>{{ lastChange.field }}</code> →
      <strong>{{ lastChange.newValue }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Person {
  id: number;
  name: string;
  tags: string[];
  skills: string[];
}

const TAGS = [
  { value: 'priority', label: 'Priority' },
  { value: 'remote',   label: 'Remote' },
  { value: 'onsite',   label: 'Onsite' },
  { value: 'lead',     label: 'Lead' },
  { value: 'intern',   label: 'Intern' },
];

const SKILLS = [
  { value: 'ts',  label: 'TypeScript' },
  { value: 'vue', label: 'Vue' },
  { value: 'go',  label: 'Go' },
  { value: 'sql', label: 'SQL' },
  { value: 'k8s', label: 'Kubernetes' },
];

const data = ref<Person[]>([
  { id: 1, name: 'Alice Johnson',  tags: ['priority', 'remote'], skills: ['ts', 'vue'] },
  { id: 2, name: 'Bob Smith',      tags: ['onsite'],             skills: ['go', 'sql'] },
  { id: 3, name: 'Carol Williams', tags: ['lead', 'priority'],   skills: ['ts', 'k8s'] },
  { id: 4, name: 'David Brown',    tags: [],                     skills: ['vue'] },
]);

const lastChange = shallowRef<{ row: string; field: string; newValue: string } | null>(null);

const builder = CoarGridBuilder.create<Person>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),

    // col.multiSelect — checkbox-list dropdown, chips renderer
    (col) =>
      col
        .multiSelect('tags', (s) =>
          s.options(TAGS).searchable().showSelectAll().display('chips'),
        )
        .header('Tags (multiSelect)')
        .width(260)
        .editable(true),

    // col.tagSelect — chip-style trigger, allow-create, text renderer (default)
    (col) =>
      col
        .tagSelect('skills', (s) => s.options(SKILLS).allowCreate())
        .header('Skills (tagSelect)')
        .width(260)
        .editable(true),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus()
  .onCellValueChanged((event) => {
    if (!event.data || !event.colDef.field) return;
    const next = event.newValue;
    lastChange.value = {
      row: event.data.name,
      field: event.colDef.field,
      newValue: Array.isArray(next) ? `[${next.join(', ')}]` : String(next),
    };
  });
</script>
```

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
