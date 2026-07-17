---
description: "CoarContextMenu with useContextMenu — right-click menu at the pointer position with viewport clamping, submenus, flyouts and auto-close behavior."
---

# Context Menu

Open a menu at the pointer position on right-click. The `useContextMenu` composable manages open/close state and cursor coordinates, while `CoarContextMenu` renders the menu as a floating overlay with automatic viewport clamping.

```ts
import { useContextMenu, CoarContextMenu } from '@cocoar/vue-ui';
```

## Basic Usage

Call `useContextMenu()` to get a controller, bind `menu.open` to `@contextmenu`, and place your menu items inside `<CoarContextMenu>`. The menu closes automatically when an item is clicked, when clicking outside, pressing Escape, or scrolling.

<preview path="./context-menu/demos/ContextMenuBasic.vue" />

## With Headings & Submenus

All standard menu features work inside context menus — headings, dividers, icons, and inline submenus via `CoarSubExpand`.

<preview path="./context-menu/demos/ContextMenuSubmenus.vue" />

## Flyout Submenus

Use `CoarSubFlyout` inside a context menu for nested flyout panels — useful for status changes, priority selectors, etc.

<preview path="./context-menu/demos/ContextMenuFlyout.vue" />

## Data Grid Integration

Use separate `useContextMenu()` instances for cell and viewport right-clicks. The data grid builder provides `onCellContextMenu` and `onViewportContextMenu` handlers that give you the mouse event to pass into `menu.open()`.

<preview path="./context-menu/demos/ContextMenuDataGrid.vue" />

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
