<!-- Generated from apps/docs/components/data-grid/number.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Number Column

`col.number(field, …)` is locale-aware in both display and editing. Two forms — pick by need:

| Form | Effect |
|------|--------|
| `col.number('amount')` or `col.number('amount', { decimals: 2 })` | **Renderer only** — locale-formatted number, no editor (legacy / display-only) |
| `col.number('amount', n => n.decimals(2).min(0).max(100))` | **Renderer + editor** — same formatting plus `CoarNumberCellEditor` for in-cell editing |

The callback form bundles `CoarNumberCellEditor` automatically. Adding `.editable(true)` on the outer chain enables it.

## Example

**Demo — `data-grid/demos/GridNumber.vue`**

```vue
<template>
  <div>
    <div style="height: 320px;">
      <CoarDataGrid :builder="builder" />
    </div>
    <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
      Double-click any quantity or price cell. Locale-aware parsing — try <code>1.234,56</code> in German or <code>1,234.56</code> in English.
    </div>
    <div
      v-if="lastChange"
      style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--coar-surface-neutral-subtle); font-size: 13px;"
    >
      Last change: <strong>{{ lastChange.field }}</strong> on
      <strong>{{ lastChange.row }}</strong> →
      <code>{{ lastChange.newValue }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Item {
  id: number;
  product: string;
  qty: number;
  price: number;
}

const data = ref<Item[]>([
  { id: 1, product: 'Widget A', qty: 12, price: 49.95 },
  { id: 2, product: 'Widget B', qty: 0,  price: 19.50 },
  { id: 3, product: 'Widget C', qty: 5,  price: 199.00 },
  { id: 4, product: 'Widget D', qty: 28, price: 7.25 },
]);

const lastChange = shallowRef<{ row: string; field: string; newValue: number } | null>(null);

const builder = CoarGridBuilder.create<Item>()
  .columns([
    (col) => col.field('product').header('Product').flex(1),
    (col) =>
      col
        .number('qty', (n) => n.decimals(0).min(0).max(9999).step(1).stepperButtons('both').size('s'))
        .header('Qty')
        .width(140)
        .editable(true),
    (col) =>
      col
        .number('price', (n) => n.decimals(2).min(0).step(0.01))
        .header('Price')
        .width(140)
        .editable(true),
  ])
  .rowDataRef(data)
  .stopEditingWhenCellsLoseFocus()
  .onCellValueChanged((event) => {
    if (!event.data || !event.colDef.field) return;
    lastChange.value = {
      row: event.data.product,
      field: event.colDef.field,
      newValue: event.newValue,
    };
  });
</script>
```

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
