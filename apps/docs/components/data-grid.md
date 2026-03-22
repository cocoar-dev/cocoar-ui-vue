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

### CoarGridBuilder Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `.columns(defs)` | `ColumnDefFn<T>[]` | Define column configuration |
| `.rowData(data)` | `T[]` | Set static row data |
| `.rowDataRef(ref)` | `Ref<T[]>` | Bind reactive row data |
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
| `.date(field, format?)` | `keyof T, string?` | Date cell renderer |
| `.number(field)` | `keyof T` | Number cell renderer |
| `.tag(field, config)` | `keyof T, TagConfig` | Tag cell renderer |
| `.icon(field, config?)` | `keyof T, IconConfig?` | Icon cell renderer |
