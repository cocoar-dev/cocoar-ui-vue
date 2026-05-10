# Text Column

`col.text(field, configurator?)` declares a text column whose editor is `<CoarTextInput>` — same visual language as forms, fitted into the cell.

```ts
import { CoarGridBuilder } from '@cocoar/vue-data-grid';

CoarGridBuilder.create<Person>().columns([
  (col) => col.text('name').editable(true),
  (col) => col.text('email', t => t.placeholder('user@example.com').maxLength(120)).editable(true),
])
```

Read-only display uses AG Grid's default text rendering — same as plain `.field()`. The shortcut adds:
- A configurable `CoarTextCellEditor` that opens on double-click / Enter / F2
- `sortable: true` by default

## Edit-mode flow

| Action | Result |
|--------|--------|
| Double-click cell (or Enter / F2) | Opens `CoarTextCellEditor` with focus on the input, existing value selected |
| Type a printable key on a focused cell | Opens editor seeded with that key (replace mode) |
| Tab | Commits + moves focus to the next editable cell, opening its editor automatically |
| Enter | Commits + stays |
| Escape | Cancels |

Toggles fire `cellValueChanged` like any other commit, so a single grid-level handler covers all column types.

## Example

<preview path="./demos/GridText.vue" />

```ts
CoarGridBuilder.create<Person>().columns([
  (col) => col.text('name', t => t.placeholder('Name').maxLength(80)).editable(true),
  (col) => col.text('email', t => t.placeholder('user@example.com').maxLength(120)).editable(true),
  (col) => col.field('role'),                                  // not editable
])
.stopEditingWhenCellsLoseFocus()
.onCellValueChanged(event => save(event.data, event.colDef.field, event.newValue));
```

## Layered overrides

```ts
// Replace the editor (drops the configurator)
col.text('name').editable(true).cellEditorConfig(MyCustomEditor, { ... })

// Keep the bundled editor, override editable
col.text('name').editable(row => !row.locked)
```

## API

### `col.text(field, configurator?)`

| Configurator method | Type | Description |
|--------|------|-------------|
| `.placeholder(value)` | `string` | Placeholder shown when input is empty |
| `.maxLength(value)` | `number` | Max input length |
| `.size(value)` | `'xs' \| 's' \| 'm' \| 'l'` | Input size (default: `'s'`) |
| `.prefix(value)` | `string` | Text shown before the input value |
| `.suffix(value)` | `string` | Text shown after the input value |

Editor commits via `getValue()` per AG Grid's contract — Tab / Enter / Escape are handled by AG Grid's native edit-mode logic. Combine with `gridBuilder.stopEditingWhenCellsLoseFocus()` so clicking outside also commits.
