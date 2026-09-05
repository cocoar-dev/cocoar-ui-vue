<!-- Generated from apps/docs/components/data-grid.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Data Grid

A powerful data grid built on AG Grid with Cocoar theming. Configure columns, sorting, selection, and cell renderers through a fluent builder API — no raw AG Grid config needed.

> **Info: Separate Package**
>
> The Data Grid depends on AG Grid. Install it separately:
```bash
pnpm add @cocoar/vue-data-grid ag-grid-community ag-grid-vue3
```

```ts
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
```

## Basic Usage

Define columns with `.field()`, `.header()`, and `.flex()` / `.width()`. Pass row data with `.rowData()`.

**Demo — `data-grid/demos/GridBasic.vue`**

```vue
<template>
  <div style="height: 350px;">
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

const data: User[] = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  { name: 'Carol Williams', email: 'carol@example.com', role: 'Manager' },
  { name: 'David Brown', email: 'david@example.com', role: 'Engineer' },
  { name: 'Eve Davis', email: 'eve@example.com', role: 'Designer' },
];

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
  ])
  .rowData(data);
</script>
```

## Appearance

Add a border or elevation shadow to the grid. Toggle the checkboxes to see the effect.

**Demo — `data-grid/demos/GridAppearance.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="showTitle" /> Title (left)
      </label>
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="showSearch" /> Search
      </label>
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="showActions" /> Actions (right)
      </label>
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="bordered" /> Bordered
      </label>
      <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
        <input type="checkbox" v-model="elevated" /> Elevated
      </label>
    </div>
    <div style="height: 300px;">
      <CoarDataGrid
        :builder="builder"
        :show-search="showSearch"
        :bordered="bordered"
        :elevated="elevated"
        search-placeholder="Search users..."
      >
        <template v-if="showTitle" #toolbar-left>
          <span style="font-weight: 600; white-space: nowrap;">User List</span>
        </template>
        <template v-if="showActions" #toolbar-right>
          <CoarButton size="s" variant="secondary">Export</CoarButton>
          <CoarButton size="s">Add User</CoarButton>
        </template>
      </CoarDataGrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';

const showTitle = ref(false);
const showSearch = ref(true);
const showActions = ref(true);
const bordered = ref(true);
const elevated = ref(false);

interface User {
  name: string;
  email: string;
  role: string;
}

const data: User[] = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  { name: 'Carol Williams', email: 'carol@example.com', role: 'Manager' },
  { name: 'David Brown', email: 'david@example.com', role: 'Engineer' },
  { name: 'Eve Davis', email: 'eve@example.com', role: 'Designer' },
];

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
  ])
  .rowData(data);
</script>
```

### Dark mode

Dark styles ship with the package. The theme maps AG Grid's variables onto the semantic `--coar-*` tokens (with hardcoded fallbacks), so the grid follows your design-system theme in both modes. Dark values activate via the `.dark-mode` class — on `<html>` or any ancestor (the Cocoar convention, same as `@cocoar/vue-ui`), or directly on the grid element. `[data-theme="dark"]` is **not** a trigger here.

## Column Types

Built-in renderers for dates, numbers, currency, tags, and icons — no custom cell components needed. Date, number, and currency columns are locale-aware and update reactively when the locale changes. Try the locale switcher in the nav bar.

**Demo — `data-grid/demos/GridColumnTypes.vue`**

```vue
<template>
  <div style="height: 350px;">
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Employee {
  name: string;
  joinDate: string;
  salary: number;
  hours: number;
  status: 'active' | 'inactive' | 'pending';
  icon: string;
}

const data: Employee[] = [
  { name: 'Alice Johnson', joinDate: '2022-03-15', salary: 95000, hours: 1420.5, status: 'active', icon: 'user' },
  { name: 'Bob Smith', joinDate: '2021-07-01', salary: 85000, hours: 1105, status: 'active', icon: 'palette' },
  { name: 'Carol Williams', joinDate: '2020-01-20', salary: 110000, hours: 2250.75, status: 'inactive', icon: 'users' },
  { name: 'David Brown', joinDate: '2023-06-10', salary: 90000, hours: 870.25, status: 'pending', icon: 'user' },
  { name: 'Eve Davis', joinDate: '2022-11-05', salary: 88000, hours: 1680, status: 'active', icon: 'palette' },
];

const builder = CoarGridBuilder.create<Employee>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).sortable(),
    (col) => col.date('joinDate').header('Joined').width(150),
    (col) => col.currency('salary', { currencyCode: 'EUR' }).header('Salary').width(140),
    (col) => col.number('hours', { decimals: 1 }).header('Hours').width(110),
    (col) => col.tag('status', {
      variantMap: { active: 'success', inactive: 'error', pending: 'warning' },
    }).header('Status').width(130),
    (col) => col.icon('icon', { size: 's' }).header('Type').fixedWidth(60),
  ])
  .rowData(data);
</script>
```

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

