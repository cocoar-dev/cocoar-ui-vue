<!-- Generated from apps/docs/components/data-grid/checkbox.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Checkbox Column

`col.checkbox(field, configurator?)` renders a `<CoarCheckbox>` in each cell — same visual language as forms, just sized to fit the row. The renderer is **always read-only**; interactivity comes from edit-mode, exactly like text/number/select columns.

```ts
import { CoarGridBuilder } from '@cocoar/vue-data-grid';

CoarGridBuilder.create<Task>().columns([
  (col) => col.checkbox('done').editable(true),
  (col) => col.field('title').flex(1),
])
```

## Edit-mode flow

Without `.editable()` the checkbox is a read-only indicator. Adding `.editable(true)` (or a row-predicate) opts the column into AG Grid's standard edit-mode flow:

| Action | Result |
|--------|--------|
| Double-click cell (or Enter / F2) | Opens `CoarCheckboxCellEditor` — interactive `<CoarCheckbox>` with focus on the input |
| Space | Toggles the checkbox |
| Tab | Commits + moves focus to the next editable cell, **opening its editor automatically** |
| Enter | Commits + stays |
| Escape | Cancels |

The Tab-through-edit-mode pattern is AG Grid's native data-entry workflow — keyboard users can fly through editable cells without ever touching the mouse. Pair with `gridBuilder.stopEditingWhenCellsLoseFocus()` so clicking outside also commits.

Toggles fire `cellValueChanged` like any other editor commit, so a single `gridBuilder.onCellValueChanged()` handler covers all column types — checkbox, text, number, custom editors.

## Editable + per-row gating

Pass a row-predicate to `.editable()` to disable the editor for individual rows. Locked rows render a read-only checkbox and can't be entered.

**Demo — `data-grid/demos/GridCheckbox.vue`**

```vue
<template>
  <div>
    <div style="height: 320px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click any "done" cell to enter edit mode. <strong>Space</strong> toggles, <strong>Tab</strong> commits and moves to the next editable cell, <strong>Escape</strong> cancels. Locked rows can't be entered.
    </div>
    <div
      v-if="lastChange"
      style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--coar-surface-neutral-subtle); font-size: 13px;"
    >
      Last change: <strong>{{ lastChange.task }}</strong> —
      <code>done</code> →
      <strong>{{ lastChange.value ? 'true' : 'false' }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Task {
  id: number;
  task: string;
  done: boolean;
  locked: boolean;
}

const data = ref<Task[]>([
  { id: 1, task: 'Write specification',     done: true,  locked: false },
  { id: 2, task: 'Implement renderer',      done: false, locked: false },
  { id: 3, task: 'Ship to production',      done: false, locked: true  },
  { id: 4, task: 'Update changelog',        done: true,  locked: false },
  { id: 5, task: 'Archive (legacy)',        done: true,  locked: true  },
]);

const lastChange = shallowRef<{ task: string; value: boolean } | null>(null);

const builder = CoarGridBuilder.create<Task>()
  .columns([
    (col) => col.checkbox('done').width(70).editable((row) => !row.locked),
    (col) => col.field('task').header('Task').flex(1),
    (col) => col.checkbox('locked').width(90),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus()
  .onCellValueChanged((event) => {
    if (event.colDef.field !== 'done' || !event.data) return;
    lastChange.value = { task: event.data.task, value: event.newValue };
  });
</script>
```

```ts
CoarGridBuilder.create<Task>().columns([
  (col) => col.checkbox('done').editable(row => !row.locked),
  (col) => col.field('task').flex(1),
  (col) => col.checkbox('locked'),                              // read-only indicator
])
.stopEditingWhenCellsLoseFocus()
.onCellValueChanged((event) => {
  if (event.colDef.field === 'done') save(event.data);
});
```

## States — read-only, editable, indeterminate

Three independent states, all using the same `col.checkbox()` shortcut:

- **Read-only:** omit `.editable()` — checkbox is rendered, edit-mode never opens.
- **Editable:** add `.editable(true)` or `.editable(row => …)`.
- **Indeterminate (tri-state):** pass `c.indeterminate(row => …)` in the configurator. Useful for "partial" or "in-progress" states where the row's value isn't a clean true/false. The indeterminate state is shown in both renderer and editor.

**Demo — `data-grid/demos/GridCheckboxStates.vue`**

```vue
<template>
  <div style="height: 320px;">
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Feature {
  id: number;
  name: string;
  enabled: boolean;
  rolloutComplete: boolean;
  partial: boolean;
}

const data = ref<Feature[]>([
  { id: 1, name: 'Dark mode',       enabled: true,  rolloutComplete: true,  partial: false },
  { id: 2, name: 'Calendar view',   enabled: true,  rolloutComplete: false, partial: true  },
  { id: 3, name: 'Bulk export',     enabled: false, rolloutComplete: false, partial: false },
  { id: 4, name: 'Beta dashboard',  enabled: true,  rolloutComplete: false, partial: true  },
]);

const builder = CoarGridBuilder.create<Feature>()
  .columns([
    (col) => col.field('name').header('Feature').flex(1),
    // editable, no label
    (col) =>
      col
        .checkbox('enabled')
        .header('Enabled')
        .width(110)
        .editable(true),
    // editable + tri-state indeterminate when partial rollout
    (col) =>
      col
        .checkbox('rolloutComplete', (c) => c.indeterminate((row) => row.partial && !row.rolloutComplete))
        .header('Rollout')
        .width(110)
        .editable(true),
    // read-only indicator (no .editable())
    (col) =>
      col
        .checkbox('partial')
        .header('Partial')
        .width(110),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus();
</script>
```

```ts
col.checkbox('rolloutComplete', c => c
  .indeterminate(row => row.partial && !row.rolloutComplete)
).editable(true)
```

## Layered overrides

The shortcut bundles renderer + editor with the configurator's options. Subsequent calls on the chain override (last-write-wins):

```ts
// Replace the renderer entirely (drops the configurator)
col.checkbox('done').cellRenderer(MyOwnCheckbox)

// Replace just the editor (e.g. a select-style "yes/no/maybe" widget)
col.checkbox('done').editable(true).cellEditorConfig(MyTriStateEditor, { ... })

// Keep the bundled renderer + editor, override editable
col.checkbox('done').editable(false)
```

## API

### `col.checkbox(field, configurator?)`

| Configurator method | Type | Description |
|--------|------|-------------|
| `.label(value)` | `string \| (row) => string` | Optional label rendered next to the checkbox (in both renderer and editor) |
| `.indeterminate(predicate)` | `(row) => boolean` | Tri-state indicator per row |
| `.size(value)` | `'xs' \| 's' \| 'm' \| 'l'` | Checkbox size (default: `'s'`) |

The configurator config is passed identically to both `CoarCheckboxCellRenderer` and `CoarCheckboxCellEditor`, so display and edit look the same — only behavior changes.

Interactive state comes from the outer chain:

| Outer chain | Result |
|-------------|--------|
| no `.editable()` | Read-only — edit-mode never opens |
| `.editable(true)` | Edit-mode opens on double-click / Enter / F2 |
| `.editable(false)` | Read-only |
| `.editable(row => …)` | Per-row predicate — edit-mode opens only when `true` |

Commit behavior: the editor exposes `getValue()` per AG Grid's contract. Tab/Enter/Escape are handled by AG Grid's native edit-mode logic. Combine with `gridBuilder.stopEditingWhenCellsLoseFocus()` so clicking outside the editor also commits.
