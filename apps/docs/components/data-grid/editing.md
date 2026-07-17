---
description: "CoarDataGrid in-cell editing — editable() with per-row predicates, custom Vue editors via cellEditorConfig, and onCellValueChanged for committed edits."
---

# Editing

In-cell editing is exposed through three builder methods that map directly onto AG Grid's editor lifecycle:

| Method | Level | Purpose |
|--------|-------|---------|
| `column.editable(value)` | column | Enable editing — `boolean` or `(row) => boolean` predicate |
| `column.cellEditorConfig(component, config)` | column | Plug in a custom Vue editor component (mirrors `cellRendererConfig`) |
| `gridBuilder.onCellValueChanged(handler)` | grid | React to a committed cell edit |

`editable()` and `cellEditorConfig()` are **orthogonal** — set both, otherwise the editor never opens. If you only set `editable(true)`, the cell uses AG Grid's built-in text editor.

## Default Editor

`.editable(true)` enables the default text editor. Editing starts on **double-click** (or pressing Enter / F2 with a cell focused). Enter commits, Escape cancels.

A row predicate gates editing per-row — locked items in the demo below skip the editor entirely:

```ts
(col) => col.field('name').editable(row => !row.locked)
```

`onCellValueChanged` fires once per committed edit and surfaces both the previous and new value. The demo updates a status line below the grid:

<preview path="./demos/GridEditing.vue" />

```ts
CoarGridBuilder.create<Person>()
  .columns([
    (col) => col.field('name').editable(row => !row.locked),
    (col) => col.number('amount').editable(row => !row.locked),
  ])
  .rowDataRef(data)
  .onCellValueChanged((event) => {
    saveField(event.data, event.colDef.field, event.newValue);
  });
```

## Custom Cell Editor

`cellEditorConfig(component, config)` accepts any Vue component and wraps your `config` object under `params.config` — the exact same convention as `cellRendererConfig`.

The component must follow AG Grid's [editor contract](https://www.ag-grid.com/vue-data-grid/component-cell-editor/): receive a single `params` prop and expose a `getValue()` method via `defineExpose`. Cocoar does not ship editor wrappers — building them is consumer territory, since the appropriate input control (text, select, autocomplete, date picker, custom widget) is application-specific.

<preview path="./demos/GridEditingCustom.vue" />

The minimal `SelectCellEditor.vue` used above:

```vue
<template>
  <select ref="selectRef" v-model="value" style="width:100%;height:100%;">
    <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
  </select>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';

const props = defineProps<{
  params: ICellEditorParams<unknown, string> & { config: { options: string[] } };
}>();

const selectRef = ref<HTMLSelectElement | null>(null);
const value = ref(props.params.value ?? '');
const options = props.params.config.options;

onMounted(() => selectRef.value?.focus());

defineExpose({ getValue: () => value.value });
</script>
```

Wire it into a column:

```ts
(col) =>
  col.field('role')
    .editable(true)
    .cellEditorConfig(SelectCellEditor, {
      options: ['Engineer', 'Designer', 'Manager'],
    })
```

## Tips

**Single-click edit.** AG Grid's default is double-click. To enter edit on a single click, pass through the native option:

```ts
gridBuilder.option('singleClickEdit', true);
```

**Stop editing on focus loss.** Useful for forms where clicking outside should commit:

```ts
gridBuilder.stopEditingWhenCellsLoseFocus();
```

**Full-row editing.** Edit every cell in a row at once:

```ts
gridBuilder.fullRowEdit();
```

## API

### Column-level

| Method | Parameters | Description |
|--------|-----------|-------------|
| `.editable(value)` | `boolean \| (row: T) => boolean` | Enable editing statically or via row predicate. The predicate receives row data; rows without data (group rows etc.) return `false`. |
| `.cellEditorConfig(component, config)` | `Component, object` | Set custom cell editor. `config` is wrapped under `cellEditorParams.config`. |

### Grid-level

| Method | Parameters | Description |
|--------|-----------|-------------|
| `.onCellValueChanged(handler)` | `(event: CellValueChangedEvent<T>) => void` | Fires once per committed cell edit. `event.oldValue`, `event.newValue`, `event.data`, `event.colDef.field`. |
| `.fullRowEdit(value?)` | `boolean` | Enable full-row editing mode. |
| `.stopEditingWhenCellsLoseFocus(value?)` | `boolean` | Commit the edit when focus leaves the cell. |