**Demo — `data-grid/demos/GridWrapperColumn.vue`**

```vue
<template>
  <div style="height: 420px;">
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref, defineComponent, h } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarBadge, CoarTag, CoarIcon } from '@cocoar/vue-ui';

interface Message {
  id: number;
  subject: string;
  sender: string;
  starred: boolean;
  unread: number;
  isCritical: boolean;
  awaitingFeedback: boolean;
  priority: 'low' | 'normal' | 'high';
}

const rows = ref<Message[]>([
  { id: 1, subject: 'Q4 budget review',          sender: 'Alice', starred: true,  unread: 3,  isCritical: true,  awaitingFeedback: false, priority: 'high'   },
  { id: 2, subject: 'Design handoff — checkout', sender: 'Bob',   starred: false, unread: 0,  isCritical: false, awaitingFeedback: true,  priority: 'normal' },
  { id: 3, subject: 'Release notes draft',       sender: 'Carol', starred: false, unread: 12, isCritical: false, awaitingFeedback: false, priority: 'low'    },
  { id: 4, subject: 'Offsite logistics',         sender: 'David', starred: true,  unread: 1,  isCritical: true,  awaitingFeedback: true,  priority: 'high'   },
  { id: 5, subject: 'Customer escalation #42',   sender: 'Eve',   starred: false, unread: 0,  isCritical: false, awaitingFeedback: false, priority: 'normal' },
]);

function toggleStar(row: Message): void {
  const target = rows.value.find((r) => r.id === row.id);
  if (target) target.starred = !target.starred;
}

// A single Vue component that receives the whole row and decides internally
// whether to render an icon, a tag, or nothing — demonstrates the implicit `row` prop.
const PriorityIndicator = defineComponent({
  props: { row: { type: Object as () => Message, required: true } },
  setup(props) {
    return () => {
      if (props.row.priority === 'high') {
        return h(CoarTag, { variant: 'error', size: 's' }, () => 'HIGH');
      }
      if (props.row.priority === 'low') {
        return h(CoarIcon, { name: 'arrow-down', source: 'coar-builtin', size: 's', color: '#9ca3af' });
      }
      return null; // 'normal' — render nothing
    };
  },
});

const builder = CoarGridBuilder.create<Message>()
  .columns([
    // Wrapper with a single left item (star toggle) and a single right item (badge).
    // Subject is editable — double-click opens the editor. Slots disappear automatically
    // in edit mode because AG Grid swaps the whole cellRenderer for the cellEditor.
    (col) => col
      .wrap(col.field('subject').header('Subject').flex(1).sortable().option('editable', true))
      .left({
        icon: 'star',
        source: 'coar-builtin',
        color: (r) => (r.starred ? '#f5a623' : '#cbd5e1'),
        tooltip: (r) => (r.starred ? 'Unstar' : 'Star'),
        onClick: (r) => toggleStar(r),
      })
      .right({
        component: CoarBadge,
        params: (r) => ({ content: String(r.unread) }),
        show: (r) => r.unread > 0,
      }),

    (col) => col.field('sender').header('From').width(130).sortable(),

    // Wrapper with TWO right-side icons + a component that decides what to render
    // based on the full row. Each item has its own show() gate.
    (col) => col
      .wrap(col.field('priority').header('Priority').width(200).sortable())
      .right([
        // 1) Critical-flag icon — only visible when isCritical = true
        {
          icon: 'circle-alert',
          source: 'coar-builtin',
          color: '#dc2626',
          tooltip: 'Critical',
          show: (r) => r.isCritical,
        },
        // 2) Awaiting-feedback icon — only visible when awaitingFeedback = true
        {
          icon: 'message-circle',
          source: 'coar-builtin',
          color: '#3b82f6',
          tooltip: 'Awaiting feedback',
          show: (r) => r.awaitingFeedback,
        },
        // 3) A component that receives the whole row and renders tag OR icon OR nothing
        { component: PriorityIndicator },
      ]),
  ])
  .rowDataRef(rows)
  .rowId((params) => String(params.data.id));
</script>
```

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

