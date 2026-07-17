---
description: "CoarSidebar — navigation sidebar with header/content/footer sections, collapsible icon-only mode, expand and flyout groups, four-side orientation and router-aware items"
---

# Sidebar

A structured navigation sidebar with three distinct sections: a header for branding, a scrollable content area for navigation, and a footer for secondary actions. Use the dedicated sidebar components (`CoarSidebarItem`, `CoarSidebarGroup`, `CoarSidebarHeading`, `CoarSidebarDivider`, `CoarSidebarSpacer`) for full collapsed/expanded support with automatic tooltips.

```ts
import {
  CoarSidebar,
  CoarSidebarItem,
  CoarSidebarGroup,
  CoarSidebarHeading,
  CoarSidebarDivider,
  CoarSidebarSpacer,
} from '@cocoar/vue-ui';
```

## Sidebar Items

Use `CoarSidebarItem` for navigation, `CoarSidebarGroup` for expandable or flyout sections, and `CoarSidebarHeading` for section labels. Items go directly into the sidebar — no `CoarMenu` wrapper needed.

Toggle `collapsed` for icon-only mode with automatic tooltips. Groups support two modes: `expand` (inline panel with plus/minus indicator) and `flyout` (floating panel with chevron indicator). Use the controls to explore all options.

<preview path="./sidebar/demos/SidebarItems.vue" />

## Side / Orientation

The `side` prop attaches the sidebar to any of the four edges. `left` and `right` give a vertical column (the classic navigation rail); `top` and `bottom` switch the layout to a horizontal toolbar. Tooltip placement, flyout direction, the active-state indicator border, and the collapsed dimension (width vs. height) all adapt automatically.

Use the `side` selector below to flip between all four orientations on the same content.

<preview path="./sidebar/demos/SidebarSides.vue" />

## Router-aware navigation

Pass `to` to `CoarSidebarItem` to render it as a real `<a href>` link instead of `<div role="menuitem">`. The item keeps its full visual styling — collapsed mode, tooltips, side-aware indicator border, all sidebar tokens — but the user gains native browser link behaviour: right-click → "Open in new tab" / "Copy link address", middle-click + Ctrl/Cmd-click open a new tab, and screenreaders announce "link" instead of "menuitem".

```vue
<!-- Before — modifier-clicks silently did nothing -->
<CoarSidebarItem
  icon="layout-dashboard"
  label="Dashboard"
  :active="route.path === '/dashboard'"
  @click="router.push('/dashboard')"
/>

<!-- After — full browser link affordances + auto isActive -->
<CoarSidebarItem
  icon="layout-dashboard"
  label="Dashboard"
  to="/dashboard"
/>
```

When `to` is set and `active` is omitted, the highlighted state and `aria-current="page"` attribute follow `<RouterLink>`'s internal `isActive` automatically — no more `route.path === '/x'` drift. Setting `active` explicitly still wins:

```vue
<!-- Manual override — keep "Settings" highlighted while a child modal is open -->
<CoarSidebarItem
  icon="settings"
  label="Settings"
  to="/settings"
  :active="modal.isOpen || undefined"
/>
```

Items without `to` keep the original `<div role="menuitem">` rendering and the `@click` emit pathway — use this for action items that don't map to a route (logout, drawer-toggle, external help link):

```vue
<CoarSidebarItem icon="log-out" label="Logout" @click="auth.signOut()" />
```

::: info
`vue-router` is declared as an **optional `peerDependenciesMeta`** entry of `@cocoar/vue-ui` — install it for SPA routing, omit it for click-emit-only / external-URL use. Apps without a router can still use `<CoarSidebarItem>` with `@click` exactly as before. Setting `to` to a string URL (`to="https://docs.example.com"`) falls back to a plain `<a href>` that works without a router.
:::

::: warning Object `to` without router
Passing an object literal (`:to="{ name: 'dashboard' }"`) when no router is installed falls back to `String(to)`, producing `href="[object Object]"` — a broken link. The component logs a DEV-only `console.warn` once per component instance to make this loud at dev-time. Pass a string path for the no-router case.
:::

## Migrating from Menu-based Sidebar

If you are using `CoarMenu` and `CoarMenuItem` inside `CoarSidebar`, we recommend migrating to the new sidebar-specific components. The new components support collapsed mode with automatic tooltips, flyout panels, icon-only mode, and nested groups — none of which work with the menu-based approach.

**Before (menu-based):**

```vue
<CoarSidebar v-model:collapsed="collapsed">
  <CoarMenu>
    <CoarMenuItem icon="home" label="Dashboard" />
    <CoarMenuItem icon="user" label="Profile" />
    <CoarSubExpand icon="users" label="Users">
      <CoarMenuItem icon="user-plus" label="All Users" />
      <CoarMenuItem icon="shield" label="Roles" />
    </CoarSubExpand>
  </CoarMenu>
</CoarSidebar>
```

**After (sidebar components):**

```vue
<CoarSidebar v-model:collapsed="collapsed">
  <CoarSidebarItem icon="home" label="Dashboard" active />
  <CoarSidebarItem icon="user" label="Profile" />
  <CoarSidebarGroup icon="users" label="Users" v-model:open="usersOpen">
    <CoarSidebarItem icon="user-plus" label="All Users" />
    <CoarSidebarItem icon="shield" label="Roles" />
  </CoarSidebarGroup>
</CoarSidebar>
```

