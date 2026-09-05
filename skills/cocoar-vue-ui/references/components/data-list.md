<!-- Generated from apps/docs/components/data-list.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Data List

A list of records where **you own the row layout**. Where [`CoarDataGrid`](./data-grid.md) squeezes every field into a column, `CoarDataList` gives each record a free-form, multi-line template — the right tool when a notebook screen would otherwise show a dozen tiny columns and a horizontal scrollbar. It brings the parts a hand-rolled list keeps reinventing: virtual scrolling with measured row heights, search, a sort menu, keyboard and pointer selection, grouping, and an empty state.

```ts
import { CoarDataList, useDataList, useDataListModel } from '@cocoar/vue-ui';
import type { CoarDataListSortOption, CoarDataListSort, CoarDataListKey } from '@cocoar/vue-ui';
```

Two ways to configure it: **props + `v-model`** for simple lists, or the **fluent builder** from `useDataList()` — the same pattern as `CoarGridBuilder` and `useTree()` — which also gives you declarative context menus and an imperative `api`.

## Builder API

`useDataList<T>()` returns `{ builder, api }`. Configure data, behaviour, appearance, handlers and context menus in one chain; the template is just `<CoarDataList :builder>` plus your item slot. The list renders the `<CoarContextMenu>` itself.

**Demo — `data-list/demos/BuilderDataList.vue`**

```vue
<template>
  <div class="demo">
    <CoarDataList :builder="builder">
      <template #toolbar-right>
        <CoarButton variant="secondary" size="s" :disabled="api.selectedItems.value.length === 0" @click="archiveSelected">
          Archive {{ api.selectedItems.value.length || '' }}
        </CoarButton>
      </template>

      <template #item="{ item }">
        <div class="order">
          <div class="order__primary">
            <span class="order__number">#{{ item.number }}</span>
            <span class="order__customer">{{ item.customer }}</span>
            <span class="order__total">{{ item.total.toFixed(2) }} €</span>
          </div>
          <div class="order__secondary">
            <CoarTag :variant="item.paid ? 'success' : 'warning'" size="s">{{ item.paid ? 'Paid' : 'Open' }}</CoarTag>
            <span>{{ item.placed }}</span>
            <span class="order__items">{{ item.items }} items</span>
          </div>
        </div>
      </template>
    </CoarDataList>
    <p class="demo__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarDataList, CoarTag, useDataList } from '@cocoar/vue-ui';

interface Order {
  number: number;
  customer: string;
  total: number;
  paid: boolean;
  placed: string;
  items: number;
  archived: boolean;
}

const customers = ['Vienna Gateway', 'Danube Relay', 'Pacific Node', 'Atlantic Edge', 'Nordic Mesh'];

const orders = ref<Order[]>(
  Array.from({ length: 40 }, (_, index) => ({
    number: 5000 + index,
    customer: customers[(index * 7) % customers.length],
    total: 40 + ((index * 137) % 900) + 0.5,
    paid: index % 3 !== 0,
    placed: `2026-08-${String(1 + (index % 28)).padStart(2, '0')}`,
    items: 1 + (index % 6),
    archived: false,
  })),
);

const hint = ref('Right-click an order, or select several and use the toolbar button.');

const { builder, api } = useDataList<Order>();

builder
  .items(orders)
  .itemKey((order) => order.number)
  .filter((order) => !order.archived)
  .searchBy(['number', 'customer'])
  .sortOption('placed', 'Date', { defaultDirection: 'desc' })
  .sortOption('total', 'Total', { defaultDirection: 'desc' })
  .sortOption('customer', 'Customer')
  .sort({ key: 'placed', direction: 'desc' })
  .groupBy((order) => (order.paid ? 'Paid' : 'Open'))
  .selection('multiple')
  .showSearch()
  .showSort()
  .searchHighlight()
  .dividers()
  .bordered()
  .height('22rem')
  .ariaLabel('Orders')
  .onItemActivate((e) => { hint.value = `Opened order #${e.item.number}`; })
  .itemMenu((order, selectedItems) => [
    { label: `Open #${order.number}`, icon: 'external-link', onClick: () => { hint.value = `Opened order #${order.number}`; } },
    { label: order.paid ? 'Mark as open' : 'Mark as paid', icon: 'check', onClick: () => { order.paid = !order.paid; } },
    'divider',
    {
      label: selectedItems.length > 1 ? `Archive ${selectedItems.length} orders` : 'Archive',
      icon: 'x',
      danger: true,
      onClick: archiveSelected,
    },
  ])
  .viewportMenu(() => [
    { label: 'Select all', icon: 'check', onClick: () => api.selectAll() },
    { label: 'Clear selection', onClick: () => api.clearSelection() },
  ]);

