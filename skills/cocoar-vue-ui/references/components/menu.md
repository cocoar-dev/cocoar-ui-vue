<!-- Generated from apps/docs/components/menu.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Menu

Build context menus, action lists, and navigation panels with full keyboard support. Menus group related actions together, making them easy to discover and interact with. They support nested submenus, icons, section headings, and danger variants for destructive actions.

```ts
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading, CoarSubExpand, CoarSubFlyout } from '@cocoar/vue-ui';
```

## Basic Menu

The simplest menu: a list of clickable items separated by dividers. Individual items can be disabled when an action is not available.

**Demo — `menu/demos/MenuBasic.vue`**

```vue
<template>
  <div>
    <CoarMenu>
      <CoarMenuItem @clicked="handleClick('New File')">New File</CoarMenuItem>
      <CoarMenuItem @clicked="handleClick('Open...')">Open...</CoarMenuItem>
      <CoarMenuDivider />
      <CoarMenuItem @clicked="handleClick('Save')">Save</CoarMenuItem>
      <CoarMenuItem @clicked="handleClick('Save As...')">Save As...</CoarMenuItem>
      <CoarMenuDivider />
      <CoarMenuItem :disabled="true">Export (disabled)</CoarMenuItem>
    </CoarMenu>
    <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">Last clicked: {{ lastClicked || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider } from '@cocoar/vue-ui';

const lastClicked = ref('');

function handleClick(item: string) {
  lastClicked.value = item;
}
</script>
```

## With Headings

Use `CoarMenuHeading` to organize a longer menu into labeled sections. This helps users scan for the action they need without reading every item.

**Demo — `menu/demos/MenuHeadings.vue`**

```vue
<template>
  <CoarMenu>
    <CoarMenuHeading>File</CoarMenuHeading>
    <CoarMenuItem>New</CoarMenuItem>
    <CoarMenuItem>Open</CoarMenuItem>
    <CoarMenuItem>Recent</CoarMenuItem>
    <CoarMenuDivider />
    <CoarMenuHeading>Edit</CoarMenuHeading>
    <CoarMenuItem>Cut</CoarMenuItem>
    <CoarMenuItem>Copy</CoarMenuItem>
    <CoarMenuItem>Paste</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading } from '@cocoar/vue-ui';
</script>
```

## With Icons

Leading icons give each item a visual anchor, making menus faster to scan. Use a trash icon on destructive actions like "Delete" to signal their intent.

**Demo — `menu/demos/MenuIcons.vue`**

```vue
<template>
  <CoarMenu>
    <CoarMenuItem icon="plus">New File</CoarMenuItem>
    <CoarMenuItem icon="copy">Duplicate</CoarMenuItem>
    <CoarMenuItem icon="clipboard">Paste</CoarMenuItem>
    <CoarMenuDivider />
    <CoarMenuItem icon="settings">Settings</CoarMenuItem>
    <CoarMenuItem icon="trash-2">Delete</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { CoarMenu, CoarMenuItem, CoarMenuDivider } from '@cocoar/vue-ui';
</script>
```

## Nested Submenus

When a menu item leads to a group of related options, wrap them in `CoarSubExpand`. Submenus expand inline, keeping the user in context without opening a separate overlay.

**Demo — `menu/demos/MenuSubmenus.vue`**

```vue
<template>
  <CoarMenu>
    <CoarMenuItem @clicked="handleClick('Dashboard')">Dashboard</CoarMenuItem>
    <CoarSubExpand label="Settings">
      <CoarMenuItem @clicked="handleClick('Profile')">Profile</CoarMenuItem>
      <CoarMenuItem @clicked="handleClick('Security')">Security</CoarMenuItem>
      <CoarMenuItem @clicked="handleClick('Notifications')">Notifications</CoarMenuItem>
    </CoarSubExpand>
    <CoarSubExpand label="Reports">
      <CoarMenuItem @clicked="handleClick('Sales')">Sales</CoarMenuItem>
      <CoarMenuItem @clicked="handleClick('Traffic')">Traffic</CoarMenuItem>
    </CoarSubExpand>
    <CoarMenuDivider />
    <CoarMenuItem @clicked="handleClick('Logout')">Logout</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarSubExpand } from '@cocoar/vue-ui';

const lastClicked = ref('');

function handleClick(item: string) {
  lastClicked.value = item;
}
</script>
```

## Flyout Submenus

Use `CoarSubFlyout` when the submenu should appear as a floating panel beside the trigger instead of expanding inline. The `label` prop sets the visible text; child items go in the default slot and render inside the flyout.

**Demo — `menu/demos/MenuFlyout.vue`**

