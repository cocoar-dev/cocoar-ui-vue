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
