---
description: "CoarListbox — single-column selectable list with grouping, search, multi-select highlighting, keyboard navigation, custom item renderers and display-only mode"
---

# Listbox

A single-column list of selectable items with grouping, search, custom renderers, and multi-select highlighting. Use it as a form control (v-model of highlighted values), as a display-only roster, or as the foundation for [`CoarDualListbox`](./dual-listbox).

```ts
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
```

## Basic

Multi-select highlight via click, `Ctrl+Click`, `Shift+Click`, and keyboard (arrows, `Space`, `Ctrl+A`). Double-click (or `Enter`) emits `item-activate` — wire this up to move items, open a detail view, etc.

<preview path="./listbox/demos/BasicListbox.vue" />

## Display only

Set `display-only` to render a static roster — for example, "current group members". Clicks don't highlight, keyboard navigation is off, ARIA role drops to `list`, but search and grouping still work.

<preview path="./listbox/demos/DisplayOnlyListbox.vue" />

## Grouped

Items with a `group` field render under sticky headings. Group order is controlled by `sortGroups` ('asc' by default); item order within a group by `sortOptions` ('none' by default).

<preview path="./listbox/demos/GroupedListbox.vue" />

## Custom item components

For per-kind polymorphic rendering, register Vue components via `itemComponents`. The component resolution order is:

1. `itemComponents[item.kind]` if provided
2. `#item-<kind>` slot if present
3. `#item` slot if present
4. Built-in `icon + label + subtitle` layout

Each renderer receives `{ item, highlighted, selectable, side }` as props / slot scope. Set `kindBy` if `kind` lives on a different field than `item.kind`.

<preview path="./listbox/demos/CustomItemComponent.vue" />

```ts
// UserItem.vue
const props = defineProps<{
  item: CoarListboxOption<UserRow>
  highlighted: boolean
  selectable: boolean
}>()
```

## Flexible search

Three levels of control, from simplest to most powerful — set only one:

```ts
// (a) Extend the built-in search to additional fields
searchFields: ['label', 'subtitle', 'group']

// (b) Provide the searchable text for each item
searchBy: (item) => `${item.label} ${item.value.email}`

// (c) Full control — arbitrary matching logic
filterWith: (item, query) => fuse.search(query).includes(item)
```

`filterWith` wins over `searchBy` wins over `searchFields`. Items can also carry a `searchText` field to override the default per-item.

## Item API (inline actions)

Every item renderer — whether a component from `itemComponents` or the `#item` / `#item-<kind>` slot — receives a scoped `api` handle. Use it to trigger listbox behavior from inside the row: remove it from a trash button, toggle highlight from a checkbox, fire a custom action from a context menu.

<preview path="./listbox/demos/RemovableItems.vue" />

The listbox emits the resulting event — `item-remove` or `item-action` with the name + payload — so the parent stays in charge of the data:

```ts
interface CoarListboxItemApi<T> {
  item: CoarListboxOption<T>
  highlighted: boolean
  highlight(): void
  unhighlight(): void
  toggleHighlight(): void
  activate(): void                              // emits `item-activate`
  remove(): void                                // emits `item-remove` → parent updates `options`
  action(name: string, payload?: unknown): void // emits `item-action`
}
```

Inside custom components:

```vue
<script setup lang="ts">
import type { CoarListboxOption, CoarListboxItemApi } from '@cocoar/vue-ui'
defineProps<{
  item: CoarListboxOption<Row>
  api: CoarListboxItemApi<Row>
}>()
</script>

<template>
  <div class="row">
    <span>{{ item.label }}</span>
    <button @click.stop="api.remove()">×</button>
  </div>
</template>
```

Use `@click.stop` on inline buttons so the click doesn't also trigger the row's click/highlight handler.

## Drag & drop between lists

Set `draggable` on lists items can leave, `droppable` on lists items can enter, and a shared `drag-group` name to link them. Use it for any layout — source/destination (one-way) or bidirectional peers (this Kanban-style example uses three lists):

<preview path="./listbox/demos/DragDropTwoLists.vue" />

