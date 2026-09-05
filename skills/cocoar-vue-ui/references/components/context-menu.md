<!-- Generated from apps/docs/components/context-menu.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Context Menu

Open a menu at the pointer position on right-click. The `useContextMenu` composable manages open/close state and cursor coordinates, while `CoarContextMenu` renders the menu as a floating overlay with automatic viewport clamping.

```ts
import { useContextMenu, CoarContextMenu } from '@cocoar/vue-ui';
```

## Basic Usage

Call `useContextMenu()` to get a controller, bind `menu.open` to `@contextmenu`, and place your menu items inside `<CoarContextMenu>`. The menu closes automatically when an item is clicked, when clicking outside, pressing Escape, or scrolling.

**Demo — `context-menu/demos/ContextMenuBasic.vue`**

```vue
<template>
  <div>
    <div
      class="target-area"
      @contextmenu="menu.open"
    >
      Right-click anywhere in this area
    </div>

    <CoarContextMenu :menu="menu">
      <CoarMenuItem icon="copy" label="Copy" @clicked="onAction('Copy')" />
      <CoarMenuItem icon="clipboard" label="Paste" @clicked="onAction('Paste')" />
      <CoarMenuDivider />
      <CoarMenuItem icon="pencil" label="Rename" @clicked="onAction('Rename')" />
      <CoarMenuItem icon="trash-2" label="Delete" @clicked="onAction('Delete')" />
    </CoarContextMenu>

    <p class="status">Last action: {{ lastAction || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useContextMenu, CoarContextMenu, CoarMenuItem, CoarMenuDivider } from '@cocoar/vue-ui';

const menu = useContextMenu();
const lastAction = ref('');

function onAction(action: string) {
  lastAction.value = action;
}
</script>

<style scoped>
.target-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  border: 2px dashed var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-m);
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-font-size-s);
  user-select: none;
}

.status {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
```

## With Headings & Submenus

All standard menu features work inside context menus — headings, dividers, icons, and inline submenus via `CoarSubExpand`.

**Demo — `context-menu/demos/ContextMenuSubmenus.vue`**

```vue
<template>
  <div>
    <div
      class="target-area"
      @contextmenu="menu.open"
    >
      Right-click for a menu with headings and submenus
    </div>

    <CoarContextMenu :menu="menu">
      <CoarMenuHeading label="Edit" />
      <CoarMenuItem icon="scissors" label="Cut" @clicked="onAction('Cut')" />
      <CoarMenuItem icon="copy" label="Copy" @clicked="onAction('Copy')" />
      <CoarMenuItem icon="clipboard" label="Paste" @clicked="onAction('Paste')" />
      <CoarMenuDivider />
      <CoarSubExpand label="Sort by" icon="arrow-up-down">
        <CoarMenuItem label="Name" @clicked="onAction('Sort by Name')" />
        <CoarMenuItem label="Date" @clicked="onAction('Sort by Date')" />
        <CoarMenuItem label="Size" @clicked="onAction('Sort by Size')" />
      </CoarSubExpand>
      <CoarMenuDivider />
      <CoarMenuItem icon="settings" label="Preferences" @clicked="onAction('Preferences')" />
    </CoarContextMenu>

    <p class="status">Last action: {{ lastAction || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  useContextMenu,
  CoarContextMenu,
  CoarMenuItem,
  CoarMenuDivider,
  CoarMenuHeading,
  CoarSubExpand,
} from '@cocoar/vue-ui';

const menu = useContextMenu();
const lastAction = ref('');

function onAction(action: string) {
  lastAction.value = action;
}
</script>

<style scoped>
.target-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  border: 2px dashed var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-m);
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-font-size-s);
  user-select: none;
}

.status {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
```

## Flyout Submenus

Use `CoarSubFlyout` inside a context menu for nested flyout panels — useful for status changes, priority selectors, etc.

**Demo — `context-menu/demos/ContextMenuFlyout.vue`**

```vue
<template>
  <div>
    <div class="target-area" @contextmenu="menu.open">
      Right-click for a menu with flyout submenus
    </div>

    <CoarContextMenu :menu="menu">
      <CoarMenuItem icon="pencil" label="Edit" @clicked="onAction('Edit')" />
      <CoarMenuDivider />
      <CoarSubFlyout label="Set Status" icon="circle-alert">
        <CoarMenu>
          <CoarMenuItem label="New" @clicked="onAction('Status: New')" />
          <CoarMenuItem label="In Progress" @clicked="onAction('Status: In Progress')" />
          <CoarMenuItem label="Done" @clicked="onAction('Status: Done')" />
        </CoarMenu>
      </CoarSubFlyout>
      <CoarSubFlyout label="Priority" icon="flag">
        <CoarMenu>
          <CoarMenuItem label="Low" @clicked="onAction('Priority: Low')" />
          <CoarMenuItem label="Medium" @clicked="onAction('Priority: Medium')" />
          <CoarMenuItem label="High" @clicked="onAction('Priority: High')" />
        </CoarMenu>
      </CoarSubFlyout>
      <CoarMenuDivider />
      <CoarMenuItem icon="trash-2" label="Delete" @clicked="onAction('Delete')" />
    </CoarContextMenu>

    <p class="status">Last action: {{ lastAction || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  useContextMenu,
  CoarContextMenu,
  CoarMenu,
  CoarMenuItem,
  CoarMenuDivider,
  CoarSubFlyout,
} from '@cocoar/vue-ui';

const menu = useContextMenu();
const lastAction = ref('');

function onAction(action: string) {
  lastAction.value = action;
}
</script>

<style scoped>
.target-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  border: 2px dashed var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-m);
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-font-size-s);
  user-select: none;
}

.status {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
```

