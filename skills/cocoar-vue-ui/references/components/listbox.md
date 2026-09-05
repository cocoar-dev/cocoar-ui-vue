<!-- Generated from apps/docs/components/listbox.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Listbox

A single-column list of selectable items with grouping, search, custom renderers, and multi-select highlighting. Use it as a form control (v-model of highlighted values), as a display-only roster, or as the foundation for [`CoarDualListbox`](./dual-listbox.md).

```ts
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
```

## Basic

Multi-select highlight via click, `Ctrl+Click`, `Shift+Click`, and keyboard (arrows, `Space`, `Ctrl+A`). Double-click (or `Enter`) emits `item-activate` — wire this up to move items, open a detail view, etc.

**Demo — `listbox/demos/BasicListbox.vue`**

```vue
<template>
  <div style="max-width: 320px; height: 260px;">
    <CoarListbox
      v-model="highlighted"
      :options="options"
      label="Fruit"
      show-count
      searchable
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Highlighted: {{ highlighted.join(', ') || 'none' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig', label: 'Fig' },
];

const highlighted = ref<string[]>([]);
</script>
```

## Display only

Set `display-only` to render a static roster — for example, "current group members". Clicks don't highlight, keyboard navigation is off, ARIA role drops to `list`, but search and grouping still work.

**Demo — `listbox/demos/DisplayOnlyListbox.vue`**

```vue
<template>
  <div style="max-width: 320px; height: 240px;">
    <CoarListbox
      :options="members"
      display-only
      label="Team members"
      show-count
      :searchable="members.length > 5"
    />
  </div>
</template>

<script setup lang="ts">
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const members: CoarListboxOption<string>[] = [
  { value: 'alice', label: 'Alice Müller', subtitle: 'Engineer · Zürich', icon: 'user' },
  { value: 'bob', label: 'Bob Meier', subtitle: 'Designer · Basel', icon: 'user' },
  { value: 'clara', label: 'Clara Schmid', subtitle: 'PM · Bern', icon: 'user' },
  { value: 'dan', label: 'Dan Roth', subtitle: 'Engineer · Remote', icon: 'user' },
];
</script>
```

## Grouped

Items with a `group` field render under sticky headings. Group order is controlled by `sortGroups` ('asc' by default); item order within a group by `sortOptions` ('none' by default).

**Demo — `listbox/demos/GroupedListbox.vue`**

```vue
<template>
  <div style="max-width: 320px; height: 300px;">
    <CoarListbox
      v-model="highlighted"
      :options="options"
      label="Items"
      searchable
      :search-fields="['label', 'group']"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'apple', label: 'Apple', group: 'Fruit' },
  { value: 'banana', label: 'Banana', group: 'Fruit' },
  { value: 'cherry', label: 'Cherry', group: 'Fruit' },
  { value: 'carrot', label: 'Carrot', group: 'Vegetable' },
  { value: 'potato', label: 'Potato', group: 'Vegetable' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetable' },
];

const highlighted = ref<string[]>([]);
</script>
```

## Custom item components

For per-kind polymorphic rendering, register Vue components via `itemComponents`. The component resolution order is:

1. `itemComponents[item.kind]` if provided
2. `#item-<kind>` slot if present
3. `#item` slot if present
4. Built-in `icon + label + subtitle` layout

Each renderer receives `{ item, highlighted, selectable, side }` as props / slot scope. Set `kindBy` if `kind` lives on a different field than `item.kind`.

**Demo — `listbox/demos/CustomItemComponent.vue`**

```vue
<template>
  <div style="max-width: 360px; height: 320px;">
    <CoarListbox
      v-model="highlighted"
      :options="items"
      :item-components="{ user: UserItem, invite: InviteItem }"
      label="Mixed entries"
      searchable
      :search-by="(i) => `${i.label} ${(i.value as any).email ?? ''}`"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
import UserItem from './UserItem.vue';
import InviteItem from './InviteItem.vue';

interface UserRow { id: string; name: string; email: string; role: string }
interface InviteRow { id: string; email: string; expiresInDays: number }

const items: CoarListboxOption<UserRow | InviteRow>[] = [
  { value: { id: '1', name: 'Alice Müller', email: 'alice@x.com', role: 'Admin' }, label: 'Alice Müller', kind: 'user' },
  { value: { id: '2', name: 'Bob Meier', email: 'bob@x.com', role: 'Editor' }, label: 'Bob Meier', kind: 'user' },
  { value: { id: 'inv-1', email: 'carol@new.com', expiresInDays: 3 }, label: 'carol@new.com', kind: 'invite' },
  { value: { id: 'inv-2', email: 'dan@new.com', expiresInDays: 7 }, label: 'dan@new.com', kind: 'invite' },
];

const highlighted = ref<unknown[]>([]);
</script>
```

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

**Demo — `listbox/demos/RemovableItems.vue`**

```vue
<template>
  <div style="max-width: 400px; height: 280px;">
    <CoarListbox
      :options="rows"
      :item-components="{ tag: TagRow }"
      label="Keywords"
      show-count
      @item-remove="remove"
      @item-action="onAction"
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Last action: {{ lastAction || '—' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
import TagRow from './TagRow.vue';

const rows = ref<CoarListboxOption<string>[]>([
  { value: 'vue', label: 'vue', kind: 'tag' },
  { value: 'typescript', label: 'typescript', kind: 'tag' },
  { value: 'design-system', label: 'design-system', kind: 'tag' },
  { value: 'dnd', label: 'drag-and-drop', kind: 'tag' },
]);

const lastAction = ref('');

function remove(p: { item: CoarListboxOption<string> }) {
  rows.value = rows.value.filter((r) => r.value !== p.item.value);
  lastAction.value = `removed ${p.item.label}`;
}

function onAction(p: { item: CoarListboxOption<string>; name: string }) {
  lastAction.value = `${p.name} on ${p.item.label}`;
}
</script>
```

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