```vue
<template>
  <CoarMenu>
    <CoarMenuItem icon="home" @clicked="handleClick('Home')">Home</CoarMenuItem>
    <CoarSubFlyout label="Account" icon="user">
      <CoarMenu>
        <CoarMenuItem icon="user" @clicked="handleClick('Profile')">Profile</CoarMenuItem>
        <CoarMenuItem icon="shield" @clicked="handleClick('Security')">Security</CoarMenuItem>
        <CoarMenuItem icon="bell" @clicked="handleClick('Notifications')">Notifications</CoarMenuItem>
      </CoarMenu>
    </CoarSubFlyout>
    <CoarSubFlyout label="Reports" icon="chart-bar">
      <CoarMenu>
        <CoarMenuItem @clicked="handleClick('Sales')">Sales</CoarMenuItem>
        <CoarMenuItem @clicked="handleClick('Traffic')">Traffic</CoarMenuItem>
      </CoarMenu>
    </CoarSubFlyout>
    <CoarMenuDivider />
    <CoarMenuItem icon="log-out" @clicked="handleClick('Logout')">Logout</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarSubFlyout } from '@cocoar/vue-ui';

const lastClicked = ref('');

function handleClick(item: string) {
  lastClicked.value = item;
}
</script>
```

## Borderless (Sidebar)

Pass the `borderless` prop when embedding a menu inside a sidebar, panel, or card. This removes the outer border and background so the menu blends into its container.

**Demo — `menu/demos/MenuBorderless.vue`**

```vue
<template>
  <div style="background: var(--coar-background-neutral-secondary); border-radius: 8px; padding: 8px;">
    <CoarMenu borderless>
      <CoarMenuHeading>Navigation</CoarMenuHeading>
      <CoarMenuItem icon="home">Home</CoarMenuItem>
      <CoarMenuItem icon="user">Profile</CoarMenuItem>
      <CoarMenuItem icon="settings">Settings</CoarMenuItem>
    </CoarMenu>
  </div>
</template>

<script setup lang="ts">
import { CoarMenu, CoarMenuItem, CoarMenuHeading } from '@cocoar/vue-ui';
</script>
```

## Router-aware items

Pass `to` to `CoarMenuItem` to render it as a real `<a href>` link instead of `<div role="menuitem">`. Same payoff as on the sidebar: middle-click and Ctrl/Cmd-click open the destination in a new tab via the browser's native handling, right-click exposes "Open in new tab" / "Copy link address", and screenreaders announce "link to {label}". `role="menuitem"` is preserved on the `<a>` branch (the parent `CoarMenu` is `role="menu"`, so the role pairing is WAI-ARIA-correct).

```vue
<CoarMenu>
  <CoarMenuItem icon="user" label="Profile" to="/profile" />
  <CoarMenuItem icon="settings" label="Settings" to="/settings" />
  <CoarMenuDivider />
  <CoarMenuItem icon="log-out" label="Logout" @clicked="auth.signOut()" />
</CoarMenu>
```

**Modifier-clicks do NOT auto-close the menu.** When the user Ctrl/Cmd/Middle-clicks a link item the browser opens a new tab natively and the menu stays open — matches the macOS Finder / Chrome bookmarks bar pattern, lets the user fire several link items in a row without re-opening the menu. Plain click still triggers SPA navigation and auto-closes the menu (subject to `keepMenuOpen()` in your `@clicked` handler).

> **Info**
>
> `vue-router` is declared as an **optional `peerDependenciesMeta`** entry of `@cocoar/vue-ui` — install it for SPA routing, omit it for click-emit-only use. Items without `to` keep the original `<div role="menuitem">` rendering and the `@clicked` event pathway exactly as before.

> **Warning: Object `to` without router**
>
> Passing an object literal (`:to="{ name: 'profile' }"`) when no router is installed falls back to `String(to)`, producing `href="[object Object]"` — a broken link. The component logs a DEV-only `console.warn` once per component instance to make this loud at dev-time. Pass a string path for the no-router case.

## Active state

Use `active` to mark a menu item as the current selection — view-mode toggles, settings checkmarks, sort-direction indicators. The library renders the `coar-menu-item--active` class + `aria-current="page"`. When `to` is set and `active` is omitted, the state follows `<RouterLink>`'s `isActive` automatically.

```vue
<CoarMenu>
  <CoarMenuItem icon="list" :active="view === 'list'" @clicked="view = 'list'">
    List view
  </CoarMenuItem>
  <CoarMenuItem icon="grid" :active="view === 'grid'" @clicked="view = 'grid'">
    Grid view
  </CoarMenuItem>
</CoarMenu>
```