**Demo — `data-grid/demos/GridSelection.vue`**

```vue
<template>
  <div>
    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
      <label style="display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer;">
        <input type="radio" value="single" v-model="mode" /> Single
      </label>
      <label style="display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer;">
        <input type="radio" value="multiple" v-model="mode" /> Multi (Checkboxes)
      </label>
    </div>
    <div style="height: 300px;">
      <CoarDataGrid :key="mode" :builder="builders[mode]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface User {
  name: string;
  email: string;
  role: string;
}

const data: User[] = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  { name: 'Carol Williams', email: 'carol@example.com', role: 'Manager' },
  { name: 'David Brown', email: 'david@example.com', role: 'Engineer' },
  { name: 'Eve Davis', email: 'eve@example.com', role: 'Designer' },
];

const cols = [
  (col: any) => col.field('name').header('Name').flex(1),
  (col: any) => col.field('email').header('Email').flex(1),
  (col: any) => col.field('role').header('Role').width(120),
];

const mode = ref<'single' | 'multiple'>('single');

const builders = {
  single: CoarGridBuilder.create<User>().columns(cols).rowData(data).rowSelection('single'),
  multiple: CoarGridBuilder.create<User>().columns(cols).rowData(data).rowSelection('multiple', { checkboxes: true }),
};
</script>
```

## Reactive Data

Bind a `ref` with `.rowDataRef()` and the grid updates automatically when your data changes.

**Demo — `data-grid/demos/GridReactive.vue`**

```vue
<template>
  <div>
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <CoarButton size="s" @click="addRow">Add Row</CoarButton>
      <CoarButton size="s" variant="secondary" @click="reset">Reset</CoarButton>
      <span style="font-size: 13px; color: var(--coar-text-neutral-secondary); align-self: center;">
        {{ data.length }} rows
      </span>
    </div>
    <div style="height: 300px;">
      <CoarDataGrid :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const initialData: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com', role: 'Manager' },
];

const allRows: User[] = [
  ...initialData,
  { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Engineer' },
  { id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'Designer' },
  { id: 6, name: 'Frank Miller', email: 'frank@example.com', role: 'Engineer' },
  { id: 7, name: 'Grace Wilson', email: 'grace@example.com', role: 'Manager' },
  { id: 8, name: 'Henry Taylor', email: 'henry@example.com', role: 'Designer' },
];

const data = ref<User[]>([...initialData]);

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
  ])
  .rowDataRef(data);

function addRow() {
  const next = allRows[data.value.length % allRows.length];
  if (next) {
    data.value = [...data.value, { ...next, id: Date.now() }];
  }
}

function reset() {
  data.value = [...initialData];
}
</script>
```

## Search (Quick Filter)

Enable the built-in search bar with `show-search`. It wires the search input to the builder's quick filter automatically.

**Demo — `data-grid/demos/GridSearchPanel.vue`**

```vue
<template>
  <div style="height: 400px;">
    <CoarDataGrid
      :builder="builder"
      show-search
      search-placeholder="Search users..."
    >
      <template #toolbar-right>
        <CoarButton size="s" variant="secondary" @click="addUser">Add User</CoarButton>
      </template>
    </CoarDataGrid>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';

interface User {
  name: string;
  email: string;
  role: string;
  department: string;
}

const users = ref<User[]>([
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer', department: 'Platform' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer', department: 'Product' },
  { name: 'Carol Williams', email: 'carol@example.com', role: 'Manager', department: 'Platform' },
  { name: 'David Brown', email: 'david@example.com', role: 'Engineer', department: 'Mobile' },
  { name: 'Eve Davis', email: 'eve@example.com', role: 'Designer', department: 'Product' },
  { name: 'Frank Miller', email: 'frank@example.com', role: 'Engineer', department: 'Mobile' },
  { name: 'Grace Wilson', email: 'grace@example.com', role: 'Manager', department: 'Product' },
  { name: 'Henry Taylor', email: 'henry@example.com', role: 'Designer', department: 'Platform' },
]);

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).sortable(),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
    (col) => col.field('department').header('Department').width(130),
  ])
  .rowDataRef(users)
  .searchHighlight();

let counter = 0;
function addUser() {
  counter++;
  users.value = [
    ...users.value,
    { name: `New User ${counter}`, email: `new${counter}@example.com`, role: 'Engineer', department: 'Platform' },
  ];
}
</script>
```

