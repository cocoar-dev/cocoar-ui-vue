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

## Column Types

Built-in renderers for dates, numbers, tags, and icons — no custom cell components needed.

<preview path="./data-grid/demos/GridColumnTypes.vue" />

| Method | Description |
|--------|-------------|
| `.field(name)` | Plain text column |
| `.date(field, format?)` | Formatted date display |
| `.number(field)` | Numeric formatting |
| `.tag(field, config)` | Renders a `CoarTag` with variant mapping |
| `.icon(field, config?)` | Renders a `CoarIcon` |

## Row Selection

Toggle between single-click and multi-select with checkboxes.

<preview path="./data-grid/demos/GridSelection.vue" />

## Reactive Data

Bind a `ref` with `.rowDataRef()` and the grid updates automatically when your data changes.

<preview path="./data-grid/demos/GridReactive.vue" />

## Search (Quick Filter)

Add a search bar above the grid with `CoarDataGridPanel`. It wires search input to the builder's quick filter automatically.

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

### CoarDataGridPanel Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `builder` | `CoarGridBuilder<T>` | — | Grid configuration builder (required) |
| `theme` | `Theme` | `cocoarTheme` | AG Grid theme override |
| `search` | `string` | `''` | Search text (v-model:search) |
| `searchPlaceholder` | `string` | `'Search...'` | Placeholder for search input |
| `searchSize` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Search input size |

### CoarDataGridPanel Slots

| Slot | Description |
|------|-------------|
| `actions` | Content placed to the right of the search input (buttons, checkboxes, etc.) |

### CoarDataGridSearch Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | Search text (v-model) |
| `placeholder` | `string` | `'Search...'` | Placeholder text |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |

### CoarDataGridSearch Slots

| Slot | Description |
|------|-------------|
| `default` | Content placed to the right of the search input |

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
| `.rowSelection(mode, opts?)` | `'single' \| 'multiple'` | Enable row selection |
| `.defaultSort(field, dir)` | `string, 'asc' \| 'desc'` | Set default sort column |
| `.rowClassRules(rules)` | `RowClassRules<T>` | Conditional row CSS classes |

### CoarGridColumnBuilder Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `.field(name)` | `keyof T` | Set column data field |
| `.header(text)` | `string` | Set column header text |
| `.flex(value)` | `number` | Flexible column width |
| `.width(px)` | `number` | Fixed column width |
| `.fixedWidth(px)` | `number` | Non-resizable fixed width |
| `.sortable()` | — | Enable column sorting |
| `.quickFilter(fn)` | `boolean \| (value, data) => string` | Configure quick filter for column |
| `.date(field, format?)` | `keyof T, string?` | Date cell renderer |
| `.number(field)` | `keyof T` | Number cell renderer |
| `.tag(field, config)` | `keyof T, TagConfig` | Tag cell renderer |
| `.icon(field, config?)` | `keyof T, IconConfig?` | Icon cell renderer |
| `.tree(field, config?)` | `keyof T, TreeCellRendererConfig?` | Tree column with expand/collapse |