The menu still auto-closes on click — active styling is meaningful while the menu is open (the user sees what's currently selected), then the menu closes and reopens later showing the new selection as active.

### Keyboard support on link items

When `to` is set the menu item renders as `<a href>`, so the keyboard pathway differs slightly from action items:

- **Enter** — delegated to the browser, which fires a native click on the `<a>`. RouterLink navigation runs, the menu auto-closes.
- **Space** — synthesizes a click on the underlying anchor element (Space does not natively activate `<a>` in any browser). Same outcome as Enter / mouse click: navigation + auto-close.
- **Modifier+Enter** — browser opens a new tab natively; the menu stays open so the user can fire additional link items.

`@clicked` fires for all three pathways. `keepMenuOpen()` still suppresses auto-close on the link path.

## Scrollable Menu

When a menu has many items, it scrolls automatically. Use `#header` and `#footer` slots for fixed content above and below the scrollable area. `CoarMenuHeading` supports a `sticky` prop to keep section headers visible while scrolling.

**Demo — `menu/demos/MenuScrollable.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarCheckbox v-model="sticky" label="sticky headings" />
  <div style="height: 280px; width: 240px;">
    <CoarMenu style="height: 100%; width: 100%;">
      <template #header>
        <div style="padding: 8px;">
          <input
            v-model="filter"
            type="text"
            placeholder="Filter..."
            style="width: 100%; box-sizing: border-box; padding: 4px 8px; border: 1px solid var(--coar-border-input); border-radius: var(--coar-radius-xs); background: var(--coar-surface-input); font-size: 13px; outline: none;"
          />
        </div>
      </template>

      <template v-for="item in filteredItems" :key="item.label">
        <CoarMenuDivider v-if="item.divider" />
        <CoarMenuHeading v-else-if="item.heading" :label="item.label" :sticky="sticky" />
        <CoarMenuItem v-else :icon="item.icon" :label="item.label" />
      </template>

      <template #footer>
        <CoarMenuItem icon="plus" label="New project..." />
      </template>
    </CoarMenu>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading, CoarCheckbox } from '@cocoar/vue-ui';

const filter = ref('');
const sticky = ref(false);

const items = [
  { heading: true, label: 'Navigation' },
  { icon: 'home', label: 'Dashboard' },
  { icon: 'users', label: 'Users' },
  { icon: 'settings', label: 'Settings' },
  { icon: 'bell', label: 'Notifications' },
  { divider: true, label: 'd1' },
  { heading: true, label: 'Projects' },
  { icon: 'folder', label: 'Frontend' },
  { icon: 'folder', label: 'Backend' },
  { icon: 'folder', label: 'Mobile App' },
  { icon: 'folder', label: 'Design System' },
  { icon: 'folder', label: 'Documentation' },
  { divider: true, label: 'd2' },
  { heading: true, label: 'Admin' },
  { icon: 'database', label: 'Database' },
  { icon: 'code', label: 'API Keys' },
  { icon: 'clipboard', label: 'Audit Log' },
  { icon: 'download', label: 'Exports' },
];

const filteredItems = computed(() => {
  const q = filter.value.toLowerCase().trim();
  if (!q) return items;
  return items.filter((item) =>
    item.heading || item.divider || item.label.toLowerCase().includes(q),
  );
});
</script>
```

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Arrow Up` / `Arrow Down` | Move focus between items |
| `Enter` / `Space` | Activate focused item |
| `Escape` | Close nested submenus |
| `Tab` | Move focus out of the menu |

## API

### CoarMenu Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showIconColumn` | `boolean` | `true` | Reserve icon column to prevent layout shift |
| `borderless` | `boolean` | `false` | Remove outer border/background |

### CoarMenu Slots

| Slot | Description |
|------|-------------|
| `default` | Menu items (scrollable area) |
| `header` | Fixed content above the scrollable area |
| `footer` | Fixed content below the scrollable area |

### CoarMenuHeading Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `undefined` | Heading text (alternative to default slot) |
| `sticky` | `boolean` | `false` | Stick to top of scroll container |

### CoarMenuItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `undefined` | Item label text (alternative to default slot) |
| `icon` | `string` | `undefined` | Leading icon name |
| `to` | `RouteLocationRaw \| string` | `undefined` | Vue Router target. When set, renders as `<a href>` via `<RouterLink>` (or plain `<a>` if no router is installed). Modifier-clicks open a new tab without closing the menu. See [Router-aware items](#router-aware-items). |
| `active` | `boolean` | `undefined` | Mark the item as the current selection (view-mode toggle, settings checkmark, sort indicator). Renders `coar-menu-item--active` + `aria-current="page"`. Defaults to `<RouterLink>`'s `isActive` when `to` is set; explicit value always wins. The menu still auto-closes on click — active state is meaningful WHILE the menu is open. |
| `disabled` | `boolean` | `false` | Disable the item |

### CoarMenuItem Slots

| Slot | Description |
|------|-------------|
| `default` | Item label content |

### CoarMenuItem Events

| Event | Payload | Description |
|-------|---------|-------------|
| `clicked` | `MenuItemClickEvent` | Emitted when item is clicked |

```ts
interface MenuItemClickEvent {
  event: MouseEvent;
  keepMenuOpen(): void; // Call to prevent auto-close of the menu tree
}
```
