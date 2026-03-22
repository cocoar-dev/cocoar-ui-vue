# Menu

Build context menus, action lists, and navigation panels with full keyboard support. Menus group related actions together, making them easy to discover and interact with. They support nested submenus, icons, section headings, and danger variants for destructive actions.

```ts
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading, CoarSubExpand, CoarSubmenuItem } from '@cocoar/vue-ui';
```

## Basic Menu

The simplest menu: a list of clickable items separated by dividers. Individual items can be disabled when an action is not available.

<preview path="./menu/demos/MenuBasic.vue" />

## With Headings

Use `CoarMenuHeading` to organize a longer menu into labeled sections. This helps users scan for the action they need without reading every item.

<preview path="./menu/demos/MenuHeadings.vue" />

## With Icons

Leading icons give each item a visual anchor, making menus faster to scan. Use the `danger` variant on destructive actions like "Delete" so they stand out clearly.

<preview path="./menu/demos/MenuIcons.vue" />

## Nested Submenus

When a menu item leads to a group of related options, wrap them in `CoarSubExpand`. Submenus expand inline, keeping the user in context without opening a separate overlay.

<preview path="./menu/demos/MenuSubmenus.vue" />

## Borderless (Sidebar)

Pass the `borderless` prop when embedding a menu inside a sidebar, panel, or card. This removes the outer border and background so the menu blends into its container.

<preview path="./menu/demos/MenuBorderless.vue" />

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
| `borderless` | `boolean` | `false` | Remove outer border/background |

### CoarMenuItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `string` | `undefined` | Leading icon name |
| `variant` | `'default' \| 'danger'` | `'default'` | Item color variant |
| `disabled` | `boolean` | `false` | Disable the item |

### CoarMenuItem Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `MouseEvent` | Emitted when item is clicked |
