---
description: "CoarDataList — virtualized, searchable, sortable record list with a free multi-line item template, key-based selection, grouping and a headless useDataListModel composable"
---

# Data List

A list of records where **you own the row layout**. Where [`CoarDataGrid`](/components/data-grid) squeezes every field into a column, `CoarDataList` gives each record a free-form, multi-line template — the right tool when a notebook screen would otherwise show a dozen tiny columns and a horizontal scrollbar. It brings the parts a hand-rolled list keeps reinventing: virtual scrolling with measured row heights, search, a sort menu, keyboard and pointer selection, grouping, and an empty state.

```ts
import { CoarDataList, useDataList, useDataListModel } from '@cocoar/vue-ui';
import type { CoarDataListSortOption, CoarDataListSort, CoarDataListKey } from '@cocoar/vue-ui';
```

Two ways to configure it: **props + `v-model`** for simple lists, or the **fluent builder** from `useDataList()` — the same pattern as `CoarGridBuilder` and `useTree()` — which also gives you declarative context menus and an imperative `api`.

## Builder API

`useDataList<T>()` returns `{ builder, api }`. Configure data, behaviour, appearance, handlers and context menus in one chain; the template is just `<CoarDataList :builder>` plus your item slot. The list renders the `<CoarContextMenu>` itself.

<preview path="./data-list/demos/BuilderDataList.vue" />

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

<preview path="./data-list/demos/BasicDataList.vue" />

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

- The list positions rows absolutely and **measures their rendered height**, so the template may be one line, three lines, or vary per record. Keep `min-width: 0` on flex/grid children that should truncate.
- Space between rows comes from the `gap` prop. Margins in the template are **not** part of the measured height and would make rows overlap; padding inside the template is fine.
- Use **container queries** (`container-type: inline-size` on the template root) rather than viewport media queries. The same template then adapts when the list sits in a narrow side panel.
- The slot receives `selected`, `focused`, `select()` and `toggle()`. Render a checkbox bound to `toggle()` when touch users should be able to multi-select without modifier keys.
- Rows have no built-in actions column. Put a "…" button in the template or handle `item-contextmenu`.

## Selection and context menu

`selection` is `'none'` (default), `'single'` or `'multiple'`. Click replaces, `Ctrl`/`⌘`-click toggles, `Shift`-click selects a range; the keyboard mirrors this (see [Keyboard](#keyboard)). Right-clicking an unselected item selects it first, so a context menu always acts on the item under the pointer.

<preview path="./data-list/demos/SelectionDataList.vue" />

## Grid layout

`layout="grid"` flows the same records into tiles: as many per row as fit `tileMinWidth`, always in exact data order — a tile grid is a list that wraps. Search, sort, grouping, selection, context menus and the `api` work identically, so a list/grid toggle is one setter or prop. The item slot is unchanged; give the template a second shape for tiles as the demo does.

<preview path="./data-list/demos/GridDataList.vue" />

```ts
builder.layout(layoutRef).tileMinWidth('11rem').gap(8)
```

Rows are still virtualized and measured — tiles in one row share the height of the tallest. Group headings take a full row. `dividers` only apply to the list layout; use `gap` for spacing between tiles. Layouts that give up the data order for the visuals (masonry) are deliberately not part of this component.

## Grouping

`groupBy` returns a group name per item; groups render with a heading (customisable via the `group-header` slot) and are ordered by `sortGroups` (`'asc'` by default). Sorting applies inside each group.

<preview path="./data-list/demos/GroupedDataList.vue" />

## Large lists

Every list is virtualized — only the rows in and around the viewport exist in the DOM. `item-size` is the **estimate** used before a row has been measured; pick something close to the typical row so the scrollbar does not jump. Twenty thousand rows with mixed heights:

<preview path="./data-list/demos/LargeDataList.vue" />

Group headings scroll with the content (they are not sticky), and browser find-in-page only sees rendered rows.

## Headless: `useDataListModel`

The component is a thin renderer over `useDataListModel`, which owns the pipeline **filter → search → sort → group** and key-based selection. Use it directly when you render something other than a vertical list — cards, a kanban column, a map sidebar — and still want the same search, sort and selection semantics.

<preview path="./data-list/demos/HeadlessDataList.vue" />

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
| `→` / `←` | Grid layout: move focus by one tile |
| `Home` / `End` | First / last item |
| `PageDown` / `PageUp` | Move by one viewport |
| `Space` | Toggle the focused item |
| `Enter` | `item-activate` |
| `Ctrl`/`⌘` + `A` | Select all visible items (multiple) |

ARIA: `role="listbox"` with `option` children when selection is enabled, `role="list"` / `listitem` otherwise.

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `builder` | `DataListBuilder<T>` | — | Fluent builder from `useDataList()`. When set, the other config props and the `v-model`s are ignored |
| `items` | `T[]` | `[]` | Records to display |
| `itemKey` | `(item: T) => string \| number` | — | Stable identity (required in props-mode) |
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

### Models

| Model | Type | Description |
|-------|------|-------------|
| `v-model:search` | `string` | Search query |
| `v-model:sort` | `CoarDataListSort \| null` | `{ key, direction }` of the active sort option |
| `v-model:selected` | `(string \| number)[]` | Selected item keys, in selection order |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `item-click` | `CoarDataListItemEvent<T>` | Pointer click on an item (after selection changed) |
| `item-dblclick` | `CoarDataListItemEvent<T>` | Double-click |
| `item-contextmenu` | `CoarDataListItemEvent<T>` | Right-click / long-press; item is selected first |
| `item-activate` | `CoarDataListItemEvent<T>` | Double-click or `Enter` |

`CoarDataListItemEvent<T>` is `{ item, itemKey, index, event }`.

### Slots

| Slot | Props | Description |
|------|-------|-------------|
| `item` | `{ item, index, itemKey, selected, focused, select, toggle }` | Row content |
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

## Grid or list?

| | `CoarDataGrid` | `CoarDataList` |
|---|---|---|
| Layout | columns, resizable, persisted | free template per record |
| Best on | wide screens, many comparable fields | narrow screens, records with a natural "headline + details" shape |
| Sorting | column headers | sort menu (`sortOptions`) |
| Editing, tree data, column picker | yes | no |
| Dependencies | AG Grid | none |

Both take the same data; apps that switch between them (a view-mode toggle) can share the search text and the sort definitions.