**Demo — `listbox/demos/DragDropTwoLists.vue`**

```vue
<template>
  <div style="display: flex; gap: 16px; height: 300px;">
    <CoarListbox
      :options="waiting"
      label="Backlog"
      show-count
      draggable
      droppable
      drag-group="tasks"
      @items-add="receive('waiting', $event)"
      @items-remove="remove('waiting', $event)"
    />
    <CoarListbox
      :options="doing"
      label="In progress"
      show-count
      draggable
      droppable
      drag-group="tasks"
      @items-add="receive('doing', $event)"
      @items-remove="remove('doing', $event)"
    />
    <CoarListbox
      :options="done"
      label="Done"
      show-count
      draggable
      droppable
      drag-group="tasks"
      @items-add="receive('done', $event)"
      @items-remove="remove('done', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

type Lane = 'waiting' | 'doing' | 'done';

const waiting = ref<CoarListboxOption<string>[]>([
  { value: 't1', label: 'Design migration plan' },
  { value: 't2', label: 'Spec compare-with API' },
  { value: 't3', label: 'Audit stale PRs' },
]);
const doing = ref<CoarListboxOption<string>[]>([
  { value: 't4', label: 'Ship script-editor v2' },
]);
const done = ref<CoarListboxOption<string>[]>([
  { value: 't5', label: 'Upgrade to Vue 3.5' },
]);

const laneRef = { waiting, doing, done };

function receive(to: Lane, payload: { items: CoarListboxOption<string>[] }) {
  laneRef[to].value = [...laneRef[to].value, ...payload.items];
}

function remove(from: Lane, payload: { items: CoarListboxOption<string>[] }) {
  const toRemove = new Set(payload.items.map((i) => i.value));
  laneRef[from].value = laneRef[from].value.filter((o) => !toRemove.has(o.value));
}
</script>
```

- **Events:** the source emits `items-remove`, the target emits `items-add`. The parent updates each list's `options` accordingly. Both fire synchronously on drop — no flicker.
- **Selection-aware:** if the dragged item is part of the multi-highlight, the whole highlighted set is carried along.
- **Groups:** lists with different `drag-group` values reject each other's drops. No group at all = self-drops only.
- For a built-in two-column experience, see [`CoarDualListbox`'s `drag-drop` prop](./dual-listbox.md#drag-drop).
- The drag logic comes from the [`useDragDrop`](./drag-drop.md) composable — use it directly if you need the same semantics in a custom component that isn't a listbox.

### Directional flows

When `drag-group` is too coarse — e.g. *box1 can go to box2 or box3, but nothing can return to box1* — each list gets a stable `drag-id` and the targets whitelist sources via `drag-accept`:

**Demo — `listbox/demos/DirectionalDnd.vue`**

```vue
<template>
  <div style="display: flex; gap: 16px; height: 280px;">
    <CoarListbox
      :options="backlog"
      label="Backlog"
      show-count
      draggable
      drag-group="tickets"
      drag-id="backlog"
      @items-remove="remove('backlog', $event)"
    />
    <CoarListbox
      :options="inReview"
      label="In review"
      show-count
      draggable
      droppable
      drag-group="tickets"
      drag-id="review"
      :drag-accept="['backlog']"
      @items-add="receive('inReview', $event)"
      @items-remove="remove('inReview', $event)"
    />
    <CoarListbox
      :options="done"
      label="Done"
      show-count
      droppable
      drag-group="tickets"
      drag-id="done"
      :drag-accept="['backlog', 'review']"
      @items-add="receive('done', $event)"
    />
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
    Backlog → In review, Backlog → Done, In review → Done. No drops back onto Backlog (it's not droppable), and Done is a dead-end (not draggable).
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

type Lane = 'backlog' | 'inReview' | 'done';

const backlog = ref<CoarListboxOption<string>[]>([
  { value: 't1', label: 'Spec the drag API' },
  { value: 't2', label: 'Audit stale PRs' },
  { value: 't3', label: 'Upgrade Vue minor' },
]);
const inReview = ref<CoarListboxOption<string>[]>([
  { value: 't4', label: 'Tokens v2' },
]);
const done = ref<CoarListboxOption<string>[]>([
  { value: 't5', label: 'Script editor v1' },
]);

const lanes = { backlog, inReview, done };

function receive(to: Lane, payload: { items: CoarListboxOption<string>[] }) {
  lanes[to].value = [...lanes[to].value, ...payload.items];
}

function remove(from: Lane, payload: { items: CoarListboxOption<string>[] }) {
  const r = new Set(payload.items.map((i) => i.value));
  lanes[from].value = lanes[from].value.filter((o) => !r.has(o.value));
}
</script>
```

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

All items must have the same height (`item-height`). Headings can use a different height (`group-heading-height`). For a concrete example with 10k entries see the [DualListbox virtual demo](./dual-listbox.md#virtual-scrolling-large-datasets).

Virtual scrolling is built on top of the exported [`useVirtualList`](./virtual-list.md) composable — use it standalone in your own components.

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
| `dragEngine` | `'native' \| 'pointer' \| 'auto'` | `'native'` | HTML5 drag events, or Pointer Events for touch — see [Drag & Drop → Engines](./drag-drop.md#engines) |
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