### Custom Layout

Use `CoarDataGridSearch` and `CoarDataGrid` separately for full layout control. Connect them via `builder.quickFilterText(ref)`.

**Demo — `data-grid/demos/GridSearchCustom.vue`**

```vue
<template>
  <div style="height: 400px; display: flex; flex-direction: column; gap: 8px;">
    <h4 style="margin: 0;">Custom Layout</h4>
    <CoarDataGridSearch v-model="search" placeholder="Filter by name or tags...">
      <CoarButton size="s" variant="secondary" @click="showAll = !showAll">
        {{ showAll ? 'Active Only' : 'Show All' }}
      </CoarButton>
    </CoarDataGridSearch>
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarDataGridSearch, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';

interface Task {
  title: string;
  status: string;
  tags: string[];
  assignee: string;
}

const tasks: Task[] = [
  { title: 'Fix login bug', status: 'active', tags: ['bug', 'urgent'], assignee: 'Alice' },
  { title: 'Add dark mode', status: 'active', tags: ['feature', 'ui'], assignee: 'Bob' },
  { title: 'Update docs', status: 'done', tags: ['docs'], assignee: 'Carol' },
  { title: 'Refactor API', status: 'active', tags: ['refactor', 'backend'], assignee: 'David' },
  { title: 'Fix typo in header', status: 'done', tags: ['bug'], assignee: 'Eve' },
  { title: 'Add search to grid', status: 'active', tags: ['feature', 'ui'], assignee: 'Frank' },
];

const search = ref('');
const showAll = ref(true);

const builder = CoarGridBuilder.create<Task>()
  .columns([
    (col) => col.field('title').header('Title').flex(1),
    (col) => col.field('status').header('Status').width(100),
    (col) => col.field('tags').header('Tags').flex(1)
      .valueFormatter((p) => p.value?.join(', ') ?? '')
      .quickFilter((tags) => tags.join(' ')),
    (col) => col.field('assignee').header('Assignee').width(120),
  ])
  .rowData(tasks)
  .quickFilterText(search)
  .externalFilter((node) => showAll.value || node.data?.status === 'active')
  .updateExternalFilterWhen(showAll);
</script>
```

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

**Demo — `data-grid/demos/GridTreeDrag.vue`**

