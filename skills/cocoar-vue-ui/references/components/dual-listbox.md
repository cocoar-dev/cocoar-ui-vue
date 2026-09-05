<!-- Generated from apps/docs/components/dual-listbox.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Dual Listbox

Two [`CoarListbox`](./listbox.md) columns side-by-side with move buttons — the classic pattern for moving items between "available" and "selected" sets. All the search, grouping, and custom-render features of `CoarListbox` carry over automatically.

```ts
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
```

## Basic

`v-model` holds the currently-selected values (right column). Everything else from `options` lives in the left column.

**Demo — `dual-listbox/demos/BasicDualListbox.vue`**

```vue
<template>
  <div style="height: 320px;">
    <CoarDualListbox
      v-model="selected"
      :options="options"
      available-label="Available"
      selected-label="Selected"
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Selected: {{ selected.join(', ') || 'none' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'delete', label: 'Delete' },
  { value: 'admin', label: 'Admin' },
  { value: 'publish', label: 'Publish' },
  { value: 'review', label: 'Review' },
];

const selected = ref<string[]>(['read']);
</script>
```

## Grouped

Group headings appear in both columns. Search and sorting apply per column.

**Demo — `dual-listbox/demos/GroupedDualListbox.vue`**

```vue
<template>
  <div style="height: 360px;">
    <CoarDualListbox
      v-model="selected"
      :options="options"
      available-label="Roles"
      selected-label="Assigned"
      :search-fields="['label', 'group']"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'admin', label: 'Admin', group: 'System' },
  { value: 'auditor', label: 'Auditor', group: 'System' },
  { value: 'editor', label: 'Editor', group: 'Content' },
  { value: 'publisher', label: 'Publisher', group: 'Content' },
  { value: 'reviewer', label: 'Reviewer', group: 'Content' },
  { value: 'viewer', label: 'Viewer', group: 'Content' },
  { value: 'billing', label: 'Billing', group: 'Finance' },
  { value: 'reporting', label: 'Reporting', group: 'Finance' },
];

const selected = ref<string[]>(['viewer']);
</script>
```

## Custom item components

Pass `itemComponents` and they're used on both sides. The component receives a `side` prop (`'available' | 'selected'`) so the same renderer can adapt per column if needed.

**Demo — `dual-listbox/demos/CustomComponentDualListbox.vue`**

```vue
<template>
  <div style="height: 360px;">
    <CoarDualListbox
      v-model="selectedIds"
      :options="items"
      :item-components="{ user: UserItem }"
      :compare-with="byId"
      available-label="Everyone"
      selected-label="Group members"
      :search-by="(i) => `${i.label} ${(i.value as UserRow).email}`"
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Group: {{ selectedIds.map(u => u.name).join(', ') || '—' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
import UserItem from '../../listbox/demos/UserItem.vue';

interface UserRow { id: string; name: string; email: string; role: string }

const users: UserRow[] = [
  { id: '1', name: 'Alice Müller', email: 'alice@x.com', role: 'Admin' },
  { id: '2', name: 'Bob Meier', email: 'bob@x.com', role: 'Editor' },
  { id: '3', name: 'Clara Schmid', email: 'clara@x.com', role: 'Viewer' },
  { id: '4', name: 'Dan Roth', email: 'dan@x.com', role: 'Editor' },
  { id: '5', name: 'Eva Horn', email: 'eva@x.com', role: 'Admin' },
];

const items: CoarListboxOption<UserRow>[] = users.map(u => ({
  value: u,
  label: u.name,
  kind: 'user',
}));

// Compare users by id — protects against reactivity-induced reference changes.
const byId = (a: UserRow, b: UserRow) => a.id === b.id;

const selectedIds = ref<UserRow[]>([users[0]]);
</script>
```

## Inline remove button (right side)

A common pattern: render an × button inside each selected item, and clicking it moves the user back to the available column. Since the right column is just `options ∩ modelValue`, "moving back" is simply *dropping the id from v-model* — the item re-appears on the left automatically.

