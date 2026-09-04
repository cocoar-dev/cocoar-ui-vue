---
description: "CoarDualListbox — two-column transfer list with move buttons, per-column search, grouping, custom item renderers and drag & drop between columns"
---

# Dual Listbox

Two [`CoarListbox`](./listbox) columns side-by-side with move buttons — the classic pattern for moving items between "available" and "selected" sets. All the search, grouping, and custom-render features of `CoarListbox` carry over automatically.

```ts
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
```

## Basic

`v-model` holds the currently-selected values (right column). Everything else from `options` lives in the left column.

<preview path="./dual-listbox/demos/BasicDualListbox.vue" />

## Grouped

Group headings appear in both columns. Search and sorting apply per column.

<preview path="./dual-listbox/demos/GroupedDualListbox.vue" />

## Custom item components

Pass `itemComponents` and they're used on both sides. The component receives a `side` prop (`'available' | 'selected'`) so the same renderer can adapt per column if needed.

<preview path="./dual-listbox/demos/CustomComponentDualListbox.vue" />

## Inline remove button (right side)

A common pattern: render an × button inside each selected item, and clicking it moves the user back to the available column. Since the right column is just `options ∩ modelValue`, "moving back" is simply *dropping the id from v-model* — the item re-appears on the left automatically.

<preview path="./dual-listbox/demos/RemoveBackToAvailable.vue" />

The renderer uses the `side` prop to show the × only on the selected side; clicking it calls `api.remove()`, which bubbles up as `item-remove` with `side: 'selected'`, and the parent filters v-model:

```vue
<!-- UserCard.vue -->
<button v-if="side === 'selected'" @click.stop="api.remove()">×</button>
```

```vue
<!-- Parent -->
<CoarDualListbox v-model="selected" :options="..." @item-remove="onRemove" />

<script setup lang="ts">
function onRemove({ item, side }) {
  if (side !== 'selected') return
  selected.value = selected.value.filter(u => u.id !== item.value.id)
}
</script>
```

See [`CoarListboxItemApi`](./listbox#item-api-inline-actions) for the full api surface.

## Drag & drop

Set the `drag-drop` prop and items become draggable between the two columns. A unique drag group is wired up internally so the two sides exchange items with each other but not with unrelated listboxes on the page.

<preview path="./dual-listbox/demos/DragDropDualListbox.vue" />

Selection-aware: if the dragged item is part of a multi-highlight, the whole highlighted set moves at once.

For a standalone two-listbox setup (or three+ lists), see the same feature on [`CoarListbox`](./listbox#drag-drop-between-lists).

## Virtual scrolling (large datasets)

For directories with thousands of entries, enable `virtual` — only the rows in and around the viewport are rendered. Group headings scroll naturally in this mode (they are not sticky).

The demo below loads 10,000 synthetic principals (users, groups, service accounts) client-side. Scroll, search, highlight, drag, and the inline × all still work.

<preview path="./dual-listbox/demos/VirtualLargeList.vue" />

```vue
<CoarDualListbox
  v-model="assigned"
  :options="principals"
  virtual
  :item-height="44"
  :group-heading-height="28"
/>
```

- Set `item-height` to the pixel height of a row — must be fixed, but you can pick whatever matches your custom item component.
- `overscan` controls how many extra rows are rendered above/below the viewport (default 5). Raise it if you see blank flashes on fast scrolls.
- Virtual mode uses the [`useVirtualList`](./virtual-list) composable, which is also exported for your own components.

## Interaction

- **Click**: highlight a single item
- **Ctrl / ⌘ + Click**: add/remove from highlight
- **Shift + Click**: range select
- **Double-click / Enter**: move that single item across
- **→ / ← buttons**: move all currently-highlighted items
- **≫ / ≪ buttons**: move all currently-visible items (respects the column's search filter). Hide with `hideMoveAll`.

## Slots

Shared slots apply to both columns; side-specific slots override only one side.

| Slot | Applies to | Scope |
|------|------------|-------|
| `item` | both | `{ item, highlighted, selectable, side }` |
| `item-<kind>` | both | `{ item, highlighted, selectable, side }` |
| `group-heading` | both | `{ group, items }` |
| `header-available` | left | `{ label, count, total }` |
| `header-selected` | right | `{ label, count, total }` |
| `empty-available` | left | — |
| `empty-selected` | right | — |
| `actions` | center | `{ moveRight, moveLeft, moveAllRight, moveAllLeft, canMoveRight, canMoveLeft, canMoveAllRight, canMoveAllLeft }` |

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `T[]` | `[]` | Selected values (right column contents, in order) |
| `options` | `CoarListboxOption<T>[]` | `[]` | All items — split into columns by `modelValue` membership |
| `availableLabel` | `string` | `'Available'` | Left column header |
| `selectedLabel` | `string` | `'Selected'` | Right column header |
| `height` | `string` | *flex* | Fixed list height for both columns |
| `disabled` / `readonly` | `boolean` | `false` | Standard form states |
| `hideSearch` | `boolean` | `false` | Hide the search input in both columns |
| `searchPlaceholder` | `string` | `'Search…'` | Placeholder for both search inputs |
| `searchFields` / `searchBy` / `filterWith` | — | — | Search config, forwarded to both columns — see [Listbox docs](./listbox#flexible-search) |
| `sortGroups` / `sortOptions` / `hideGroupHeadings` | — | — | Grouping / sorting config, forwarded to both columns |
| `itemComponents` / `kindBy` | — | — | Custom rendering, forwarded to both columns |
| `compareWith` | `(a, b) => boolean` | `===` | Value equality |
| `hideMoveAll` | `boolean` | `false` | Hide the ≫ / ≪ buttons |
| `hideCounts` | `boolean` | `false` | Hide count badges in headers |
| `emptyAvailable` | `string` | `'No items'` | Empty state for left column |
| `emptySelected` | `string` | `'None selected'` | Empty state for right column |
| `sortSelectedBySource` | `boolean` | `false` | When `true`, the right column is re-sorted by the order of items in `options` after every move. Default keeps the order in which the user moved items across |
| `dragDrop` | `boolean` | `false` | Enable drag-and-drop between the two columns |
| `dragEngine` | `'native' \| 'pointer' \| 'auto'` | `'native'` | HTML5 drag events, or Pointer Events for touch — see [Drag & Drop → Engines](./drag-drop#engines) |
| `canDrag` | `(item) => boolean` | — | Per-item source permission, applied to both columns. See [Listbox docs](./listbox#per-item-validation) |
| `canDrop` | `(payload) => boolean` | — | Runtime drop validation, applied to both columns |
| `virtual` | `boolean` | `false` | Enable virtual scrolling — render only rows in/near the viewport |
| `itemHeight` | `number` | `32` | Row height in pixels (used only when `virtual` is on) |
| `groupHeadingHeight` | `number` | `28` | Heading height when `virtual` is on |
| `overscan` | `number` | `5` | Extra rows rendered above/below the viewport |

### Events

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | `T[]` | Selection changed |
| `move` | `{ direction: 'right' \| 'left', values: T[] }` | Any move action (button or double-click) |
| `item-remove` | `{ item, side }` | A custom renderer called `api.remove()` in either column |
| `item-action` | `{ item, name, payload?, side }` | A custom renderer called `api.action(...)` in either column |

### Exposed methods

```ts
const dual = useTemplateRef('dual')
dual.value?.moveRight()
dual.value?.moveLeft()
dual.value?.moveAllRight()
dual.value?.moveAllLeft()
dual.value?.clearHighlight()
```