```vue
<template>
  <div style="height: 450px; display: flex; flex-direction: column; gap: 8px;">
    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
      <input type="checkbox" v-model="maxTwoLevels" />
      Limit to 2 levels (no nesting into children)
    </label>
    <CoarDataGrid :builder="builder" />
    <div v-if="lastAction" style="font-size: 0.85em; color: #666;">
      {{ lastAction }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

const maxTwoLevels = ref(false);

interface Task {
  id: string;
  title: string;
  status: string;
  children?: Task[];
}

const tasks = ref<Task[]>([
  {
    id: '1', title: 'Frontend', status: 'active', children: [
      { id: '1-1', title: 'Login page', status: 'done' },
      { id: '1-2', title: 'Dashboard', status: 'active' },
    ],
  },
  {
    id: '2', title: 'Backend', status: 'active', children: [
      { id: '2-1', title: 'Auth API', status: 'done' },
      { id: '2-2', title: 'User API', status: 'active' },
      { id: '2-3', title: 'Settings API', status: 'active' },
    ],
  },
  {
    id: '3', title: 'Testing', status: 'active', children: [
      { id: '3-1', title: 'Unit tests', status: 'active' },
    ],
  },
]);

const openRows = ref(['1', '2', '3']);
const lastAction = ref('');

function findAndRemove(items: Task[], id: string): Task | undefined {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) return items.splice(i, 1)[0];
    if (items[i].children) {
      const found = findAndRemove(items[i].children!, id);
      if (found) return found;
    }
  }
  return undefined;
}

function findById(items: Task[], id: string): Task | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findById(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function isDescendantOf(items: Task[], ancestorId: string, targetId: string): boolean {
  const ancestor = findById(items, ancestorId);
  if (!ancestor?.children) return false;
  return !!findById(ancestor.children, targetId);
}

const builder = CoarGridBuilder.create<Task>()
  .columns([
    (col) => col.tree('title').header('Task').flex(1).rowDrag(),
    (col) => col.field('status').header('Status').width(100),
  ])
  .treeData({
    children: (row) => row.children ?? [],
    rowId: (row) => row.id,
  })
  .openRows(openRows)
  .rowDataRef(tasks)
  .rowDragHighlight({
    canDrop: (dragged, target) => {
      if (dragged.id === target.id) return false;
      if (isDescendantOf(tasks.value, dragged.id, target.id)) return false;
      // When "max 2 levels" is on, only allow drop on root items
      if (maxTwoLevels.value) {
        const targetMeta = builder.getTreeMeta(target.id);
        if (targetMeta && targetMeta.depth > 0) return false;
      }
      return true;
    },
  })
  .onRowDragEnd((event) => {
    const dragged = event.node.data;
    const target = event.overNode?.data;
    if (!dragged) return;

    const clone = JSON.parse(JSON.stringify(tasks.value)) as Task[];
    const movedItem = findAndRemove(clone, dragged.id);
    if (!movedItem) return;

    if (!target) {
      clone.push(movedItem);
      tasks.value = clone;
      lastAction.value = `Moved "${movedItem.title}" to root level`;
      return;
    }

    if (dragged.id === target.id) return;
    if (isDescendantOf(tasks.value, dragged.id, target.id)) return;
    if (maxTwoLevels.value) {
      const targetMeta = builder.getTreeMeta(target.id);
      if (targetMeta && targetMeta.depth > 0) return;
    }

    const targetItem = findById(clone, target.id);
    if (!targetItem) return;

    if (!targetItem.children) targetItem.children = [];
    targetItem.children.push(movedItem);

    if (!openRows.value.includes(target.id)) {
      openRows.value = [...openRows.value, target.id];
    }

    tasks.value = clone;
    lastAction.value = `Moved "${movedItem.title}" into "${targetItem.title}"`;
  });
</script>
```

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

**Demo — `data-grid/demos/GridTreeData.vue`**

```vue
<template>
  <div style="height: 450px;">
    <CoarDataGrid
      :builder="builder"
      show-search
      search-placeholder="Search files..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: string;
  modified: string;
  children?: FileNode[];
}

const files: FileNode[] = [
  {
    id: '1', name: 'src', type: 'folder', modified: '2024-03-15', children: [
      {
        id: '1-1', name: 'components', type: 'folder', modified: '2024-03-14', children: [
          { id: '1-1-1', name: 'Button.vue', type: 'file', size: '2.4 KB', modified: '2024-03-10' },
          { id: '1-1-2', name: 'Input.vue', type: 'file', size: '3.1 KB', modified: '2024-03-12' },
          { id: '1-1-3', name: 'Dialog.vue', type: 'file', size: '5.8 KB', modified: '2024-03-14' },
        ],
      },
      {
        id: '1-2', name: 'utils', type: 'folder', modified: '2024-03-13', children: [
          { id: '1-2-1', name: 'format.ts', type: 'file', size: '1.2 KB', modified: '2024-03-13' },
          { id: '1-2-2', name: 'validate.ts', type: 'file', size: '0.8 KB', modified: '2024-03-11' },
        ],
      },
      { id: '1-3', name: 'App.vue', type: 'file', size: '1.5 KB', modified: '2024-03-15' },
      { id: '1-4', name: 'main.ts', type: 'file', size: '0.3 KB', modified: '2024-03-01' },
    ],
  },
  {
    id: '2', name: 'public', type: 'folder', modified: '2024-02-20', children: [
      { id: '2-1', name: 'favicon.ico', type: 'file', size: '4.2 KB', modified: '2024-01-15' },
      { id: '2-2', name: 'index.html', type: 'file', size: '0.5 KB', modified: '2024-02-20' },
    ],
  },
  { id: '3', name: 'package.json', type: 'file', size: '1.1 KB', modified: '2024-03-15' },
  { id: '4', name: 'tsconfig.json', type: 'file', size: '0.4 KB', modified: '2024-01-10' },
  { id: '5', name: 'README.md', type: 'file', size: '2.0 KB', modified: '2024-03-05' },
];

const openRows = ref<string[]>(['1']);

const builder = CoarGridBuilder.create<FileNode>()
  .columns([
    (col) => col.tree('name').header('Name').flex(2),
    (col) => col.field('type').header('Type').width(90),
    (col) => col.field('size').header('Size').width(100),
    (col) => col.field('modified').header('Modified').width(130),
  ])
  .treeData({
    children: (row) => row.children ?? [],
    rowId: (row) => row.id,
  })
  .openRows(openRows)
  .rowData(files)
  .searchHighlight();
</script>
```

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

