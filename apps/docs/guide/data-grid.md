# Data Grid

A powerful data grid component built on AG Grid with Cocoar theming. Provides a fluent builder API for column configuration, built-in cell renderers for tags, icons, and dates, and reactive data binding.

::: info Separate Package
The Data Grid is in its own package because it depends on AG Grid. Install it separately:
```bash
pnpm add @cocoar/vue-data-grid ag-grid-community ag-grid-vue3
```
:::

```ts
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
```

## Basic Usage

Create a grid with the fluent builder API. Define columns with `.field()`, `.header()`, `.flex()`, and `.width()`.

```vue
<template>
  <div style="height: 400px;">
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface User {
  name: string;
  email: string;
  role: string;
}

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
  ])
  .rowData([
    { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
    { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
    { name: 'Carol Williams', email: 'carol@example.com', role: 'Manager' },
  ]);
</script>
```

## Column Types

Built-in column types for common data formats.

```ts
const builder = CoarGridBuilder.create<Row>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).sortable(),
    (col) => col.date('joinDate', 'long').header('Joined').width(180).sortable(),
    (col) => col.number('salary').header('Salary').width(120),
    (col) => col.tag('status', {
      variantMap: {
        active: 'success',
        inactive: 'error',
        pending: 'warning',
      },
    }).header('Status').width(130),
    (col) => col.icon('icon', { size: 's' }).header('Type').fixedWidth(60),
  ])
  .rowData(data);
```

| Method | Description |
|--------|-------------|
| `.field(name)` | Plain text column |
| `.date(field, format?)` | Formatted date display |
| `.number(field)` | Numeric formatting |
| `.tag(field, config)` | Renders a `CoarTag` with variant mapping |
| `.icon(field, config?)` | Renders a `CoarIcon` |

## Row Selection

Support for single and multi-row selection.

```ts
// Single row selection (click to select)
const builder = CoarGridBuilder.create<Row>()
  .columns([...])
  .rowData(data)
  .rowSelection('single');

// Multi-row selection with checkboxes
const builder = CoarGridBuilder.create<Row>()
  .columns([...])
  .rowData(data)
  .rowSelection('multiple', { checkboxes: true });
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

## Reactive Data

Use `.rowDataRef()` to bind reactive data. The grid updates automatically when the ref changes.

```ts
import { ref } from 'vue';

const data = ref<Row[]>(initialData);

const builder = CoarGridBuilder.create<Row>()
  .columns([...])
  .rowDataRef(data);

// Grid updates when data changes
function addRow(row: Row) {
  data.value = [...data.value, row];
}
```

## Row Styling

Apply CSS classes to rows based on data conditions.

```ts
const builder = CoarGridBuilder.create<Row>()
  .columns([...])
  .rowData(data)
  .rowClassRules({
    'row-inactive': (params) => params.data?.status === 'inactive',
    'row-pending': (params) => params.data?.status === 'pending',
  });
```

## useDataGrid Composable

Track grid readiness and get access to the grid API.

```ts
import { useDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

const { builder, isReady } = useDataGrid<Row>();

// Configure after creation
builder.value
  .columns([...])
  .rowData(data);
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