## Data Grid Integration

Use separate `useContextMenu()` instances for cell and viewport right-clicks. The data grid builder provides `onCellContextMenu` and `onViewportContextMenu` handlers that give you the mouse event to pass into `menu.open()`.

**Demo — `context-menu/demos/ContextMenuDataGrid.vue`**

```vue
<template>
  <div>
    <div style="height: 300px;">
      <CoarDataGrid :builder="builder" />
    </div>

    <!-- Cell context menu (right-click on a row) -->
    <CoarContextMenu :menu="cellMenu">
      <CoarMenuItem icon="pencil" label="Edit" @clicked="onCellAction('Edit', selectedUser)" />
      <CoarMenuItem icon="copy" label="Duplicate" @clicked="onCellAction('Duplicate', selectedUser)" />
      <CoarMenuDivider />
      <CoarMenuItem icon="trash-2" label="Delete" @clicked="onCellAction('Delete', selectedUser)" />
    </CoarContextMenu>

    <!-- Viewport context menu (right-click on empty area) -->
    <CoarContextMenu :menu="viewportMenu">
      <CoarMenuItem icon="plus" label="Add user" @clicked="onViewportAction('Add user')" />
      <CoarMenuItem icon="refresh-cw" label="Refresh" @clicked="onViewportAction('Refresh')" />
    </CoarContextMenu>

    <p class="status">Last action: {{ lastAction || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import type { CellContextMenuEvent } from '@cocoar/vue-data-grid';
import { useContextMenu, CoarContextMenu, CoarMenuItem, CoarMenuDivider } from '@cocoar/vue-ui';

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

const cellMenu = useContextMenu();
const viewportMenu = useContextMenu();
const selectedUser = ref<User | null>(null);
const lastAction = ref('');

const builder = CoarGridBuilder.create<User>()
  .columns([
    (col) => col.field('name').header('Name').flex(1),
    (col) => col.field('email').header('Email').flex(1),
    (col) => col.field('role').header('Role').width(120),
  ])
  .rowData(data)
  .onCellContextMenu((event: CellContextMenuEvent<User>) => {
    selectedUser.value = event.data ?? null;
    if (event.event) {
      cellMenu.open(event.event as MouseEvent);
    }
  })
  .onViewportContextMenu((event: MouseEvent) => {
    viewportMenu.open(event);
  });

function onCellAction(action: string, user: User | null) {
  lastAction.value = `${action}: ${user?.name ?? 'unknown'}`;
}

function onViewportAction(action: string) {
  lastAction.value = action;
}
</script>

<style scoped>
.status {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
```

## Keeping the Menu Open

By default, clicking a `CoarMenuItem` closes the entire context menu. Call `keepMenuOpen()` on the click event to prevent this — useful for toggles or multi-select actions.

```vue
<CoarMenuItem
  label="Toggle dark mode"
  icon="moon"
  @clicked="(e) => { e.keepMenuOpen(); toggleDarkMode(); }"
/>
```

## API

### `useContextMenu()`

Returns a `ContextMenuContext` object:

| Property   | Type                          | Description                                    |
|------------|-------------------------------|------------------------------------------------|
| `isOpen`   | `Readonly<Ref<boolean>>`      | Whether the menu is currently visible          |
| `position` | `Readonly<Ref<{x, y}>>`      | Cursor position where the menu was opened      |
| `open`     | `(event: MouseEvent) => void` | Open at the event's cursor position            |
| `close`    | `() => void`                  | Close the menu                                 |

### `<CoarContextMenu>`

| Prop   | Type                 | Required | Description                              |
|--------|----------------------|----------|------------------------------------------|
| `menu` | `ContextMenuContext` | Yes      | Controller returned by `useContextMenu()` |

**Slot:** `default` — menu items (`CoarMenuItem`, `CoarMenuDivider`, `CoarMenuHeading`, `CoarSubExpand`, etc.)

### Behavior

- **Viewport clamping** — the menu repositions to stay within the window
- **Click outside** — closes the menu
- **Escape** — closes the menu
- **Scroll** — closes the menu
- **Auto-close on item click** — unless `keepMenuOpen()` is called
