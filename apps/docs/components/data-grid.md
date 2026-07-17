---
description: "CoarDataGrid — AG Grid-based data grid with fluent builder API, locale-aware column types, wrapper-column decorations and Cocoar theming with dark mode."
---

# Data Grid

A powerful data grid built on AG Grid with Cocoar theming. Configure columns, sorting, selection, and cell renderers through a fluent builder API — no raw AG Grid config needed.

::: info Separate Package
The Data Grid depends on AG Grid. Install it separately:
```bash
pnpm add @cocoar/vue-data-grid ag-grid-community ag-grid-vue3
```
:::

```ts
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
```

## Basic Usage

Define columns with `.field()`, `.header()`, and `.flex()` / `.width()`. Pass row data with `.rowData()`.

<preview path="./data-grid/demos/GridBasic.vue" />

## Appearance

Add a border or elevation shadow to the grid. Toggle the checkboxes to see the effect.

<preview path="./data-grid/demos/GridAppearance.vue" />

### Dark mode

Dark styles ship with the package. The theme maps AG Grid's variables onto the semantic `--coar-*` tokens (with hardcoded fallbacks), so the grid follows your design-system theme in both modes. Dark values activate via the `.dark-mode` class — on `<html>` or any ancestor (the Cocoar convention, same as `@cocoar/vue-ui`), or directly on the grid element. `[data-theme="dark"]` is **not** a trigger here.

## Column Types

Built-in renderers for dates, numbers, currency, tags, and icons — no custom cell components needed. Date, number, and currency columns are locale-aware and update reactively when the locale changes. Try the locale switcher in the nav bar.

<preview path="./data-grid/demos/GridColumnTypes.vue" />

| Method | Description |
|--------|-------------|
| `.field(name)` | Plain text column |
| `.date(field, config?)` | Locale-aware date display |
| `.number(field, config?)` | Locale-aware number display |
| `.currency(field, config?)` | Locale-aware currency display |
| `.tag(field, config)` | Renders a `CoarTag` with variant mapping or custom colors |
| `.icon(field, config?)` | Renders a `CoarIcon` |
| `.wrap(inner)` | Wraps any column builder with left/right decoration slots |

## Wrapper Column

Decorate any column with left and/or right slots — perfect for status indicators, action icons, or inline badges. The inner column keeps all its behavior (sort, filter, edit, `valueFormatter`, custom `cellRenderer`, …); only rendering gets an extra frame around it.

<preview path="./data-grid/demos/GridWrapperColumn.vue" />

Each slot accepts one of three shapes:

```ts
// 1) Icon shorthand
.left({
  icon: (row) => row.starred ? 'star' : 'star-outline',
  color: (row) => row.starred ? '#f5a623' : '#ccc',
  tooltip: (row) => row.starred ? 'Unstar' : 'Star',
  onClick: (row, event) => toggleStar(row),
  show: (row) => row.visible,            // optional v-if gate
})

// 2) Any Vue component
// The component automatically receives `row: TData` as a prop —
// use `params(row)` to add or override props.
.right({
  component: CoarBadge,
  params: (row) => ({ content: String(row.unread) }),
  show: (row) => row.unread > 0,
})

// 3) Plain text
.right({ text: (row) => row.suffix })
```

### Multiple items per slot

Pass an array to stack several items in the same slot — each with its own `show()` gate, `onClick`, and tooltip. Items are rendered in order with a small gap.

```ts
.right([
  { icon: 'circle-alert',   color: '#dc2626', show: (r) => r.isCritical },
  { icon: 'message-circle', color: '#3b82f6', show: (r) => r.awaitingFeedback },
  { component: PriorityIndicator },  // receives `row` automatically
])
```

### Row-aware components

Every component slot automatically receives `row: TData` as a prop. This lets a single component decide what to render — icon, tag, or nothing — based on the full row:

```ts
const PriorityIndicator = defineComponent({
  props: { row: { type: Object as () => Message, required: true } },
  setup(props) {
    return () => {
      if (props.row.priority === 'high') return h(CoarTag, { variant: 'error' }, () => 'HIGH');
      if (props.row.priority === 'low')  return h(CoarIcon, { name: 'arrow-down' });
      return null;
    };
  },
});
```

Slot `onClick` handlers automatically call `event.stopPropagation()` so they don't trigger row-click or cell-click events on the grid.

## Row Selection

Toggle between single-click and multi-select with checkboxes.

<preview path="./data-grid/demos/GridSelection.vue" />

## Reactive Data

Bind a `ref` with `.rowDataRef()` and the grid updates automatically when your data changes.

<preview path="./data-grid/demos/GridReactive.vue" />

## Search (Quick Filter)

Enable the built-in search bar with `show-search`. It wires the search input to the builder's quick filter automatically.

<preview path="./data-grid/demos/GridSearchPanel.vue" />

### Custom Layout

Use `CoarDataGridSearch` and `CoarDataGrid` separately for full layout control. Connect them via `builder.quickFilterText(ref)`.

<preview path="./data-grid/demos/GridSearchCustom.vue" />

### Per-Column Configuration