**Demo — `dual-listbox/demos/RemoveBackToAvailable.vue`**

```vue
<template>
  <div style="height: 360px;">
    <CoarDualListbox
      v-model="selectedIds"
      :options="items"
      :item-components="{ user: UserCard }"
      :compare-with="byId"
      available-label="Everyone"
      selected-label="Group members"
      :search-by="(i) => `${i.label} ${(i.value as UserRow).email}`"
      @item-remove="onItemRemove"
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Group ({{ selectedIds.length }}): {{ selectedIds.map(u => u.name).join(', ') || '—' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
import UserCard from './UserCard.vue';

interface UserRow { id: string; name: string; email: string; role: string }

const users: UserRow[] = [
  { id: '1', name: 'Alice Müller', email: 'alice@x.com', role: 'Admin' },
  { id: '2', name: 'Bob Meier', email: 'bob@x.com', role: 'Editor' },
  { id: '3', name: 'Clara Schmid', email: 'clara@x.com', role: 'Viewer' },
  { id: '4', name: 'Dan Roth', email: 'dan@x.com', role: 'Editor' },
  { id: '5', name: 'Eva Horn', email: 'eva@x.com', role: 'Admin' },
];

const items: CoarListboxOption<UserRow>[] = users.map((u) => ({
  value: u, label: u.name, kind: 'user',
}));

const byId = (a: UserRow, b: UserRow) => a.id === b.id;

const selectedIds = ref<UserRow[]>([users[0], users[2]]);

// When a user clicks × on the right side, it's a "move back to available"
// — just drop the item from v-model and DualListbox re-computes the columns.
function onItemRemove(payload: { item: CoarListboxOption<UserRow>; side: 'available' | 'selected' }) {
  if (payload.side !== 'selected') return;
  selectedIds.value = selectedIds.value.filter((u) => !byId(u, payload.item.value));
}
</script>
```

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

See [`CoarListboxItemApi`](./listbox.md#item-api-inline-actions) for the full api surface.

## Drag & drop

Set the `drag-drop` prop and items become draggable between the two columns. A unique drag group is wired up internally so the two sides exchange items with each other but not with unrelated listboxes on the page.

**Demo — `dual-listbox/demos/DragDropDualListbox.vue`**

```vue
<template>
  <div style="height: 320px;">
    <CoarDualListbox
      v-model="selected"
      :options="options"
      available-label="Roles"
      selected-label="Assigned"
      drag-drop
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Tip: drag from one column to the other. Or Ctrl/Shift-click to pick several first, then drag.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'billing', label: 'Billing' },
  { value: 'reporting', label: 'Reporting' },
];

const selected = ref<string[]>(['viewer']);
</script>
```

Selection-aware: if the dragged item is part of a multi-highlight, the whole highlighted set moves at once.

For a standalone two-listbox setup (or three+ lists), see the same feature on [`CoarListbox`](./listbox.md#drag-drop-between-lists).

## Virtual scrolling (large datasets)

For directories with thousands of entries, enable `virtual` — only the rows in and around the viewport are rendered. Group headings scroll naturally in this mode (they are not sticky).

The demo below loads 10,000 synthetic principals (users, groups, service accounts) client-side. Scroll, search, highlight, drag, and the inline × all still work.

**Demo — `dual-listbox/demos/VirtualLargeList.vue`**

```vue
<template>
  <div style="height: 440px;">
    <CoarDualListbox
      v-model="assigned"
      :options="principals"
      :item-components="{ principal: PrincipalRow }"
      :compare-with="byId"
      :search-by="(i) => `${i.label} ${(i.value as Principal).sub} ${(i.value as Principal).kind}`"
      available-label="Directory"
      selected-label="Assigned"
      virtual
      :item-height="44"
      :group-heading-height="28"
      drag-drop
      @item-remove="onRemove"
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Directory: {{ principals.length.toLocaleString() }} principals. Assigned: {{ assigned.length }}.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
import PrincipalRow, { type Principal } from './PrincipalRow.vue';

// Generate 10k synthetic IPrincipals: 8k users, 1.5k groups, 500 system users.
function makePrincipals(): Principal[] {
  const out: Principal[] = [];
  const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Quinn', 'Avery', 'Rowan', 'Maya', 'Leo', 'Nora', 'Ivo', 'Yara', 'Milo', 'Luna', 'Finn', 'Zoe', 'Theo'];
  const lastNames = ['Müller', 'Schmid', 'Meier', 'Weber', 'Keller', 'Huber', 'Fischer', 'Baumann', 'Steiner', 'Brunner', 'Roth', 'Zürcher', 'Frei', 'Hofer', 'Widmer', 'Kaufmann', 'Bosshart', 'Stucki', 'Graf', 'Winkler'];
  for (let i = 0; i < 8000; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 7) % lastNames.length];
    out.push({
      id: `u${i}`,
      kind: 'user',
      name: `${fn} ${ln}`,
      sub: `${fn.toLowerCase()}.${ln.toLowerCase()}@corp.example`,
    });
  }
  const teams = ['Engineering', 'Design', 'Product', 'Sales', 'Marketing', 'Finance', 'Legal', 'HR', 'Support', 'Operations'];
  for (let i = 0; i < 1500; i++) {
    const t = teams[i % teams.length];
    out.push({
      id: `g${i}`,
      kind: 'group',
      name: `${t} #${Math.floor(i / teams.length) + 1}`,
      sub: `${(8 + (i % 24))} members`,
    });
  }
  for (let i = 0; i < 500; i++) {
    out.push({
      id: `s${i}`,
      kind: 'system',
      name: `svc-${String(i).padStart(4, '0')}`,
      sub: 'service account',
    });
  }
  return out;
}

