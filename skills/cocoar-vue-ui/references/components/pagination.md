<!-- Generated from apps/docs/components/pagination.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Pagination

Split large collections into digestible pages and let users navigate between them. Pagination automatically calculates page count from `totalItems` and `pageSize`, and intelligently truncates the page range with ellipses when there are too many pages to display at once.

```ts
import { CoarPagination } from '@cocoar/vue-ui';
```

## Basic Usage

Bind a reactive page number with `v-model`. This example paginates 100 items at 10 per page, yielding 10 pages.

**Demo — `pagination/demos/PaginationBasic.vue`**

```vue
<template>
  <div>
    <CoarPagination v-model="page" :total-items="100" :page-size="10" />
    <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">Current page: {{ page }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPagination } from '@cocoar/vue-ui';

const page = ref(1);
</script>
```

## Different Page Size

Adjust `totalItems` and `pageSize` to match your data. Here, 500 items at 25 per page produces 20 pages.

**Demo — `pagination/demos/PaginationPageSize.vue`**

```vue
<template>
  <div>
    <CoarPagination v-model="page" :total-items="500" :page-size="25" />
    <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">Current page: {{ page }} / 20</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPagination } from '@cocoar/vue-ui';

const page = ref(3);
</script>
```

## Large Dataset

With 10,000 items, the page count reaches 1,000. The component automatically shows ellipsis markers so the control stays compact no matter how many pages exist.

**Demo — `pagination/demos/PaginationLarge.vue`**

```vue
<template>
  <div>
    <CoarPagination v-model="page" :total-items="10000" :page-size="10" />
    <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">Current page: {{ page }} / 1000</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPagination } from '@cocoar/vue-ui';

const page = ref(1);
</script>
```

## With Table

The most common real-world pattern: pair pagination with a data table. A summary line shows the visible row range, and page controls sit alongside it in the table footer.

**Demo — `pagination/demos/PaginationTable.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr>
          <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--coar-border-neutral-secondary); font-weight: 600; color: var(--coar-text-neutral-secondary); background: var(--coar-background-neutral-secondary);">Name</th>
          <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--coar-border-neutral-secondary); font-weight: 600; color: var(--coar-text-neutral-secondary); background: var(--coar-background-neutral-secondary);">Email</th>
          <th style="padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--coar-border-neutral-secondary); font-weight: 600; color: var(--coar-text-neutral-secondary); background: var(--coar-background-neutral-secondary);">Role</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in 5" :key="i">
          <td style="padding: 6px 12px; border-bottom: 1px solid var(--coar-border-neutral-secondary);">User {{ (page - 1) * 5 + i }}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid var(--coar-border-neutral-secondary);">user{{ (page - 1) * 5 + i }}@example.com</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid var(--coar-border-neutral-secondary);">{{ i % 2 === 0 ? 'Admin' : 'User' }}</td>
        </tr>
      </tbody>
    </table>
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
      <span style="font-size: 13px; color: var(--coar-text-neutral-secondary);">
        Showing {{ (page - 1) * 5 + 1 }}&ndash;{{ Math.min(page * 5, 100) }} of 100
      </span>
      <CoarPagination v-model="page" :total-items="100" :page-size="5" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPagination } from '@cocoar/vue-ui';

const page = ref(1);
</script>
```

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

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.pagination.firstPage` | `'Go to first page'` | First page button `aria-label` |
| `coar.ui.pagination.previousPage` | `'Go to previous page'` | Previous page button `aria-label` |
| `coar.ui.pagination.nextPage` | `'Go to next page'` | Next page button `aria-label` |
| `coar.ui.pagination.lastPage` | `'Go to last page'` | Last page button `aria-label` |
| `coar.ui.pagination.morePage` | `'More pages'` | Ellipsis separator `aria-label` |
| `coar.ui.pagination.goToPage` | `'Go to page {page}'` | Page number button `aria-label` — `{page}` is replaced with the page number |
| `coar.ui.pagination.nav` | `'Pagination'` | Nav element `aria-label` |
