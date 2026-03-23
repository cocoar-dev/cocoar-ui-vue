# Pagination

Split large collections into digestible pages and let users navigate between them. Pagination automatically calculates page count from `totalItems` and `pageSize`, and intelligently truncates the page range with ellipses when there are too many pages to display at once.

```ts
import { CoarPagination } from '@cocoar/vue-ui';
```

## Basic Usage

Bind a reactive page number with `v-model`. This example paginates 100 items at 10 per page, yielding 10 pages.

<preview path="./pagination/demos/PaginationBasic.vue" />

## Different Page Size

Adjust `totalItems` and `pageSize` to match your data. Here, 500 items at 25 per page produces 20 pages.

<preview path="./pagination/demos/PaginationPageSize.vue" />

## Large Dataset

With 10,000 items, the page count reaches 1,000. The component automatically shows ellipsis markers so the control stays compact no matter how many pages exist.

<preview path="./pagination/demos/PaginationLarge.vue" />

## With Table

The most common real-world pattern: pair pagination with a data table. A summary line shows the visible row range, and page controls sit alongside it in the table footer.

<preview path="./pagination/demos/PaginationTable.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `number` | `1` | Current active page (1-indexed) |
| `totalItems` | `number` | — | Total number of items (**required**) |
| `pageSize` | `number` | `10` | Items per page |
| `maxVisiblePages` | `number` | `5` | Maximum visible page buttons |
| `showFirstLast` | `boolean` | `true` | Show first/last page nav buttons |
| `disabled` | `boolean` | `false` | Disable the pagination control |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `pageChanged` | `number` | Emitted when the page changes |