**Key differences:**
- No `CoarMenu` wrapper — items go directly into the sidebar
- `CoarSidebarItem` replaces `CoarMenuItem` (same props: `icon`, `label`, `active`, `disabled`)
- `CoarSidebarGroup` replaces `CoarSubExpand` — add `mode="flyout"` for flyout behavior
- Headings use `CoarSidebarHeading` instead of custom markup
- Footer items use `<template #footer>` slot — they stretch to full width automatically

## API

### CoarSidebar

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `side` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'left'` | Which edge the sidebar attaches to. `top`/`bottom` switch the layout to horizontal (items in a row, scrolls horizontally). Flyout submenus and tooltip placements adapt automatically. |
| `position` | `'left' \| 'right'` | — | **Deprecated.** Use `side` instead. Still accepted as an alias for backwards compatibility. |
| `collapsed` | `boolean` | `false` | Narrow/icon-only collapsed state. Supports `v-model:collapsed`. In horizontal sidebars this collapses height instead of width. |
| `size` | `'s' \| 'm' \| 'l'` | `'m'` | Icon size: s (16px), m (20px), l (24px) |
| `variant` | `'primary' \| 'secondary'` | `'primary'` | Background color variant |
| `elevated` | `boolean` | `false` | Show elevation shadow |
| `borderless` | `boolean` | `false` | Hide the border |
| `ariaLabel` | `string` | `'Sidebar'` | Accessible label for the nav landmark |

#### Slots

All slots receive `{ collapsed: boolean }` as scoped slot props.

| Slot | Description |
|------|-------------|
| `#header` | Start of the main axis — top in vertical sidebars, left in horizontal. Use for logo, brand, workspace switcher |
| `default` | Scrollable content area — sidebar items. Scrolls vertically in vertical sidebars, horizontally in horizontal ones |
| `#footer` | End of the main axis — bottom in vertical sidebars, right in horizontal. Use for user profile, logout, secondary actions |

### CoarSidebarItem

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | *(required)* | Item label text |
| `icon` | `string` | — | Icon name (recommended for collapsed mode) |
| `to` | `RouteLocationRaw \| string` | `undefined` | Vue Router target. When set, renders as `<a href>` via `<RouterLink>` (or plain `<a>` if no router is installed). Enables native browser link behaviour (new-tab, copy address). See [Router-aware navigation](#router-aware-navigation). |
| `active` | `boolean` | `undefined` | Highlight as current page. Defaults to `<RouterLink>`'s `isActive` when `to` is set; explicit value always wins. |
| `disabled` | `boolean` | `false` | Disabled state |

**Events:** `@click` — standard `MouseEvent` (emitted on both the `<div>` and `<a>` branches for telemetry / side-effects)

### CoarSidebarGroup

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | *(required)* | Group label text |
| `icon` | `string` | — | Icon name (recommended for collapsed mode) |
| `disabled` | `boolean` | `false` | Disabled state |
| `mode` | `'expand' \| 'flyout'` | `'expand'` | `expand`: inline animated panel (plus/minus icon). `flyout`: floating panel next to the sidebar (chevron icon). |
| `open` | `boolean` | `false` | Expanded state (expand mode). Supports `v-model:open`. |
| `icon-only` | `boolean` | `false` | Flyout shows icon-only items with tooltips (no labels). Inherited by nested groups. Use `:icon-only="collapsed"` for dynamic behavior. |
| `open-on-hover` | `boolean` | `false` | Open flyout on hover (200ms delay) instead of click. Only applies to `mode="flyout"`. |

### CoarSidebarHeading

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | *(required)* | Section heading text. Hidden when sidebar is collapsed (small spacer remains). |

### CoarSidebarDivider

No props. Renders a horizontal separator line.

### CoarSidebarSpacer

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `string` | `var(--coar-spacing-m)` | CSS height value (e.g. `'8px'`, `'1rem'`) |
| `grow` | `boolean` | `false` | If true, fills available space (`flex: 1`) |

## CSS Tokens

| Token | Default | Description |
|-------|---------|-------------|
| `--coar-sidebar-width` | `16rem` | Default width (vertical sidebars) |
| `--coar-sidebar-collapsed-width` | *size-aware* — s: `2.25rem`, m: `2.75rem`, l: `3.25rem` | Width in collapsed mode. Auto-scales with `size`; set this token to override. |
| `--coar-sidebar-height` | `auto` | Default height (horizontal sidebars) |
| `--coar-sidebar-collapsed-height` | *size-aware* — same scale as collapsed-width | Height in collapsed mode. Auto-scales with `size`; set this token to override. |
| `--coar-sidebar-item-padding` | `0.5rem 0.75rem` | Item padding |
| `--coar-sidebar-item-gap` | `0.75rem` | Gap between icon and label |
| `--coar-sidebar-item-margin-horizontal` | `0 2px` | Item margin in horizontal sidebars |
| `--coar-sidebar-item-hover` | neutral tertiary | Hover background |
| `--coar-sidebar-item-active-color` | accent primary | Active text color |
| `--coar-sidebar-item-active-bg` | accent tertiary | Active background |
| `--coar-sidebar-group-indent` | `16px` | Child indent for `mode="expand"` (vertical only) |