Control how each column participates in quick filtering:

```ts
builder.columns([
  // Default: searches by String(value)
  (col) => col.field('name').header('Name'),

  // Custom text extraction (e.g., for arrays or objects)
  (col) => col.field('tags').quickFilter((tags) => tags.map(t => t.label).join(' ')),

  // Exclude from search
  (col) => col.field('id').quickFilter(false),
]);
```

### Custom Filter Function

Override the default per-column matching with a fully custom filter:

```ts
builder.quickFilterFn((searchValue, data) => {
  // searchValue is already lowercased and trimmed
  return data.name.toLowerCase().includes(searchValue)
    || data.email.toLowerCase().includes(searchValue);
});
```

### Search Highlighting

Enable text highlighting in grid cells using the CSS Custom Highlight API. Matching text is underlined without modifying the DOM.

```ts
builder
  .quickFilterText(searchRef)
  .searchHighlight()
```

The highlight style can be customized via CSS:

```css
::highlight(coar-search) {
  text-decoration: underline;
  text-decoration-color: #0066cc;
}
```

## I18n Headers

Column headers support runtime language switching via `@cocoar/vue-localization`. Pass a fallback text and an optional translation key:

```ts
builder.columns([
  // Static header
  (col) => col.field('name').header('Name'),

  // With i18n — falls back to 'Name' if no translation found
  (col) => col.field('name').header('Name', 'todo.grid.header.title'),
])
```

If `@cocoar/vue-localization` is not installed, the fallback text is always shown. Headers update automatically when the language changes at runtime.

## Auto Size

Control how columns are sized initially:

```ts
// Columns fill the grid width (most common)
builder.autoSize('fitGridWidth')

// Columns fit their content
builder.autoSize('fitCellContents')
```

## Tree Drag & Drop

Move rows between parents via drag & drop. Use `.rowDrag()` on the tree column, `.rowDragHighlight()` for visual feedback, and `.onRowDragEnd()` to handle the reparenting.

<preview path="./data-grid/demos/GridTreeDrag.vue" />

```ts
builder
  .treeData({ children: (r) => r.children ?? [], rowId: (r) => r.id })
  .openRows(openRows)
  .rowDragHighlight()
  .onRowDragEnd((event) => {
    const dragged = event.node.data;
    const target = event.overNode?.data;
    if (!dragged || !target) return;
    // API call or store mutation to reparent
    api.moveInto(dragged.id, target.id);
  });
```

## Tree Data

Display hierarchical data with expand/collapse. Use `treeData()` with nested children arrays and `openRows()` to control expansion. The `tree()` column type renders indentation, chevron toggle, and child count.

Search automatically expands matching branches — a parent stays visible when any descendant matches.

<preview path="./data-grid/demos/GridTreeData.vue" />

```ts
builder
  .treeData({
    children: (row) => row.children ?? [],
    rowId: (row) => row.id,
  })
  .openRows(openRowsRef)
  .columns([
    (col) => col.tree('name').header('Name').flex(1),  // tree column
    (col) => col.field('size').header('Size').width(100),
  ])
```

## Row Drag & Drop

Reorder rows via drag & drop. Use `.rowDrag()` on a column to show the drag handle, and `.rowDragManaged()` on the builder. Dragging is automatically disabled when a column sort is active.

<preview path="./data-grid/demos/GridRowDrag.vue" />

```ts
builder
  .columns([
    (col) => col.field('name').rowDrag().flex(1),
  ])
  .rowDragManaged()
  .onRowDragEnd(() => {
    const newOrder = builder.getDisplayedRowData();
    store.updateOrder(newOrder);  // persist new order
  });
```

## Sorting

Make columns sortable and set a default sort order.

```ts
const builder = CoarGridBuilder.create<Row>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).sortable(),
    (col) => col.number('salary').header('Salary').width(120).sortable(),
  ])
  .rowData(data)
  .defaultSort('name', 'asc');
```

## Column Persistence

Persist column widths, order, visibility, and sort in IndexedDB with `.persistColumnState(key)`.

**Width buckets:** The grid container width is rounded to buckets (default: 100px). Each bucket gets its own saved column layout, so different container sizes — switching monitors, collapsing a sidebar — each keep their own column widths. When no exact bucket exists, the nearest saved state is applied.

**Live sync:** Multiple grids with the same key synchronize column changes instantly. Resize, reorder, or hide a column in one grid and all others update immediately. Useful for comparison views with different filters on the same data structure.

Try it below — resize a column in Team A and watch Team B follow.

<preview path="./data-grid/demos/GridPersistence.vue" />

```ts
const builder = CoarGridBuilder.create<User>()
  .persistColumnState('my-users-grid')
  .columns([...])

// Optional: custom bucket size and debounce
.persistColumnState('my-grid', { bucketSize: 200, debounceMs: 1000 })

// Reset current bucket
builder.resetPersistedState()

// Reset all buckets
builder.resetPersistedStates()
```

### Cleanup

Persisted entries are timestamped on every read and write. Call `cleanupColumnStates()` once at application startup to remove stale entries and prevent unbounded growth:

