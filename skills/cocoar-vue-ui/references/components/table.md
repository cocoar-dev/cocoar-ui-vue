<!-- Generated from apps/docs/components/table.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Table

A lightweight table wrapper that provides consistent styling, alternating row colors, and proper alignment out of the box. Use it whenever you need to present structured data -- user lists, order histories, configuration settings, or comparison grids.

```ts
import { CoarTable } from '@cocoar/vue-ui';
```

## Basic Usage

Wrap standard `thead`, `tbody`, `tr`, `th`, and `td` elements. Alternating row colors are applied automatically to improve readability in longer datasets.

**Demo — `table/demos/TableBasic.vue`**

```vue
<template>
  <CoarTable>
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="user in users" :key="user.id">
        <td>{{ user.id }}</td>
        <td>{{ user.name }}</td>
        <td>{{ user.email }}</td>
        <td>{{ user.role }}</td>
        <td>
          <CoarTag :variant="statusVariant[user.status]" size="s">{{ user.status }}</CoarTag>
        </td>
      </tr>
    </tbody>
  </CoarTable>
</template>

<script setup lang="ts">
import { CoarTable, CoarTag } from '@cocoar/vue-ui';

const users = [
  { id: 1, name: 'Alice Johnson', role: 'Admin', status: 'active', email: 'alice@example.com' },
  { id: 2, name: 'Bob Smith', role: 'Editor', status: 'active', email: 'bob@example.com' },
  { id: 3, name: 'Carol White', role: 'Viewer', status: 'pending', email: 'carol@example.com' },
  { id: 4, name: 'David Brown', role: 'Editor', status: 'inactive', email: 'david@example.com' },
  { id: 5, name: 'Eva Martinez', role: 'Admin', status: 'active', email: 'eva@example.com' },
];

const statusVariant: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'neutral',
};
</script>
```

## Rich Cells

Table cells aren't limited to plain text. Embed avatars, tags, badges, and other components directly in cells to create information-dense but scannable rows.

**Demo — `table/demos/TableRichCells.vue`**

```vue
<template>
  <CoarTable>
    <thead>
      <tr>
        <th>User</th>
        <th>Role</th>
        <th>Status</th>
        <th>Notifications</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="user in users" :key="user.id">
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <CoarAvatar :name="user.name" size="s" />
            <div>
              <div style="font-size: 14px; font-weight: 600;">{{ user.name }}</div>
              <div style="font-size: 14px; color: #64748b;">{{ user.email }}</div>
            </div>
          </div>
        </td>
        <td>{{ user.role }}</td>
        <td><CoarTag :variant="statusVariant[user.status]" size="s">{{ user.status }}</CoarTag></td>
        <td><CoarBadge v-if="user.status === 'active'" variant="error" size="s" :content="user.notifs" /></td>
      </tr>
    </tbody>
  </CoarTable>
</template>

<script setup lang="ts">
import { CoarTable, CoarTag, CoarAvatar, CoarBadge } from '@cocoar/vue-ui';

const users = [
  { id: 1, name: 'Alice Johnson', role: 'Admin', status: 'active', email: 'alice@example.com', notifs: 3 },
  { id: 2, name: 'Bob Smith', role: 'Editor', status: 'active', email: 'bob@example.com', notifs: 7 },
  { id: 3, name: 'Carol White', role: 'Viewer', status: 'pending', email: 'carol@example.com', notifs: 0 },
  { id: 4, name: 'David Brown', role: 'Editor', status: 'inactive', email: 'david@example.com', notifs: 0 },
  { id: 5, name: 'Eva Martinez', role: 'Admin', status: 'active', email: 'eva@example.com', notifs: 2 },
];

const statusVariant: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'neutral',
};
</script>
```

## Variants

The default striped style works well for most tables. Switch to `plain` for a minimal look, or `bordered` when you need explicit cell boundaries -- useful for dense data or comparison tables.

**Demo — `table/demos/TableVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Default (striped)</p>
      <CoarTable>
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Alpha</td><td>1</td></tr>
          <tr><td>Beta</td><td>2</td></tr>
          <tr><td>Gamma</td><td>3</td></tr>
        </tbody>
      </CoarTable>
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Bordered</p>
      <CoarTable variant="bordered">
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Alpha</td><td>1</td></tr>
          <tr><td>Beta</td><td>2</td></tr>
          <tr><td>Gamma</td><td>3</td></tr>
        </tbody>
      </CoarTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarTable } from '@cocoar/vue-ui';
</script>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'plain' \| 'bordered'` | `'default'` | Table style variant |
| `compact` | `boolean` | `false` | Use compact cell padding |
| `hover` | `boolean` | `true` | Highlight rows on hover |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Native thead/tbody/tr/th/td elements |