**Demo — `data-grid/demos/GridRowDrag.vue`**

```vue
<template>
  <div style="height: 350px; display: flex; flex-direction: column; gap: 8px;">
    <CoarDataGrid :builder="builder" />
    <div v-if="lastOrder" style="font-size: 0.85em; color: #666;">
      Order: {{ lastOrder }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Step {
  id: number;
  title: string;
  priority: string;
}

const steps = ref<Step[]>([
  { id: 1, title: 'Gather requirements', priority: 'High' },
  { id: 2, title: 'Create wireframes', priority: 'Medium' },
  { id: 3, title: 'Implement prototype', priority: 'High' },
  { id: 4, title: 'User testing', priority: 'Medium' },
  { id: 5, title: 'Final review', priority: 'Low' },
]);

const lastOrder = ref('');

const builder = CoarGridBuilder.create<Step>()
  .columns([
    (col) => col.field('title').header('Step').flex(1).rowDrag(),
    (col) => col.field('priority').header('Priority').width(120).sortable(),
  ])
  .rowDataRef(steps)
  .rowId((p) => String(p.data.id))
  .rowDragManaged()
  .onRowDragEnd(() => {
    const newOrder = builder.getDisplayedRowData();
    lastOrder.value = newOrder.map((s) => s.title).join(' → ');
    // In a real app: store.updateOrder(newOrder) or api.reorder(newOrder)
  });
</script>
```

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

**Demo — `data-grid/demos/GridPersistence.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <CoarButton size="s" @click="builder.resetPersistedStates()">Reset columns</CoarButton>
    </div>

    <div style="height: 250px;">
      <CoarDataGrid :builder="builder" bordered>
        <template #toolbar-left>
          <span style="font-weight: 600;">Team A</span>
        </template>
      </CoarDataGrid>
    </div>

    <div style="height: 250px;">
      <CoarDataGrid :builder="builder2" bordered>
        <template #toolbar-left>
          <span style="font-weight: 600;">Team B</span>
        </template>
      </CoarDataGrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';

interface User {
  name: string;
  email: string;
  role: string;
  department: string;
}

const teamA: User[] = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer', department: 'Platform' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Designer', department: 'Platform' },
  { name: 'Carol Williams', email: 'carol@example.com', role: 'Manager', department: 'Platform' },
];

const teamB: User[] = [
  { name: 'David Brown', email: 'david@example.com', role: 'Engineer', department: 'Product' },
  { name: 'Eve Davis', email: 'eve@example.com', role: 'Designer', department: 'Product' },
  { name: 'Frank Miller', email: 'frank@example.com', role: 'Manager', department: 'Product' },
];

const columns = [
  (col: any) => col.field('name').header('Name').flex(1),
  (col: any) => col.field('email').header('Email').flex(1),
  (col: any) => col.field('role').header('Role').width(120),
  (col: any) => col.field('department').header('Dept').width(120),
];

const builder = CoarGridBuilder.create<User>()
  .persistColumnState('docs-persistence-demo')
  .columns(columns)
  .rowData(teamA);

const builder2 = CoarGridBuilder.create<User>()
  .persistColumnState('docs-persistence-demo')
  .columns(columns)
  .rowData(teamB);
</script>
```

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