function archiveSelected() {
  const count = api.selectedItems.value.length;
  for (const order of api.selectedItems.value) order.archived = true;
  api.clearSelection();
  hint.value = `Archived ${count} order(s).`;
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__hint {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.order {
  display: grid;
  gap: var(--coar-spacing-xxs);
  min-width: 0;
}

.order__primary,
.order__secondary {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.order__number {
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-secondary);
}

.order__customer {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--coar-font-weight-semibold);
}

.order__total {
  font-variant-numeric: tabular-nums;
}

.order__secondary {
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.order__items {
  margin-left: auto;
}
</style>
```

```ts
const { builder, api } = useDataList<Order>();

builder
  .items(orders)                                  // array, ref or getter
  .itemKey((o) => o.number)
  .filter((o) => !o.archived)
  .searchBy(['number', 'customer'])
  .sortOption('placed', 'Date', { defaultDirection: 'desc' })
  .sortOption('total', 'Total', { by: (o) => o.total })
  .sort({ key: 'placed', direction: 'desc' })     // initial value, or your own Ref
  .groupBy((o) => (o.paid ? 'Paid' : 'Open'))
  .selection('multiple')
  .showSearch().showSort().searchHighlight()
  .dividers().bordered().height('22rem')
  .onItemActivate((e) => open(e.item))
  .itemMenu((order, selectedItems) => [
    { label: 'Open', icon: 'external-link', onClick: () => open(order) },
    'divider',
    { label: `Archive ${selectedItems.length}`, danger: true, onClick: archive },
  ])
  .viewportMenu(() => [{ label: 'Select all', onClick: () => api.selectAll() }]);
```

Every setter accepts a plain value, a `Ref`, or a getter, and setters called after mount re-render the list. Boolean setters default to `true` (`.showSearch()` ≡ `.showSearch(true)`). `.search()`, `.sort()` and `.selected()` take either an initial value or your own writable `Ref` — pass the ref when other UI (a view-mode toggle, a URL query) shares the state.

### Context menus

`.itemMenu((item, selectedItems) => entries)` fires on right-click / long-press of an item. The item under the pointer is selected first unless it already was, so `selectedItems` is what a bulk action should operate on. `.viewportMenu(() => entries)` fires on the empty area. Entries are `{ label, icon?, danger?, disabled?, onClick }` or the literal `'divider'`. Setting `.onItemContextMenu(handler)` hands you the raw event instead and bypasses `itemMenu`.

### `api`

| Member | Description |
|--------|-------------|
| `select(key, mode?)`, `selectAll()`, `clearSelection()`, `isSelected(key)` | Selection actions (`mode`: `'replace'` default, `'toggle'`, `'range'`) |
| `scrollToKey(key, align?)`, `scrollToIndex(index, align?)`, `focusKey(key)` | Scrolling and focus |
| `invalidateMeasurements(key?)` | Forget measured heights after a layout change the list cannot observe |
| `selected`, `search`, `sort` | The builder's writable refs |
| `selectedItems`, `items`, `count`, `total` | Readonly computed refs, live once mounted |

Actions called before `<CoarDataList>` mounts warn and do nothing; move them into `onMounted` or an event handler.

## Basic (props)

Search, sort menu, multi-select, search-hit highlighting. The `item` slot renders a two-line ticket; its layout, fields and container-query breakpoints belong to the consumer. The control below the list switches the `gap` between rows — try it with a wide gap, the rows stay measured and aligned.

**Demo — `data-list/demos/BasicDataList.vue`**

```vue
<template>
  <div class="demo">
    <CoarDataList
      v-model:search="search"
      v-model:sort="sort"
      v-model:selected="selected"
      :items="tickets"
      :item-key="(ticket) => ticket.id"
      :search-by="['title', 'customer', 'assignee', 'status']"
      :sort-options="sortOptions"
      selection="multiple"
      show-search
      show-sort
      search-highlight
      :gap="gap"
      :dividers="gap === 0"
      bordered
      height="22rem"
      aria-label="Tickets"
      @item-activate="open"
    >
      <template #toolbar-right>
        <CoarBadge variant="neutral">{{ selected.length }} selected</CoarBadge>
      </template>

      <template #item="{ item }">
        <div class="ticket">
          <div class="ticket__primary">
            <span class="ticket__title">{{ item.title }}</span>
            <CoarTag :variant="statusVariant[item.status]" size="s">{{ item.status }}</CoarTag>
            <span class="ticket__due" :class="{ 'ticket__due--late': item.overdue }">{{ item.due }}</span>
          </div>
          <div class="ticket__secondary">
            <span class="ticket__customer">{{ item.customer }}</span>
            <span class="ticket__assignee">{{ item.assignee }}</span>
            <span class="ticket__summary">{{ item.summary }}</span>
          </div>
        </div>
      </template>
    </CoarDataList>
    <div class="demo__controls">
      <span class="demo__label">Row gap</span>
      <CoarSegmentedControl v-model="gap" :options="gapOptions" size="s" aria-label="Row gap" />
      <p class="demo__hint">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarBadge, CoarDataList, CoarSegmentedControl, CoarTag } from '@cocoar/vue-ui';
import type { CoarDataListItemEvent, CoarDataListKey, CoarDataListSort, CoarDataListSortOption } from '@cocoar/vue-ui';

type Status = 'Open' | 'In progress' | 'Blocked' | 'Done';

interface Ticket {
  id: number;
  title: string;
  customer: string;
  assignee: string;
  status: Status;
  due: string;
  overdue: boolean;
  summary: string;
  priority: number;
}

const customers = ['Vienna Gateway', 'Danube Relay', 'Pacific Node', 'Atlantic Edge', 'Nordic Mesh'];
const people = ['Ada', 'Grace', 'Linus', 'Margaret', 'Tim'];
const statuses: Status[] = ['Open', 'In progress', 'Blocked', 'Done'];
const summaries = [
  'Customer reports intermittent timeouts after the last deployment; logs attached.',
  'Needs a decision on the retention policy before the migration can continue.',
  'Waiting for the vendor to confirm the certificate rotation window.',
  'Short follow-up call requested, no blocking issues.',
];

const tickets: Ticket[] = Array.from({ length: 60 }, (_, index) => {
  const day = 1 + ((index * 7) % 28);
  return {
    id: 1000 + index,
    title: `Ticket #${1000 + index}: ${['Sync failure', 'Access request', 'Billing question', 'Feature wish'][index % 4]}`,
    customer: customers[index % customers.length],
    assignee: people[(index * 3) % people.length],
    status: statuses[index % statuses.length],
    due: `2026-09-${String(day).padStart(2, '0')}`,
    overdue: index % 5 === 0,
    summary: summaries[index % summaries.length],
    priority: (index * 13) % 5,
  };
});

const statusVariant: Record<Status, 'info' | 'warning' | 'error' | 'success'> = {
  Open: 'info',
  'In progress': 'warning',
  Blocked: 'error',
  Done: 'success',
};

const sortOptions: CoarDataListSortOption<Ticket>[] = [
  { key: 'title', label: 'Title' },
  { key: 'customer', label: 'Customer' },
  { key: 'due', label: 'Due date' },
  { key: 'priority', label: 'Priority', defaultDirection: 'desc' },
];

const search = ref('');
const sort = ref<CoarDataListSort | null>({ key: 'due', direction: 'asc' });
const selected = ref<CoarDataListKey[]>([]);
const hint = ref('Double-click or press Enter to open a ticket.');

// Gap is a list prop, not a template margin: the measured row height includes it.
// With a gap, dividers are switched off — the space separates the rows on its own.
const gap = ref(0);
const gapOptions = [
  { value: 0, label: 'None' },
  { value: 4, label: '4 px' },
  { value: 8, label: '8 px' },
  { value: 16, label: '16 px' },
];

function open(event: CoarDataListItemEvent<Ticket>) {
  hint.value = `Opened ${event.item.title}`;
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__controls {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  flex-wrap: wrap;
}

.demo__label {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.demo__hint {
  margin: 0 0 0 auto;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

/* The item template owns its layout. Container queries adapt to the list's width,
   not the viewport's, so the same template works inside a narrow side panel. */
.ticket {
  container-type: inline-size;
  display: grid;
  gap: var(--coar-spacing-xxs);
  min-width: 0;
}

.ticket__primary,
.ticket__secondary {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.ticket__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--coar-font-weight-semibold);
}

.ticket__due {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-secondary);
}

.ticket__due--late {
  color: var(--coar-text-error-primary, #c0392b);
}

.ticket__secondary {
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.ticket__customer,
.ticket__assignee {
  flex-shrink: 0;
}

.ticket__summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@container (max-width: 480px) {
  .ticket__summary {
    display: none;
  }
}
</style>
```

```vue
<CoarDataList
  v-model:search="search"
  v-model:sort="sort"
  v-model:selected="selected"
  :items="tickets"
  :item-key="(t) => t.id"
  :search-by="['title', 'customer', 'assignee']"
  :sort-options="sortOptions"
  selection="multiple"
  show-search
  show-sort
  search-highlight
  dividers
  bordered
  @item-activate="open"
>
  <template #item="{ item, selected }">
    <!-- any markup; the list only adds padding, hover, selection and focus -->
  </template>
</CoarDataList>
```

### Writing the item template

The list owns the **box** around each record; the template owns everything **inside** it.

| The list decides | The template decides |
|---|---|
| Row/tile position, width and virtualization; tiles in a row are equal-width columns and stretch to the tallest | Everything inside the box: markup, layout, fields, images, typography, colours of the content, inline buttons or checkboxes |
| Box padding (`density`), `gap` between rows, dividers, card border and radius (`tileCards`) | Its own height — one line, three lines, varying per record; it is measured |
| Hover, selected, focus and drag styling of the box, drop indicators, cursor | How to *show* state: react to the slot props `selected`, `focused`, `dragging`, `expanded`, `depth`, `hasChildren` |
| Chevron gutter, indent, guide lines, band frame and elevation for nested lists | Own expand controls via `toggleExpanded()` (hide the built-in ones with `hideExpandToggle`), own selection controls via `select()` / `toggle()` |
| Roles, ARIA, keyboard, selection and drag behaviour | Whether a click inside should *not* select the row: stop it with `@click.stop` |

Rules that follow from the split:

- **No margins on the template root.** The list measures the box, margins are outside it and would make rows overlap. Use padding inside the template, or `gap` on the list.
- **Don't position the root.** Rows are positioned by the list; use `position: relative` on your root only to place children inside it.
- **Don't draw the box.** A border or background on the template root doubles with the list's card, hover and selection styling. Style content, not the container — or switch `tileCards` off and draw your own card, accepting that hover and selection then only tint it.
- **Width is not yours in the grid.** Tiles share the row's columns; per-item spans are a possible later addition, not a template concern.
- **Interactive children are safe.** Buttons, links and inputs inside the template never start a drag; clicks on them still bubble to the row unless stopped.
- Keep `min-width: 0` on flex/grid children that should truncate, and use **container queries** (`container-type: inline-size` on the root) rather than viewport media queries — the same template then adapts inside a narrow side panel.
- Render a checkbox bound to `toggle()` when touch users should multi-select without modifier keys; rows have no built-in actions column, so put a "…" button in the template or handle `item-contextmenu`.

CSS variables the list exposes: `--coar-data-list-gap`, `--coar-data-list-indent`, `--coar-data-list-padding` (inner padding of the scroll area), `--coar-data-list-item-pad-x` / `-pad-y` (box padding per density); `--coar-data-list-depth` is set on nested rows and can be read by the template.

### Owning the box too: `unstyledItems`

When the template should be the *whole* item, set `unstyledItems` (builder: `.unstyledItems()`). The list then draws nothing around a record — no padding, hover, selection, focus, dividers or card — and keeps only what a template cannot do itself: position, measurement, the drop indicators and the row gap. State arrives through the slot props (`selected`, `focused`, `dragging`, `expanded`, `hasChildren`, `depth`), actions through `select()`, `toggle()`, `toggleExpanded()` and the `api`. Draw the focus state: the keyboard focus marker is now yours to show.

**Demo — `data-list/demos/UnstyledDataList.vue`**

```vue
<template>
  <CoarDataList :builder="builder">
    <!-- The whole item is the template: box, states, controls. -->
    <template #item="{ item, selected, focused, dragging, expanded, hasChildren, depth, toggle, toggleExpanded }">
      <div
        class="ticket"
        :class="{
          'ticket--selected': selected,
          'ticket--focused': focused,
          'ticket--dragging': dragging,
          'ticket--child': depth > 0,
        }"
      >
        <CoarCheckbox :model-value="selected" size="s" @update:model-value="toggle()" @click.stop />
        <div class="ticket__body">
          <div class="ticket__head">
            <span class="ticket__title">{{ item.title }}</span>
            <CoarTag :variant="item.done ? 'success' : 'warning'" size="s">{{ item.done ? 'Done' : 'Open' }}</CoarTag>
          </div>
          <span class="ticket__meta">{{ item.owner }} · {{ item.due }}</span>
        </div>
        <CoarButton
          v-if="hasChildren"
          variant="ghost"
          size="xs"
          :icon-start="expanded ? 'chevron-up' : 'chevron-down'"
          :aria-label="expanded ? 'Hide sub-tasks' : `Show ${item.subTasks!.length} sub-tasks`"
          @click.stop="toggleExpanded()"
        />
      </div>
    </template>
  </CoarDataList>
</template>

<script setup lang="ts">
import { CoarButton, CoarCheckbox, CoarDataList, CoarTag, useDataList } from '@cocoar/vue-ui';

interface Ticket {
  id: string;
  title: string;
  owner: string;
  due: string;
  done: boolean;
  subTasks?: Ticket[];
}

const tickets: Ticket[] = [
  { id: 't1', title: 'Rework the onboarding mail', owner: 'Ada', due: '2026-09-12', done: false, subTasks: [
    { id: 't1a', title: 'Draft copy', owner: 'Ada', due: '2026-09-08', done: true },
    { id: 't1b', title: 'Review with legal', owner: 'Grace', due: '2026-09-10', done: false },
  ] },
  { id: 't2', title: 'Fix the login timeout', owner: 'Linus', due: '2026-09-09', done: true },
  { id: 't3', title: 'Design the empty state', owner: 'Margaret', due: '2026-09-15', done: false },
  { id: 't4', title: 'Update dependencies', owner: 'Tim', due: '2026-09-20', done: false },
];

const { builder } = useDataList<Ticket>();
builder
  .items(tickets)
  .itemKey((ticket) => ticket.id)
  .children((ticket) => ticket.subTasks)
  .expanded(['t1'])
  .selection('multiple')
  .unstyledItems()
  .hideExpandToggle()
  .nestingStyle('none')
  .gap(6)
  .height('20rem')
  .ariaLabel('Tickets');
</script>

<style scoped>
.ticket {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  padding: var(--coar-spacing-s);
  border: 1px solid var(--coar-border-neutral);
  border-left: 3px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  background: var(--coar-surface-neutral-primary, #fff);
  min-width: 0;
  transition: border-color var(--coar-duration-fast) var(--coar-ease-out), box-shadow var(--coar-duration-fast) var(--coar-ease-out);
}

.ticket--child {
  padding-block: var(--coar-spacing-xs);
  border-style: dashed;
}

.ticket--selected {
  border-left-color: var(--coar-border-accent-primary);
  background: var(--coar-background-accent-tertiary);
}

.ticket--focused {
  box-shadow: 0 0 0 2px var(--coar-focus-color);
}

.ticket--dragging {
  opacity: 0.5;
}

.ticket__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.ticket__head {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.ticket__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--coar-font-weight-semibold);
}

.ticket__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}
</style>
```

## Selection and context menu

`selection` is `'none'` (default), `'single'` or `'multiple'`. Click replaces, `Ctrl`/`⌘`-click toggles, `Shift`-click selects a range; the keyboard mirrors this (see [Keyboard](#keyboard)). Right-clicking an unselected item selects it first, so a context menu always acts on the item under the pointer.

**Demo — `data-list/demos/SelectionDataList.vue`**

```vue
<template>
  <div class="demo">
    <CoarDataList
      v-model:selected="selected"
      :items="files"
      :item-key="(file) => file.path"
      selection="multiple"
      :gap="4"
      bordered
      height="18rem"
      @item-contextmenu="onContextMenu"
    >
      <template #toolbar-left>
        <span class="demo__title">Attachments</span>
      </template>
      <template #toolbar-right>
        <CoarButton variant="secondary" size="s" :disabled="selected.length === 0" @click="removeSelected">
          Remove {{ selected.length || '' }}
        </CoarButton>
      </template>

      <template #item="{ item, selected: isSelected, toggle }">
        <div class="file">
          <CoarCheckbox :model-value="isSelected" size="s" @update:model-value="toggle()" @click.stop />
          <CoarIcon :name="item.kind === 'image' ? 'image' : 'file-text'" size="m" />
          <div class="file__text">
            <span class="file__name">{{ item.name }}</span>
            <span class="file__meta">{{ item.path }} · {{ item.size }}</span>
          </div>
        </div>
      </template>
    </CoarDataList>

    <CoarContextMenu :menu="menu">
      <CoarMenuItem label="Download" icon="download" @click="log('download')" />
      <CoarMenuItem label="Rename" icon="pencil" :disabled="selected.length !== 1" @click="log('rename')" />
      <CoarMenuDivider />
      <CoarMenuItem label="Remove" icon="x" @click="removeSelected" />
    </CoarContextMenu>

    <p class="demo__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarButton,
  CoarCheckbox,
  CoarContextMenu,
  CoarDataList,
  CoarIcon,
  CoarMenuDivider,
  CoarMenuItem,
  useContextMenu,
} from '@cocoar/vue-ui';
import type { CoarDataListItemEvent, CoarDataListKey } from '@cocoar/vue-ui';

interface FileRow {
  path: string;
  name: string;
  size: string;
  kind: 'image' | 'document';
}

const files = ref<FileRow[]>([
  { path: '/2026/offer.pdf', name: 'Offer.pdf', size: '184 KB', kind: 'document' },
  { path: '/2026/floorplan.png', name: 'Floorplan.png', size: '2.1 MB', kind: 'image' },
  { path: '/2026/notes.md', name: 'Notes.md', size: '3 KB', kind: 'document' },
  { path: '/2026/site.jpg', name: 'Site.jpg', size: '4.7 MB', kind: 'image' },
  { path: '/2026/contract.docx', name: 'Contract.docx', size: '96 KB', kind: 'document' },
  { path: '/2026/invoice-0917.pdf', name: 'Invoice 0917.pdf', size: '71 KB', kind: 'document' },
]);

const selected = ref<CoarDataListKey[]>([]);
const menu = useContextMenu();
const hint = ref('Tap the checkbox or use Ctrl/Shift+Click. Right-click for actions.');

function onContextMenu(event: CoarDataListItemEvent<FileRow>) {
  // The list already selected the item under the pointer (unless it was part of the selection).
  menu.open(event.event as MouseEvent);
}

function removeSelected() {
  const keys = new Set(selected.value);
  files.value = files.value.filter((file) => !keys.has(file.path));
  hint.value = `Removed ${keys.size} file(s).`;
  selected.value = [];
}

function log(action: string) {
  hint.value = `${action}: ${selected.value.join(', ')}`;
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__title {
  font-weight: var(--coar-font-weight-semibold);
}

.demo__hint {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.file {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.file__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
```

## Grid layout

`layout="grid"` flows the same records into tiles: as many per row as fit `tileMinWidth`, always in exact data order — a tile grid is a list that wraps. Search, sort, grouping, selection, context menus and the `api` work identically, so a list/grid toggle is one setter or prop. The item slot is unchanged; give the template a second shape for tiles as the demo does.

**Demo — `data-list/demos/GridDataList.vue`**

```vue
<template>
  <div class="demo">
    <CoarDataList :builder="builder">
      <template #toolbar-right>
        <CoarSegmentedControl v-model="layout" :options="layoutOptions" size="s" aria-label="Layout" />
      </template>

      <template #item="{ item, selected }">
        <div class="asset" :class="{ 'asset--tile': layout === 'grid' }">
          <div class="asset__thumb" :style="{ background: item.color }">
            <CoarIcon :name="item.icon" size="l" />
          </div>
          <div class="asset__text">
            <span class="asset__name">{{ item.name }}</span>
            <span class="asset__meta">{{ item.kind }} · {{ item.size }}</span>
          </div>
          <CoarIcon v-if="selected" name="check" size="s" class="asset__check" />
        </div>
      </template>
    </CoarDataList>
    <p class="demo__hint">Same data, same order, same selection — only the layout changes. Arrow keys move by tile and by row.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataList, CoarIcon, CoarSegmentedControl, useDataList } from '@cocoar/vue-ui';
import type { CoarDataListLayout } from '@cocoar/vue-ui';

interface Asset {
  id: number;
  name: string;
  kind: 'Image' | 'Document' | 'Sheet' | 'Video';
  size: string;
  icon: string;
  color: string;
}

const kinds: Array<[Asset['kind'], string, string]> = [
  ['Image', 'image', 'var(--coar-background-accent-secondary)'],
  ['Document', 'file-text', 'var(--coar-background-neutral-tertiary)'],
  ['Sheet', 'table', 'var(--coar-background-success-secondary, #dcfce7)'],
  ['Video', 'camera', 'var(--coar-background-warning-secondary, #fef3c7)'],
];

const assets: Asset[] = Array.from({ length: 48 }, (_, index) => {
  const [kind, icon, color] = kinds[index % kinds.length];
  return {
    id: index + 1,
    name: `${kind} ${String(index + 1).padStart(2, '0')}`,
    kind,
    size: `${((index * 37) % 900) + 12} KB`,
    icon,
    color,
  };
});

const layout = ref<CoarDataListLayout>('grid');
const layoutOptions = [
  { value: 'list' as const, label: 'List', icon: 'list' },
  { value: 'grid' as const, label: 'Grid', icon: 'layout-grid' },
];

const { builder } = useDataList<Asset>();
builder
  .items(assets)
  .itemKey((asset) => asset.id)
  .layout(layout)
  .tileMinWidth('11rem')
  .gap(8)
  .searchBy(['name', 'kind'])
  .sortOption('name', 'Name')
  .sortOption('kind', 'Kind')
  .selection('multiple')
  .showSearch()
  .showSort()
  .bordered()
  .height('24rem')
  .ariaLabel('Assets');
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__hint {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

/* One template, two shapes: a row in list layout, a card in grid layout. */
.asset {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
  height: 100%;
}

.asset--tile {
  flex-direction: column;
  align-items: stretch;
  gap: var(--coar-spacing-xs);
}

.asset__thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--coar-radius-xs);
  color: var(--coar-icon-neutral-secondary);
}

.asset--tile .asset__thumb {
  width: auto;
  height: 5rem;
}

.asset__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.asset__name {
  font-weight: var(--coar-font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.asset__check {
  color: var(--coar-icon-accent-primary);
  flex-shrink: 0;
}

.asset--tile .asset__check {
  position: absolute;
  top: var(--coar-spacing-xs);
  right: var(--coar-spacing-xs);
}

.asset--tile {
  position: relative;
}
</style>
```

```ts
builder.layout(layoutRef).tileMinWidth('11rem').gap(8)
```

Rows are still virtualized and measured — tiles in one row share the height of the tallest. Group headings take a full row. `dividers` only apply to list rows; use `gap` for spacing between tiles. Layouts that give up the data order for the visuals (masonry) are deliberately not part of this component. Nested children in the grid open in a band under the row, see [Nesting in the grid layout](#nesting-in-the-grid-layout).

## Nested lists

`children` returns an item's sub-items and the list becomes a tree of lists: every child level is a list of its own — same template, own sorting, own layout — shown under its expanded parent. The exact order is kept on every level.

**Demo — `data-list/demos/NestedDataList.vue`**

```vue
<template>
  <div class="demo">
    <CoarDataList :builder="builder">
      <template #toolbar-right>
        <CoarButton variant="ghost" size="s" @click="api.expandAll()">Expand all</CoarButton>
        <CoarButton variant="ghost" size="s" @click="api.collapseAll()">Collapse all</CoarButton>
      </template>

      <template #item="{ item, depth, hasChildren, expanded }">
        <div class="task" :class="{ 'task--child': depth > 0 }">
          <div class="task__primary">
            <span class="task__title">{{ item.title }}</span>
            <CoarBadge v-if="hasChildren && !expanded" variant="neutral">{{ item.subTasks!.length }}</CoarBadge>
            <span class="task__due">{{ item.due }}</span>
          </div>
          <div v-if="depth === 0" class="task__secondary">{{ item.summary }}</div>
        </div>
      </template>
    </CoarDataList>
    <p class="demo__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarBadge, CoarButton, CoarDataList, useDataList } from '@cocoar/vue-ui';
import type { CoarDataListDropEvent } from '@cocoar/vue-ui';

interface Task {
  id: string;
  title: string;
  due: string;
  summary?: string;
  subTasks?: Task[];
}

const tasks = ref<Task[]>([
  {
    id: 'release',
    title: 'Ship 3.2',
    due: '2026-09-30',
    summary: 'Everything that has to land before the release branch is cut.',
    subTasks: [
      { id: 'release-notes', title: 'Write release notes', due: '2026-09-28' },
      { id: 'release-tag', title: 'Tag and publish', due: '2026-09-30' },
      { id: 'release-qa', title: 'QA pass on the playground', due: '2026-09-25', subTasks: [
        { id: 'qa-touch', title: 'Touch devices', due: '2026-09-24' },
        { id: 'qa-desktop', title: 'Desktop browsers', due: '2026-09-23' },
      ] },
    ],
  },
  {
    id: 'migration',
    title: 'Migrate the todo list',
    due: '2026-10-15',
    summary: 'Replace the hand-rolled list in timetodo with CoarDataList.',
    subTasks: [
      { id: 'migration-nesting', title: 'Nesting parity', due: '2026-10-10' },
      { id: 'migration-dnd', title: 'Drag & drop parity', due: '2026-10-05' },
    ],
  },
  { id: 'docs', title: 'Docs sweep', due: '2026-10-01', summary: 'One pass over every page touched this quarter.' },
]);

const hint = ref('Parents sort by title; sub-tasks keep their manual order — drag them to reorder, drop onto a row to nest.');

const { builder, api } = useDataList<Task>();

function findParentList(list: Task[], parentKey: string | number | null): Task[] | null {
  if (parentKey === null) return list;
  for (const task of list) {
    if (task.id === parentKey) return (task.subTasks ??= []);
    const nested = task.subTasks ? findParentList(task.subTasks, parentKey) : null;
    if (nested) return nested;
  }
  return null;
}

function remove(list: Task[], keys: Set<string | number>): Task[] {
  const kept: Task[] = [];
  for (const task of list) {
    if (keys.has(task.id)) continue;
    if (task.subTasks) task.subTasks = remove(task.subTasks, keys);
    kept.push(task);
  }
  return kept;
}

function applyDrop(event: CoarDataListDropEvent<Task>) {
  const keys = new Set(event.keys);
  tasks.value = remove(tasks.value, keys);
  const target = findParentList(tasks.value, event.parentKey);
  if (!target) return;
  const anchor = event.afterKey === null ? -1 : target.findIndex((task) => task.id === event.afterKey);
  target.splice(anchor + 1, 0, ...event.items);
  hint.value = event.parentKey === null
    ? `Moved ${event.keys.join(', ')} to the top level.`
    : `Moved ${event.keys.join(', ')} under "${event.parentKey}".`;
}

builder
  .items(tasks)
  .itemKey((task) => task.id)
  // Child levels are lists of their own: here they keep their manual order
  // (`sort(null)`), so sub-tasks can be dragged around while parents stay sorted.
  // `.sort({ key: 'due', direction: 'asc' })` would sort them by due date instead.
  .children((task) => task.subTasks, (level) => level.sortOption('due', 'Due date').sort(null))
  .expanded(['release'])
  .sortOption('title', 'Title')
  .sortOption('due', 'Due date')
  .sort({ key: 'title', direction: 'asc' })
  .searchBy(['title'])
  .selection('multiple')
  .reorderable()
  .showSearch()
  .showSort()
  .bordered()
  .height('22rem')
  .ariaLabel('Tasks')
  .onReorder(applyDrop);
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__hint {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.task {
  display: grid;
  gap: var(--coar-spacing-xxs);
  min-width: 0;
}

.task__primary {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.task__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--coar-font-weight-semibold);
}

.task--child .task__title {
  font-weight: var(--coar-font-weight-regular, 400);
}

.task__due {
  font-variant-numeric: tabular-nums;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.task__secondary {
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
```

```ts
builder
  .children((task) => task.subTasks, (level) =>
    level.sortOption('due', 'Due date').sort({ key: 'due', direction: 'asc' }),   // child levels
  )
  .sortOption('title', 'Title').sort({ key: 'title', direction: 'asc' })          // top level
  .expanded(expandedRef)                                                          // v-model:expanded
```

- **Own configuration per level.** The `configure` callback of `.children()` receives a level builder: `sortOptions`, `sortOption`, `sort`, `layout`, `tileMinWidth`. Without it, child levels inherit the top level's sort and layout; `sort(null)` keeps their input order. A list may nest grid children and a grid may nest list rows.
- **Drawing.** The list draws the structure so the template stays free: a chevron gutter (leaves get the same space so text aligns), an indent per level (`nestingIndent`) and, with `nestingStyle: 'lines'` (default), a guide line per ancestor. `hideExpandToggle` removes the chevrons when the template toggles itself via the `toggleExpanded()` slot prop.
- **Search** keeps a parent whose descendants match and opens it while the query is active; a parent matching by itself does not force its children open.
- **Selection** stays flat and key-based; selecting a parent does not select its children.
- **Keyboard:** `→` expands a parent or steps into its first child, `←` collapses or jumps to the parent.
- **Drag & drop** gains a third position: the middle of a row means **inside** — the row becomes the new parent. Drop events carry `parentKey`, and `toIndex` / `afterKey` / `beforeKey` refer to the destination's siblings. `canNest(item, parent)` and `maxDepth` veto nesting; an item can never be dropped into its own subtree. Keyboard moves stay among siblings.

The `api` adds `expand`, `collapse`, `toggleExpanded`, `expandAll`, `collapseAll` and the `expanded` ref.

### Nesting in the grid layout

Tiles never move sideways when something expands. The children of an expanded tile open in a **band under that tile's row**, framed like a folder hanging from its tab: with `tileCards` the tile is drawn as a card whose bottom edge opens into the band. The band's rows use the child level's layout — tiles by default, or list rows with `level.layout('list')` — and can nest further bands.

**Demo — `data-list/demos/NestedGridDataList.vue`**

```vue
<template>
  <div class="demo">
    <div class="demo__bar">
      <span class="demo__label">Children as</span>
      <CoarSegmentedControl v-model="childLayout" :options="layoutOptions" size="s" aria-label="Child layout" />
      <span class="demo__hint">One open folder per row — open another in the same row and the first closes.</span>
    </div>

    <!-- Inner padding gives the elevated band room inside the scroll area. -->
    <CoarDataList :builder="builder" class="files">
      <template #item="{ item, depth, hasChildren, expanded }">
        <div class="folder" :class="{ 'folder--child': depth > 0 }">
          <div class="folder__icon" :class="`folder__icon--${item.kind}`">
            <CoarIcon :name="item.kind === 'folder' ? 'folder' : item.kind === 'image' ? 'image' : 'file-text'" size="l" />
          </div>
          <div class="folder__text">
            <span class="folder__name">{{ item.name }}</span>
            <span class="folder__meta">
              <template v-if="hasChildren">{{ item.children!.length }} items{{ expanded ? '' : ' · open' }}</template>
              <template v-else>{{ item.size }}</template>
            </span>
          </div>
        </div>
      </template>
    </CoarDataList>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataList, CoarIcon, CoarSegmentedControl, useDataList } from '@cocoar/vue-ui';
import type { CoarDataListLayout } from '@cocoar/vue-ui';

interface Entry {
  id: string;
  name: string;
  kind: 'folder' | 'image' | 'document';
  size?: string;
  children?: Entry[];
}

const file = (id: string, name: string, kind: 'image' | 'document', size: string): Entry => ({ id, name, kind, size });

const entries: Entry[] = [
  { id: 'brand', name: 'Brand', kind: 'folder', children: [
    file('brand-logo', 'Logo.svg', 'image', '12 KB'),
    file('brand-guide', 'Guidelines.pdf', 'document', '2.4 MB'),
    file('brand-palette', 'Palette.png', 'image', '310 KB'),
  ] },
  file('cover', 'Cover.jpg', 'image', '1.9 MB'),
  { id: 'release', name: 'Release 3.2', kind: 'folder', children: [
    file('rel-notes', 'Notes.md', 'document', '4 KB'),
    file('rel-shot-1', 'Screenshot 1.png', 'image', '640 KB'),
    file('rel-shot-2', 'Screenshot 2.png', 'image', '655 KB'),
    file('rel-shot-3', 'Screenshot 3.png', 'image', '612 KB'),
    file('rel-shot-4', 'Screenshot 4.png', 'image', '598 KB'),
  ] },
  file('contract', 'Contract.docx', 'document', '96 KB'),
  { id: 'archive', name: 'Archive', kind: 'folder', children: [
    file('arch-2024', '2024.zip', 'document', '48 MB'),
    { id: 'arch-old', name: 'Older', kind: 'folder', children: [file('arch-2023', '2023.zip', 'document', '41 MB')] },
  ] },
  file('invoice', 'Invoice 0917.pdf', 'document', '71 KB'),
  file('sketch', 'Sketch.png', 'image', '220 KB'),
];

const childLayout = ref<CoarDataListLayout>('grid');
const layoutOptions = [
  { value: 'grid' as const, label: 'Tiles', icon: 'layout-grid' },
  { value: 'list' as const, label: 'Rows', icon: 'list' },
];

const { builder } = useDataList<Entry>();
builder
  .items(entries)
  .itemKey((entry) => entry.id)
  .layout('grid')
  .tileMinWidth('10rem')
  .tileCards()
  .bandElevated()
  .gap(8)
  // Child levels are lists of their own — here their layout follows the toggle above.
  .children((entry) => entry.children, (level) => level.layout(childLayout.value).tileMinWidth('9rem'))
  .expanded(['brand'])
  .selection('single')
  .bordered()
  .height('26rem')
  .ariaLabel('Files');

// The level builder captured a value; re-apply when the toggle changes.
import { watch } from 'vue';
watch(childLayout, (layout) => {
  builder.children((entry) => entry.children, (level) => level.layout(layout).tileMinWidth('9rem'));
});
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__bar {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  flex-wrap: wrap;
}

.demo__label,
.demo__hint {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.demo__hint {
  margin-left: auto;
}

.files {
  --coar-data-list-padding: var(--coar-spacing-m);
}

.folder {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
  min-width: 0;
}

.folder--child {
  flex-direction: row;
  align-items: center;
}

.folder__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3.5rem;
  border-radius: var(--coar-radius-xs);
  background: var(--coar-background-neutral-tertiary);
  color: var(--coar-icon-neutral-secondary);
}

.folder--child .folder__icon {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
}

.folder__icon--folder {
  background: var(--coar-background-accent-secondary);
  color: var(--coar-icon-accent-primary);
}

.folder__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.folder__name {
  font-weight: var(--coar-font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}
</style>
```

```ts
builder
  .layout('grid').tileMinWidth('10rem').tileCards().bandElevated()
  .children((entry) => entry.children, (level) => level.layout('list'))   // rows under the tile row
```

The other tiles of the row keep their `gap` to the band; only the expanded card reaches down to it, so card and band read as one frame around parent and children. `bandElevated` lifts that frame with a shadow — give the scroll area some inner room for it with the CSS variable `--coar-data-list-padding` on the list (the demo uses `var(--coar-spacing-m)`).

Because a band hangs from one tab, **one expanded parent per row** is the rule: expanding a second tile in the same row collapses the first (the most recently expanded wins). Parents in different rows may be open at the same time, and the rule re-applies when the column count changes. In the list layout any number of parents may be open.

Reading order: a band follows its parent's whole row, so the children come after the parent's row-mates rather than right after the parent — the one deliberate deviation from the data order, made for readability. Range selection (`Shift`) still follows the data order.

Keyboard in the grid: `↓` moves into the band (keeping the column), `↑` back out, `+` / `-` expand and collapse the focused tile.

## Reordering with drag & drop

Opt in with `reorderable`. Users drag one item or the whole selection; the list shows an insertion line and reports the result — it **never mutates your data**. Lists sharing a `dragGroup` accept each other's items, which is all a board needs: three columns, three lists.

**Demo — `data-list/demos/ReorderDataList.vue`**

```vue
<template>
  <div class="demo">
    <div class="demo__bar">
      <span class="demo__label">Drag engine</span>
      <CoarSegmentedControl v-model="engine" :options="engineOptions" size="s" aria-label="Drag engine" />
      <span class="demo__hint">{{ hint }}</span>
    </div>

    <div class="board">
      <CoarDataList v-for="column in columns" :key="column.id" :builder="column.builder" class="board__column">
        <template #toolbar-left>
          <span class="board__title">{{ column.title }}</span>
          <CoarBadge variant="neutral">{{ column.api.count.value }}</CoarBadge>
        </template>

        <template #item="{ item, dragging }">
          <div class="task" :class="{ 'task--dragging': dragging }">
            <CoarIcon name="grip-vertical" size="s" class="task__grip" />
            <div class="task__text">
              <span class="task__title">{{ item.title }}</span>
              <span class="task__meta">{{ item.owner }} · {{ item.points }} pt</span>
            </div>
          </div>
        </template>

        <template #empty>
          <span class="board__empty">Drop tasks here</span>
        </template>
      </CoarDataList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarBadge, CoarDataList, CoarIcon, CoarSegmentedControl, useDataList } from '@cocoar/vue-ui';
import type { CoarDataListDragEngine, CoarDataListDropEvent, CoarDataListItemsRemoveEvent } from '@cocoar/vue-ui';

interface Task {
  id: number;
  title: string;
  owner: string;
  points: number;
}

const engine = ref<CoarDataListDragEngine>('native');
const engineOptions = [
  { value: 'native' as const, label: 'Native' },
  { value: 'pointer' as const, label: 'Pointer' },
  { value: 'auto' as const, label: 'Auto' },
];
const hint = ref('Drag within a column to reorder, across columns to move. Keyboard: Ctrl+X, arrows, Ctrl+V.');

const people = ['Ada', 'Grace', 'Linus', 'Margaret'];
let nextId = 1;
const makeTasks = (titles: string[]) =>
  titles.map((title, index) => ({ id: nextId++, title, owner: people[(nextId + index) % people.length], points: 1 + ((nextId * 3) % 5) }));

function column(id: string, title: string, initial: Task[]) {
  const items = ref<Task[]>(initial);
  const { builder, api } = useDataList<Task>();

  // The list reports where the block should go; the data is ours to change.
  function insertAt(target: Task[], moved: Task[], event: CoarDataListDropEvent<Task>) {
    const remaining = target.filter((task) => !event.keys.includes(task.id));
    const anchor = event.afterKey === null ? -1 : remaining.findIndex((task) => task.id === event.afterKey);
    remaining.splice(anchor + 1, 0, ...moved);
    return remaining;
  }

  builder
    .items(items)
    .itemKey((task) => task.id)
    .selection('multiple')
    .reorderable()
    .dragEngine(engine)
    .dragGroup('board')
    .dragId(id)
    .density('s')
    .gap(6)
    .bordered()
    .height('18rem')
    .ariaLabel(title)
    .onReorder((event) => {
      items.value = insertAt(items.value, event.items, event);
      hint.value = `Moved ${event.keys.length} task(s) in "${title}".`;
    })
    .onItemsAdd((event) => {
      items.value = insertAt(items.value, event.items, event);
      hint.value = `Moved ${event.keys.length} task(s) from "${event.sourceId}" to "${title}".`;
    })
    .onItemsRemove((event: CoarDataListItemsRemoveEvent<Task>) => {
      items.value = items.value.filter((task) => !event.keys.includes(task.id));
    });

  return { id, title, builder, api };
}

const columns = [
  column('backlog', 'Backlog', makeTasks(['Write release notes', 'Fix login timeout', 'Design empty state', 'Review PR #42', 'Update dependencies'])),
  column('doing', 'In progress', makeTasks(['Migrate todo list', 'Grid layout'])),
  column('done', 'Done', makeTasks(['Gap prop'])),
];
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__bar {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  flex-wrap: wrap;
}

.demo__label,
.demo__hint {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.demo__hint {
  margin-left: auto;
}

.board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--coar-spacing-s);
}

.board__title {
  font-weight: var(--coar-font-weight-semibold);
}

.board__empty {
  color: var(--coar-text-neutral-secondary);
}

.task {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  min-width: 0;
}

.task__grip {
  color: var(--coar-icon-neutral-secondary);
  flex-shrink: 0;
  cursor: grab;
}

.task__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.task__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task__meta {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}
</style>
```

```ts
builder
  .reorderable()
  .dragEngine('auto')            // 'native' | 'pointer' | 'auto'
  .dragGroup('board').dragId('backlog')
  .onReorder((e) => { /* same list: move e.items after e.afterKey */ })
  .onItemsAdd((e) => { /* from another list: insert e.items after e.afterKey */ })
  .onItemsRemove((e) => { /* another list accepted e.items: remove them */ });
```

The drop payload names the **visible neighbours** of the insertion point (`afterKey`, `beforeKey`) plus `toIndex` among the visible items. Neighbours stay correct while a search hides rows, so apply the move relative to `afterKey` rather than by index. With `groupBy`, `group` carries the heading the items were dropped into.

**Rules**

- Reordering is off on a sorted level — the dragged order would be gone after the next re-sort. This is judged **per level**: sorted parents with manually ordered children (`childLevel: { sort: null }`) let you drag the children but not the parents. Drops from other lists are still accepted and append, and dropping **inside** a row still works on a sorted level: re-parenting changes structure, not order.
- `canDrag(item)` vetoes single items; `canDrop(payload)` and `dragAccept` veto incoming drops.
- Keyboard: `Ctrl`+`X` grabs the focused item (or selection), arrows / `Home` / `End` move the insertion line, `Ctrl`+`V` or `Enter` drops, `Escape` cancels.

### Drag engines

| Engine | Input | Interoperable with | Use when |
|---|---|---|---|
| `native` (default) | mouse via HTML5 drag events | `CoarTree`, `CoarListbox`, other HTML5 targets | desktop apps |
| `pointer` | mouse, pen, touch (long-press) | other data lists only | tablets, touch-first views |
| `auto` | picks `pointer` on coarse-pointer devices | — | one setting for both |

The engine is a prop, so an app can decide at runtime (a device check, a user setting). It is the shared `useDragDrop` engine — `CoarListbox` offers the same `dragEngine` prop, so lists and listboxes on the pointer engine can exchange items. **Accepting OS files** (`acceptsFiles` → `files-drop`) is a plain native drop listener and works with either engine.

## Grouping

`groupBy` returns a group name per item; groups render with a heading (customisable via the `group-header` slot) and are ordered by `sortGroups` (`'asc'` by default). Sorting applies inside each group.

**Demo — `data-list/demos/GroupedDataList.vue`**

```vue
<template>
  <CoarDataList
    v-model:search="search"
    :items="contacts"
    :item-key="(contact) => contact.email"
    :group-by="(contact) => contact.team"
    :sort-options="[{ key: 'name', label: 'Name' }]"
    :sort="{ key: 'name', direction: 'asc' }"
    selection="single"
    show-search
    density="s"
    bordered
    height="20rem"
  >
    <template #group-header="{ group, count }">
      <CoarIcon name="users" size="s" />
      <span>{{ group }}</span>
      <CoarBadge variant="neutral">{{ count }}</CoarBadge>
    </template>

    <template #item="{ item, selected }">
      <div class="contact">
        <CoarAvatar :name="item.name" size="s" />
        <div class="contact__text">
          <span class="contact__name">{{ item.name }}</span>
          <span class="contact__email">{{ item.email }}</span>
        </div>
        <CoarIcon v-if="selected" name="check" size="s" class="contact__check" />
      </div>
    </template>
  </CoarDataList>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarAvatar, CoarBadge, CoarDataList, CoarIcon } from '@cocoar/vue-ui';

interface Contact {
  name: string;
  email: string;
  team: string;
}

const teams = ['Platform', 'Design', 'Support', 'Sales'];
const first = ['Ada', 'Grace', 'Linus', 'Margaret', 'Tim', 'Barbara', 'Ken', 'Dennis', 'Radia', 'Vint'];
const last = ['Lovelace', 'Hopper', 'Torvalds', 'Hamilton', 'Berners-Lee', 'Liskov', 'Thompson', 'Ritchie', 'Perlman', 'Cerf'];

const contacts: Contact[] = first.flatMap((givenName, i) =>
  last.slice(0, 3).map((familyName, j) => ({
    name: `${givenName} ${familyName}`,
    email: `${givenName}.${familyName}@example.com`.toLowerCase(),
    team: teams[(i + j) % teams.length],
  })),
);

const search = ref('');
</script>

<style scoped>
.contact {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.contact__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.contact__name {
  font-weight: var(--coar-font-weight-medium);
}

.contact__email {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact__check {
  color: var(--coar-icon-accent-primary);
}
</style>
```

## Large lists

Every list is virtualized — only the rows in and around the viewport exist in the DOM. `item-size` is the **estimate** used before a row has been measured; pick something close to the typical row so the scrollbar does not jump. Twenty thousand rows with mixed heights:

**Demo — `data-list/demos/LargeDataList.vue`**

```vue
<template>
  <div class="demo">
    <CoarDataList
      ref="listRef"
      v-model:search="search"
      :items="entries"
      :item-key="(entry) => entry.id"
      :search-by="['message', 'level']"
      :sort-options="sortOptions"
      selection="single"
      show-search
      show-sort
      dividers
      bordered
      height="20rem"
      :item-size="44"
    >
      <template #toolbar-right>
        <CoarButton variant="secondary" size="s" @click="listRef?.scrollToIndex(entries.length - 1, 'end')">
          Jump to last
        </CoarButton>
      </template>

      <template #item="{ item }">
        <div class="log" :class="`log--${item.level}`">
          <span class="log__time">{{ item.time }}</span>
          <span class="log__level">{{ item.level }}</span>
          <span class="log__message">{{ item.message }}</span>
        </div>
      </template>
    </CoarDataList>
    <p class="demo__hint">{{ entries.length.toLocaleString() }} rows, heights measured per row — only the visible window is in the DOM.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarDataList } from '@cocoar/vue-ui';
import type { CoarDataListSortOption } from '@cocoar/vue-ui';

type Level = 'info' | 'warn' | 'error';

interface LogEntry {
  id: number;
  time: string;
  level: Level;
  message: string;
}

const messages = [
  'Connection established',
  'Retrying request after transient failure; backoff window increased to 4 seconds while the upstream recovers',
  'Cache miss',
  'Certificate expires in 14 days — rotation scheduled by the platform team, no action required from tenants',
  'Queue drained',
];

const entries: LogEntry[] = Array.from({ length: 20000 }, (_, index) => ({
  id: index,
  time: new Date(Date.UTC(2026, 8, 1, 0, 0, index)).toISOString().slice(11, 19),
  level: index % 47 === 0 ? 'error' : index % 11 === 0 ? 'warn' : 'info',
  message: messages[index % messages.length],
}));

const sortOptions: CoarDataListSortOption<LogEntry>[] = [
  { key: 'time', label: 'Time' },
  { key: 'level', label: 'Level' },
];

const search = ref('');
const listRef = ref<InstanceType<typeof CoarDataList> | null>(null);
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__hint {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
}

.log {
  display: grid;
  grid-template-columns: 5rem 3.5rem minmax(0, 1fr);
  gap: var(--coar-spacing-s);
  align-items: baseline;
  font-family: var(--coar-font-family-mono, monospace);
  font-size: var(--coar-body-caption-size);
}

.log__time {
  color: var(--coar-text-neutral-secondary);
  font-variant-numeric: tabular-nums;
}

.log__level {
  text-transform: uppercase;
  font-weight: var(--coar-font-weight-semibold);
}

.log--warn .log__level {
  color: var(--coar-text-warning-primary, #b26a00);
}

.log--error .log__level {
  color: var(--coar-text-error-primary, #c0392b);
}

.log__message {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
```

Group headings scroll with the content (they are not sticky), and browser find-in-page only sees rendered rows.

## Headless: `useDataListModel`

The component is a thin renderer over `useDataListModel`, which owns the pipeline **filter → search → sort → group** and key-based selection. Use it directly when you render something other than a vertical list — cards, a kanban column, a map sidebar — and still want the same search, sort and selection semantics.

**Demo — `data-list/demos/HeadlessDataList.vue`**

```vue
<template>
  <div class="demo">
    <div class="demo__bar">
      <CoarTextInput v-model="search" placeholder="Filter products…" size="s" clearable style="flex: 1" />
      <CoarSegmentedControl v-model="sortKey" :options="sortChoices" size="s" />
      <span class="demo__count">{{ list.count.value }} / {{ list.total.value }}</span>
    </div>

    <div class="cards">
      <button
        v-for="product in list.items.value"
        :key="product.sku"
        type="button"
        class="card"
        :class="{ 'card--selected': list.isSelected(product.sku) }"
        @click="list.select(product.sku, $event.ctrlKey || $event.metaKey ? 'toggle' : 'replace')"
      >
        <span class="card__name">{{ product.name }}</span>
        <span class="card__price">{{ product.price.toFixed(2) }} €</span>
        <span class="card__stock" :class="{ 'card__stock--low': product.stock < 5 }">{{ product.stock }} in stock</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarSegmentedControl, CoarTextInput, useDataListModel } from '@cocoar/vue-ui';
import type { CoarDataListSortOption } from '@cocoar/vue-ui';

interface Product {
  sku: string;
  name: string;
  price: number;
  stock: number;
}

const products: Product[] = [
  { sku: 'A-1', name: 'Anchor bolt M12', price: 1.2, stock: 240 },
  { sku: 'A-2', name: 'Ångström ruler', price: 18.5, stock: 3 },
  { sku: 'B-1', name: 'Brass hinge', price: 4.75, stock: 61 },
  { sku: 'C-1', name: 'Cable tie 200 mm', price: 0.08, stock: 5000 },
  { sku: 'C-2', name: 'Café table leg', price: 32, stock: 2 },
  { sku: 'D-1', name: 'Drill bit set', price: 24.9, stock: 17 },
  { sku: 'E-1', name: 'Étagère bracket', price: 6.3, stock: 0 },
  { sku: 'F-1', name: 'Felt pad 10 pack', price: 2.1, stock: 88 },
];

const sortOptions: CoarDataListSortOption<Product>[] = [
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
  { key: 'stock', label: 'Stock' },
];
const sortChoices = sortOptions.map((option) => ({ value: option.key, label: option.label }));

const search = ref('');
const sortKey = ref('name');

// The same pipeline the component uses — rendered here as a card grid.
const list = useDataListModel<Product>({
  items: products,
  itemKey: (product) => product.sku,
  search,
  searchBy: ['name', 'sku'],
  sort: computed(() => ({ key: sortKey.value, direction: 'asc' as const })),
  sortOptions,
  selectionMode: 'multiple',
});
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.demo__bar {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
}

.demo__count {
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-caption-size);
  white-space: nowrap;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: var(--coar-spacing-s);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xxs);
  padding: var(--coar-spacing-s);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  background: var(--coar-surface-neutral-primary, transparent);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.card--selected {
  border-color: var(--coar-border-accent-primary);
  background: var(--coar-background-accent-tertiary);
}

.card__name {
  font-weight: var(--coar-font-weight-semibold);
}

.card__price {
  font-variant-numeric: tabular-nums;
}

.card__stock {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
}

.card__stock--low {
  color: var(--coar-text-error-primary, #c0392b);
}
</style>
```

```ts
const list = useDataListModel<Product>({
  items: products,                 // array, ref or getter
  itemKey: (p) => p.sku,
  search,                          // Ref<string>
  searchBy: ['name', 'sku'],
  sort: computed(() => ({ key: sortKey.value, direction: 'asc' })),
  sortOptions,
  selectionMode: 'multiple',
});

list.items.value          // visible, ordered
list.select(sku, 'toggle')
list.selectedItems.value
```

## Sorting

`sortOptions` describes the sort menu. Each option compares `item[key]`, or the value returned by `by`, or uses a full `compare` function:

```ts
const sortOptions: CoarDataListSortOption<Ticket>[] = [
  { key: 'title', label: 'Title' },                                   // item.title
  { key: 'due', label: 'Due date', by: (t) => t.dueDate },            // extractor
  { key: 'priority', label: 'Priority', defaultDirection: 'desc' },   // menu picks desc first
  { key: 'smart', label: 'Smart', compare: (a, b) => rank(a) - rank(b) },
];
```

Values are compared with `Intl.Collator` for the active language (`useI18n().language`): numeric strings sort naturally (`item 9` before `item 10`), case and diacritics are ignored, numbers and dates compare as such, and `null`/`undefined` sort last in ascending order. Sorting is stable, so ties keep the input order. The same comparator is exported as `createValueComparator(locale)`.

## Search

The query is split on whitespace into terms; **every term must occur** in the item's search text. Matching is case-insensitive and diacritic-insensitive (`cafe` finds `Café`). The search text comes from `searchBy`:

| `searchBy` | Search text |
|---|---|
| omitted | every own string, number and boolean property, joined |
| `['title', 'customer']` | those properties, joined |
| `(item) => string` | whatever you return |

`search-highlight` marks matches in the rendered rows through the CSS Custom Highlight API (`::highlight(coar-data-list-search)`); browsers without it show no highlight. The utilities `normalizeSearchText`, `searchTerms` and `matchesSearchTerms` are exported for custom filters.

## Keyboard

The scroll area is the single tab stop; a focus marker moves between items.

| Key | Action |
|---|---|
| `↓` / `↑` | Move focus by one row (one tile row in grid layout); selects the focused item unless `Ctrl` is held; `Shift` extends the range |
| `→` / `←` | Tile rows: move focus by one tile. List rows: expand / step into the first child, collapse / jump to the parent |
| `+` / `-` | Expand / collapse the focused item (any layout) |
| `Home` / `End` | First / last item |
| `PageDown` / `PageUp` | Move by one viewport |
| `Space` | Toggle the focused item |
| `Enter` | `item-activate` |
| `Ctrl`/`⌘` + `A` | Select all visible items (multiple) |
| `Ctrl`+`X` → arrows → `Ctrl`+`V` / `Enter` | Grab, move, drop (`reorderable`); `Escape` cancels |

ARIA: `role="listbox"` with `option` children when selection is enabled, `role="list"` / `listitem` otherwise.

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `builder` | `DataListBuilder<T>` | — | Fluent builder from `useDataList()`. When set, the other config props and the `v-model`s are ignored |
| `items` | `T[]` | `[]` | Records to display |
| `itemKey` | `(item: T) => string \| number` | — | Stable identity (required in props-mode). Must be unique across all levels — selection, focus, measured heights and drag & drop are stored under it; duplicates warn in DEV |
| `searchBy` | `(keyof T)[] \| (item: T) => string` | all primitive props | Text the search matches against |
| `filter` | `(item: T) => boolean` | — | Predicate applied before the search |
| `sortOptions` | `CoarDataListSortOption<T>[]` | `[]` | Sort menu entries |
| `groupBy` | `(item: T) => string` | — | Group items under headings |
| `sortGroups` | `'asc' \| 'desc' \| 'none' \| (a, b) => number` | `'asc'` | Group order |
| `selection` | `'none' \| 'single' \| 'multiple'` | `'none'` | Selection behaviour |
| `showSearch` | `boolean` | `false` | Search input in the toolbar |
| `showSort` | `boolean` | `false` | Sort control in the toolbar (needs `sortOptions`) |
| `searchPlaceholder` | `string` | `'Search…'` | Placeholder of the search input |
| `searchHighlight` | `boolean` | `false` | Highlight matches in rendered rows |
| `layout` | `'list' \| 'grid'` | `'list'` | Rows, or tiles wrapping in data order |
| `tileMinWidth` | `number \| string` | `'14rem'` | Minimum tile width in grid layout; decides the column count |
| `density` | `'s' \| 'm' \| 'l'` | `'m'` | Row padding |
| `dividers` | `boolean` | `false` | Line between rows (list layout) |
| `gap` | `number \| string` | — | Space between rows (px number or CSS length); use this, not a template margin |
| `bordered` | `boolean` | `false` | Border around the list |
| `elevated` | `boolean` | `false` | Elevation shadow |
| `height` | `string` | fills parent | Fixed height of the scroll area |
| `itemSize` | `number` | `56` | Estimated row height in px (rows are measured) |
| `overscan` | `number` | `5` | Rows rendered beyond the viewport |
| `emptyText` | `string` | `'No items'` | Text when nothing is visible |
| `ariaLabel` | `string` | — | Accessible name of the list |
| `disabled` | `boolean` | `false` | Blocks interaction |
| `reorderable` | `boolean` | `false` | Drag & drop reordering and accepting drops |
| `dragEngine` | `'native' \| 'pointer' \| 'auto'` | `'native'` | How drags are tracked (see [Drag engines](#drag-engines)) |
| `canDrag` | `(item: T) => boolean` | — | Per-item drag veto |
| `dragGroup` | `string` | — | Lists sharing a group accept each other's items |
| `dragId` | `string` | — | Reported to targets as `sourceId` |
| `dragAccept` | `string[]` | — | Whitelist of source `dragId`s |
| `canDrop` | `(payload) => boolean` | — | Runtime veto for incoming drops |
| `acceptsFiles` | `boolean` | `false` | Accept OS file drops (`files-drop`) |
| `children` | `(item: T) => T[] \| null \| undefined` | — | Nested lists |
| `childLevel` | `{ sortOptions?, sort?, layout?, tileMinWidth? }` | inherits | Sorting and layout of the child levels |
| `tileCards` | `boolean` | `false` | Grid: draw tiles as cards; an expanded card opens into its band |
| `bandElevated` | `boolean` | `false` | Lift an expanded card and its band with a shadow |
| `unstyledItems` | `boolean` | `false` | The template owns the whole box; the list draws no item chrome |
| `maxDepth` | `number` | unlimited | Deepest level shown, 0 = top level only |
| `nestingIndent` | `number \| string` | `'1.5rem'` | Indent per level |
| `nestingStyle` | `'lines' \| 'none'` | `'lines'` | Guide lines per level and band frames, or indent only |
| `hideExpandToggle` | `boolean` | `false` | No built-in chevrons |
| `canNest` | `(item: T, parent: T) => boolean` | — | Veto for dropping inside a row |

### Models

| Model | Type | Description |
|-------|------|-------------|
| `v-model:search` | `string` | Search query |
| `v-model:sort` | `CoarDataListSort \| null` | `{ key, direction }` of the active sort option |
| `v-model:selected` | `(string \| number)[]` | Selected item keys, in selection order |
| `v-model:expanded` | `(string \| number)[]` | Keys whose children are shown |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `item-click` | `CoarDataListItemEvent<T>` | Pointer click on an item (after selection changed) |
| `item-dblclick` | `CoarDataListItemEvent<T>` | Double-click |
| `item-contextmenu` | `CoarDataListItemEvent<T>` | Right-click / long-press; item is selected first |
| `item-activate` | `CoarDataListItemEvent<T>` | Double-click or `Enter` |
| `reorder` | `CoarDataListDropEvent<T>` | Items dropped inside this list |
| `items-add` | `CoarDataListDropEvent<T>` | Items from another list dropped here |
| `items-remove` | `CoarDataListItemsRemoveEvent<T>` | Another list accepted items of this one |
| `files-drop` | `CoarDataListFilesDropEvent<T>` | OS files dropped (`acceptsFiles`) |
| `drag-start` / `drag-end` | `T[]` / `{ items, dropped }` | Drag lifecycle |

`CoarDataListItemEvent<T>` is `{ item, itemKey, index, event }`. `CoarDataListDropEvent<T>` is `{ items, keys, toIndex, afterKey, beforeKey, group, parentKey, fromSelf, sourceId, sourceDragGroup }` — `toIndex` and the neighbour keys refer to the siblings under `parentKey`.

### Slots

| Slot | Props | Description |
|------|-------|-------------|
| `item` | `{ item, index, itemKey, selected, focused, dragging, depth, hasChildren, expanded, select, toggle, toggleExpanded }` | Row content |
| `group-header` | `{ group, count, items }` | Group heading |
| `empty` | — | Shown when no item is visible |
| `toolbar-left` / `toolbar-right` | — | Extra toolbar content beside search and sort |

### Exposed

| Member | Description |
|--------|-------------|
| `list` | The `useDataListModel` instance (visible items, selection, lookups) |
| `scrollToKey(key, align?)` | Scroll an item into view |
| `scrollToIndex(index, align?)` | Scroll the visible item at `index` into view |
| `focusKey(key)` | Move the focus marker and scroll to it |
| `invalidateMeasurements(key?)` | Forget measured heights (all or one) after a layout change the list cannot observe |

### `useDataListModel(options)`

| Option | Type | Description |
|--------|------|-------------|
| `items` | `MaybeRefOrGetter<T[]>` | Source records |
| `itemKey` | `(item: T) => key` | Identity |
| `search` | `MaybeRefOrGetter<string>` | Query |
| `searchBy` | `MaybeRef<...>` | Field list or extractor (plain value or ref) |
| `filter` | `MaybeRef<(item: T) => boolean>` | Predicate |
| `sort` | `MaybeRefOrGetter<CoarDataListSort \| null>` | Active sort |
| `sortOptions` | `MaybeRefOrGetter<CoarDataListSortOption<T>[]>` | Sort definitions |
| `groupBy` | `MaybeRef<(item: T) => string>` | Grouping |
| `sortGroups` | `MaybeRef<CoarDataListSortGroups>` | Group order |
| `locale` | `MaybeRefOrGetter<string>` | Collation locale (default: runtime) |
| `selectionMode` | `MaybeRefOrGetter<'none' \| 'single' \| 'multiple'>` | Default `'multiple'` |
| `selected` | `Ref<key[]>` | External selection model |

Returns `items`, `entries` (with group headings), `total`, `count`, `keyOf`, `itemByKey`, `indexOfKey`, `entryIndexOfKey`, `selected`, `selectedItems`, `anchor`, `isSelected`, `select(key, mode?)`, `selectAll()`, `clear()`.

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.dataList.search` | `'Search…'` | Placeholder of the toolbar search input |
| `coar.ui.dataList.sortBy` | `'Sort by'` | Placeholder of the sort select |
| `coar.ui.dataList.ascending` | `'Ascending'` | Label of the sort-direction button |
| `coar.ui.dataList.descending` | `'Descending'` | Label of the sort-direction button |
| `coar.ui.dataList.empty` | `'No items'` | Empty state when no item is visible |
| `coar.ui.dataList.expand` | `'Expand'` | Chevron label of a collapsed parent |
| `coar.ui.dataList.collapse` | `'Collapse'` | Chevron label of an expanded parent |

## Grid or list?

| | `CoarDataGrid` | `CoarDataList` |
|---|---|---|
| Layout | columns, resizable, persisted | free template per record |
| Best on | wide screens, many comparable fields | narrow screens, records with a natural "headline + details" shape |
| Sorting | column headers | sort menu (`sortOptions`) |
| Editing, tree data, column picker | yes | no |
| Dependencies | AG Grid | none |

Both take the same data; apps that switch between them (a view-mode toggle) can share the search text and the sort definitions.
