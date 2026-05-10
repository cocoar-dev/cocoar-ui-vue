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

<preview path="./demos/GridCheckbox.vue" />

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

<preview path="./demos/GridCheckboxStates.vue" />

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