const rawPrincipals = makePrincipals();

const principals = computed<CoarListboxOption<Principal>[]>(() =>
  rawPrincipals.map((p) => ({
    value: p,
    label: p.name,
    kind: 'principal',
  })),
);

const byId = (a: Principal, b: Principal) => a.id === b.id;

const assigned = ref<Principal[]>([rawPrincipals[3], rawPrincipals[42], rawPrincipals[8005]]);

function onRemove(payload: { item: CoarListboxOption<Principal>; side: 'available' | 'selected' }) {
  if (payload.side !== 'selected') return;
  assigned.value = assigned.value.filter((p) => !byId(p, payload.item.value));
}
</script>
```

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
- Virtual mode uses the [`useVirtualList`](./virtual-list.md) composable, which is also exported for your own components.

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
| `searchFields` / `searchBy` / `filterWith` | — | — | Search config, forwarded to both columns — see [Listbox docs](./listbox.md#flexible-search) |
| `sortGroups` / `sortOptions` / `hideGroupHeadings` | — | — | Grouping / sorting config, forwarded to both columns |
| `itemComponents` / `kindBy` | — | — | Custom rendering, forwarded to both columns |
| `compareWith` | `(a, b) => boolean` | `===` | Value equality |
| `hideMoveAll` | `boolean` | `false` | Hide the ≫ / ≪ buttons |
| `hideCounts` | `boolean` | `false` | Hide count badges in headers |
| `emptyAvailable` | `string` | `'No items'` | Empty state for left column |
| `emptySelected` | `string` | `'None selected'` | Empty state for right column |
| `sortSelectedBySource` | `boolean` | `false` | When `true`, the right column is re-sorted by the order of items in `options` after every move. Default keeps the order in which the user moved items across |
| `dragDrop` | `boolean` | `false` | Enable drag-and-drop between the two columns |
| `dragEngine` | `'native' \| 'pointer' \| 'auto'` | `'native'` | HTML5 drag events, or Pointer Events for touch — see [Drag & Drop → Engines](./drag-drop.md#engines) |
| `canDrag` | `(item) => boolean` | — | Per-item source permission, applied to both columns. See [Listbox docs](./listbox.md#per-item-validation) |
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