- **Events:** the source emits `items-remove`, the target emits `items-add`. The parent updates each list's `options` accordingly. Both fire synchronously on drop — no flicker.
- **Selection-aware:** if the dragged item is part of the multi-highlight, the whole highlighted set is carried along.
- **Groups:** lists with different `drag-group` values reject each other's drops. No group at all = self-drops only.
- For a built-in two-column experience, see [`CoarDualListbox`'s `drag-drop` prop](./dual-listbox#drag-drop).
- The drag logic comes from the [`useDragDrop`](./drag-drop) composable — use it directly if you need the same semantics in a custom component that isn't a listbox.

### Directional flows

When `drag-group` is too coarse — e.g. *box1 can go to box2 or box3, but nothing can return to box1* — each list gets a stable `drag-id` and the targets whitelist sources via `drag-accept`:

<preview path="./listbox/demos/DirectionalDnd.vue" />

```vue
<CoarListbox drag-id="box1" draggable drag-group="flow" />                  <!-- source only -->
<CoarListbox drag-id="box2" draggable droppable drag-group="flow"
             :drag-accept="['box1']" />                                      <!-- only box1 → box2 -->
<CoarListbox drag-id="box3" droppable drag-group="flow"
             :drag-accept="['box1', 'box2']" />                              <!-- box1 + box2 → box3, dead-end -->
```

### Per-item validation

`can-drag` controls which items can leave the source (applies per-item, also trims the multi-highlight payload). `can-drop` validates incoming drops at runtime — the cursor shows "not allowed" when it refuses:

```vue
<!-- Only users can be dragged; groups stay put. -->
<CoarListbox :options="principals" draggable :can-drag="p => p.value.kind === 'user'" />

<!-- Admin group caps at 5 members, no bulk drops exceeding that. -->
<CoarListbox
  v-model="admins"
  :options="admins"
  droppable
  :can-drop="p => admins.length + p.items.length <= 5"
/>
```

## Virtual scrolling

For very long lists (thousands of items), enable `virtual` — only the rows in/near the viewport are rendered. Group headings scroll naturally in this mode (they are not sticky; the non-virtual mode keeps sticky headings). Search, keyboard nav, highlight, drag & drop, and custom item components all still work.

```vue
<CoarListbox
  :options="tenThousand"
  virtual
  :item-height="32"
  :group-heading-height="28"
  :overscan="5"
/>
```

All items must have the same height (`item-height`). Headings can use a different height (`group-heading-height`). For a concrete example with 10k entries see the [DualListbox virtual demo](./dual-listbox#virtual-scrolling-large-datasets).

Virtual scrolling is built on top of the exported [`useVirtualList`](./virtual-list) composable — use it standalone in your own components.

## Options Format

```ts
interface CoarListboxOption<T> {
  value: T;
  label: string;          // required — used for default rendering, search, a11y
  kind?: string;          // drives itemComponents / #item-<kind>
  group?: string;
  icon?: string;          // default renderer only
  subtitle?: string;      // default renderer only
  tooltip?: string;       // native `title` attribute
  disabled?: boolean;
  searchText?: string;    // per-item override for default search
}
```

## Slots

| Slot | Scope | Purpose |
|------|-------|---------|
| `header` | `{ label, count, total }` | Replace the entire header row |
| `search` | `{ query, update }` | Replace the search input |
| `item` | `{ item, highlighted, selectable, side?, api }` | Render every item. `api` exposes `remove()`, `toggleHighlight()`, `activate()`, `action(name, payload?)` |
| `item-<kind>` | `{ item, highlighted, selectable, side?, api }` | Render items whose `kind` matches |
| `group-heading` | `{ group, items }` | Replace the group heading |
| `empty` | — | Replace the empty state |
| `footer` | — | Add a footer below the list |

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `T[]` | `[]` | Currently highlighted values |
| `options` | `CoarListboxOption<T>[]` | `[]` | Items to display |
| `label` | `string` | `''` | Header label |
| `showCount` | `boolean` | `false` | Show a count badge in the header |
| `showHeader` | `boolean` | *auto* | Override header visibility |
| `height` | `string` | *flex* | Fixed list height (e.g. `'280px'`); otherwise the list fills its parent |
| `displayOnly` | `boolean` | `false` | Disable click/keyboard interaction — render a static list. Downgrades ARIA role to `list` |
| `disabled` | `boolean` | `false` | Dim and ignore input |
| `readonly` | `boolean` | `false` | Keep appearance but ignore input |
| `searchable` | `boolean` | `false` | Render a search input above the list |
| `searchPlaceholder` | `string` | `'Search…'` | Search input placeholder |
| `searchFields` | `('label' \| 'subtitle' \| 'group')[]` | `['label']` | Fields searched by default |
| `searchBy` | `(item) => string` | — | Override the searchable text per item |
| `filterWith` | `(item, query) => boolean` | — | Full control over matching |
| `sortGroups` | `'asc' \| 'desc' \| 'none' \| (a,b) => number` | `'asc'` | Group order |
| `sortOptions` | `'asc' \| 'desc' \| 'none' \| (a,b) => number` | `'none'` | Item order |
| `hideGroupHeadings` | `boolean` | `false` | Omit group labels even when items have a `group` |
| `itemComponents` | `Record<string, Component>` | `{}` | Map of `kind` → renderer component |
| `kindBy` | `(item) => string` | `(i) => i.kind ?? ''` | Derive kind from a custom field |
| `compareWith` | `(a: T, b: T) => boolean` | `===` | Equality for values |
| `emptyText` | `string` | `'No items'` | Fallback empty state text |
| `draggable` | `boolean` | `false` | Allow items to be dragged out of this list |
| `droppable` | `boolean` | `false` | Accept drops from compatible listboxes |
| `dragEngine` | `'native' \| 'pointer' \| 'auto'` | `'native'` | HTML5 drag events, or Pointer Events for touch — see [Drag & Drop → Engines](./drag-drop#engines) |
| `dragGroup` | `string` | — | Shared name linking lists that can exchange items |
| `dragId` | `string` | auto | Stable identifier — pair with other lists' `dragAccept` for directional flow |
| `dragAccept` | `string[]` | — | Whitelist of source `dragId`s this list accepts. Unset = accept any source in the same `dragGroup`; empty array = accept nothing |
| `canDrag` | `(item) => boolean` | — | Per-item source permission. Items returning `false` are not draggable |
| `canDrop` | `(payload) => boolean` | — | Runtime drop validation; `payload` is `{ items, fromId, fromGroup, fromSelf }` |
| `virtual` | `boolean` | `false` | Enable virtual scrolling — only rows in/near the viewport are rendered |
| `itemHeight` | `number` | `32` | Row height in pixels (used only when `virtual` is on) |
| `groupHeadingHeight` | `number` | `28` | Heading height when `virtual` is on |
| `overscan` | `number` | `5` | Extra rows rendered above/below the viewport |

### Events

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | `T[]` | Highlight changed |
| `item-click` | `{ item, event }` | Single click on an item |
| `item-dblclick` | `{ item, event }` | Double click on an item |
| `item-activate` | `{ item }` | Double-click or `Enter` on a highlighted item — idiomatic "move this / open this" hook |
| `item-remove` | `{ item }` | A custom renderer called `api.remove()` — parent should drop the item from `options` |
| `item-action` | `{ item, name, payload? }` | A custom renderer called `api.action(name, payload?)` — escape hatch for any custom inline operation |
| `drag-start` | `{ items }` | Drag has started on this list. `items` includes the whole highlighted set when the grabbed item was part of it, else just the one item |
| `drag-end` | `{ items, dropped }` | Drag ended — `dropped: true` if a target consumed it |
| `items-add` | `{ items, insertIndex, fromGroup, fromSelf }` | Drop accepted here. Parent should add `items` to its source of truth. `insertIndex` is the position of the item dropped on (or `null` if dropped in empty space) |
| `items-remove` | `{ items, toGroup }` | The dragged items were consumed by a target. Parent should remove them from this list's source of truth |

### Exposed methods

Accessible via template ref:

```ts
const box = useTemplateRef<CoarListboxExposed<string>>('box')
box.value?.clearHighlight()
box.value?.highlightAll()
box.value?.focus()
box.value?.clearSearch()
box.value?.visibleItems // current filtered + sorted items
```