```ts
// main.ts
import { cleanupColumnStates } from '@cocoar/vue-data-grid';

cleanupColumnStates(180); // Remove entries older than 6 months
```

## API

### CoarDataGrid Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `builder` | `CoarGridBuilder<T>` | — | Grid configuration builder (required) |
| `theme` | `Theme` | `cocoarTheme` | AG Grid theme override |
| `showSearch` | `boolean` | `false` | Show the search bar in the toolbar |
| `searchPlaceholder` | `string` | `'Search...'` | Placeholder for the search input |
| `searchSize` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Search input size |
| `search` | `string` | `''` | Search text (`v-model:search`) |
| `bordered` | `boolean` | `false` | Show a border around the grid |
| `elevated` | `boolean` | `false` | Add elevation shadow |

### CoarDataGrid Slots

| Slot | Description |
|------|-------------|
| `toolbar-left` | Content on the left side of the toolbar (e.g., title, icon) |
| `toolbar-right` | Content on the right side of the toolbar (e.g., buttons, actions) |

The toolbar appears automatically when `showSearch` is enabled or any `toolbar-*` slot is used. The search input fills available space (`flex: 1`). When search is disabled, a spacer pushes `toolbar-right` to the far right.

```vue
<!-- Search + actions -->
<CoarDataGrid :builder="builder" show-search bordered>
  <template #toolbar-left>
    <span style="font-weight: 600;">Users</span>
  </template>
  <template #toolbar-right>
    <CoarButton size="s">Add User</CoarButton>
  </template>
</CoarDataGrid>

<!-- Only toolbar actions, no search -->
<CoarDataGrid :builder="builder">
  <template #toolbar-right>
    <CoarButton size="s">Export</CoarButton>
  </template>
</CoarDataGrid>
```

### CoarGridBuilder Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `.columns(defs)` | `ColumnDefFn<T>[]` | Define column configuration |
| `.rowData(data)` | `T[]` | Set static row data |
| `.rowDataRef(ref)` | `Ref<T[]>` | Bind reactive row data |
| `.quickFilterText(ref)` | `Ref<string>` | Bind search text for quick filtering |
| `.quickFilterFn(fn)` | `(search, data) => boolean` | Custom filter function override |
| `.searchHighlight()` | — | Highlight matching text via CSS Custom Highlight API |
| `.rowDragManaged()` | — | Enable managed drag & drop reordering |
| `.onRowDragEnd(fn)` | `(event) => void` | Handle drag end, persist new order |
| `.rowDragHighlight(opts?)` | `{ canDrop? }` | Visual drop target feedback with validation |
| `.getDisplayedRowData()` | — | Get row data in current display order |
| `.getTreeMeta(rowId)` | `string` | Get tree node depth, children info |
| `.treeData(config)` | `TreeDataConfig<T>` | Enable tree mode with nested children |
| `.openRows(ref)` | `Ref<string[]>` | Reactive ref of expanded row IDs |
| `.autoSize(strategy)` | `'fitGridWidth' \| 'fitCellContents'` | Column auto-sizing strategy |
| `.rowSelection(mode, opts?)` | `'single' \| 'multiple'` | Enable row selection |
| `.defaultSort(field, dir)` | `string, 'asc' \| 'desc'` | Set default sort column |
| `.persistColumnState(key, opts?)` | `string, ColumnPersistenceOptions?` | Persist column state in IndexedDB with width-based buckets |
| `.resetPersistedState(bucket?)` | `number?` | Reset persisted state for a specific bucket (defaults to current) |
| `.resetPersistedStates()` | — | Reset all persisted column states (all buckets) |
| `.rowClassRules(rules)` | `RowClassRules<T>` | Conditional row CSS classes |

### Standalone Functions

| Function | Parameters | Description |
|----------|-----------|-------------|
| `cleanupColumnStates(maxAgeDays)` | `number` | Remove persisted column states older than `maxAgeDays`. Call at app startup. |

### CoarGridColumnBuilder Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `.field(name)` | `keyof T` | Set column data field |
| `.header(text, i18nKey?)` | `string, string?` | Set header text with optional i18n key |
| `.flex(value)` | `number` | Flexible column width |
| `.width(px)` | `number` | Fixed column width |
| `.fixedWidth(px)` | `number` | Non-resizable fixed width |
| `.sortable()` | — | Enable column sorting |
| `.quickFilter(fn)` | `boolean \| (value, data) => string` | Configure quick filter for column |
| `.date(field, config?)` | `keyof T, DateCellRendererConfig?` | Locale-aware date cell renderer |
| `.number(field, config?)` | `keyof T, NumberCellRendererConfig?` | Locale-aware number cell renderer |
| `.currency(field, config?)` | `keyof T, CurrencyCellRendererConfig?` | Locale-aware currency cell renderer |
| `.tag(field, config)` | `keyof T, TagConfig` | Tag cell renderer |
| `.icon(field, config?)` | `keyof T, IconConfig?` | Icon cell renderer |
| `.tree(field, config?)` | `keyof T, TreeCellRendererConfig?` | Tree column with expand/collapse |
