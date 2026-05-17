# Menu

Build context menus, action lists, and navigation panels with full keyboard support. Menus group related actions together, making them easy to discover and interact with. They support nested submenus, icons, section headings, and danger variants for destructive actions.

```ts
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading, CoarSubExpand, CoarSubFlyout } from '@cocoar/vue-ui';
```

## Basic Menu

The simplest menu: a list of clickable items separated by dividers. Individual items can be disabled when an action is not available.

<preview path="./menu/demos/MenuBasic.vue" />

## With Headings

Use `CoarMenuHeading` to organize a longer menu into labeled sections. This helps users scan for the action they need without reading every item.

<preview path="./menu/demos/MenuHeadings.vue" />

## With Icons

Leading icons give each item a visual anchor, making menus faster to scan. Use a trash icon on destructive actions like "Delete" to signal their intent.

<preview path="./menu/demos/MenuIcons.vue" />

## Nested Submenus

When a menu item leads to a group of related options, wrap them in `CoarSubExpand`. Submenus expand inline, keeping the user in context without opening a separate overlay.

<preview path="./menu/demos/MenuSubmenus.vue" />

## Flyout Submenus

Use `CoarSubFlyout` when the submenu should appear as a floating panel beside the trigger instead of expanding inline. The `label` prop sets the visible text; child items go in the default slot and render inside the flyout.

<preview path="./menu/demos/MenuFlyout.vue" />

## Borderless (Sidebar)

Pass the `borderless` prop when embedding a menu inside a sidebar, panel, or card. This removes the outer border and background so the menu blends into its container.

<preview path="./menu/demos/MenuBorderless.vue" />

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

::: info
`vue-router` is declared as an **optional `peerDependenciesMeta`** entry of `@cocoar/vue-ui` — install it for SPA routing, omit it for click-emit-only use. Items without `to` keep the original `<div role="menuitem">` rendering and the `@clicked` event pathway exactly as before.
:::

::: warning Object `to` without router
Passing an object literal (`:to="{ name: 'profile' }"`) when no router is installed falls back to `String(to)`, producing `href="[object Object]"` — a broken link. The component logs a DEV-only `console.warn` once per component instance to make this loud at dev-time. Pass a string path for the no-router case.
:::

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

<preview path="./menu/demos/MenuScrollable.vue" />

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
