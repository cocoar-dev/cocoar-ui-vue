# Number Column

`col.number(field, …)` is locale-aware in both display and editing. Two forms — pick by need:

| Form | Effect |
|------|--------|
| `col.number('amount')` or `col.number('amount', { decimals: 2 })` | **Renderer only** — locale-formatted number, no editor (legacy / display-only) |
| `col.number('amount', n => n.decimals(2).min(0).max(100))` | **Renderer + editor** — same formatting plus `CoarNumberCellEditor` for in-cell editing |

The callback form bundles `CoarNumberCellEditor` automatically. Adding `.editable(true)` on the outer chain enables it.

## Example

<preview path="./demos/GridNumber.vue" />

```ts
CoarGridBuilder.create<Item>().columns([
  (col) => col.field('product').flex(1),
  (col) =>
    col
      .number('qty', n => n.min(0).max(9999).step(1).stepperButtons('both'))
      .editable(true),
  (col) =>
    col
      .number('price', n => n.decimals(2).min(0).step(0.01))
      .editable(true),
])
.stopEditingWhenCellsLoseFocus()
.onCellValueChanged(event => save(event.data, event.colDef.field, event.newValue));
```

The renderer uses `useL10n().fmtNumber()` so the display reactively follows the active locale (try the locale switcher in the docs nav). The editor uses Maskito for locale-aware parsing — `1.234,56` in `de-AT` and `1,234.56` in `en-US` both yield the same numeric value.

## Edit-mode flow

| Action | Result |
|--------|--------|
| Double-click cell (or Enter / F2) | Opens `CoarNumberCellEditor` with focus, existing value selected |
| Type a digit / `.` / `,` / `-` on a focused cell | Opens editor seeded with that key |
| Tab | Commits + moves to the next editable cell |
| Enter | Commits + stays |
| Escape | Cancels |

## Layered overrides

```ts
// Override editor (e.g. add custom validation)
col.number('qty', n => n.min(0)).editable(true).cellEditorConfig(MyOwnEditor, { ... })

// Override editable per-row
col.number('qty', n => n.min(0)).editable(row => !row.archived)
```

## API

### `col.number(field, configOrCallback?)`

**Config-object form** (legacy — renderer only):

| Property | Type | Description |
|----------|------|-------------|
| `decimals` | `number` | Number of decimal places |

**Callback form** (renderer + editor — `NumberColumnConfigurator`):

| Method | Type | Renderer / Editor | Description |
|--------|------|-------------------|-------------|
| `.decimals(value)` | `number` | both | Decimal places |
| `.min(value)` | `number` | editor | Minimum allowed value |
| `.max(value)` | `number` | editor | Maximum allowed value |
| `.step(value)` | `number` | editor | Step increment for arrows / stepper |
| `.stepperButtons(value)` | `'none' \| 'increment' \| 'decrement' \| 'both'` | editor | Stepper button mode |
| `.placeholder(value)` | `string` | editor | Placeholder text |
| `.size(value)` | `'xs' \| 's' \| 'm' \| 'l'` | editor | Input size (default: `'s'`) |

Editor commits via `getValue()` returning a `number | null`. Combine with `gridBuilder.stopEditingWhenCellsLoseFocus()` so clicking outside also commits.
