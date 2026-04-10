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
| `.rowClassRules(rules)` | `RowClassRules<T>` | Conditional row CSS classes |

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
