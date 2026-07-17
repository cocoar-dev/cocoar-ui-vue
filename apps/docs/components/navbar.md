---
description: "CoarNavbar — top-level navigation bar with start, center and end content slots, elevated shadow by default or a flat bordered variant"
---

# Navbar

A top-level navigation bar that anchors your application layout. It provides three flexible content slots -- start, center, and end -- so you can place a logo, navigation links, and user actions exactly where they belong. By default it uses a subtle shadow for visual elevation; switch to `bordered` for a flat look with a bottom border instead.

```ts
import { CoarNavbar } from '@cocoar/vue-ui';
```

## Basic Usage (Elevated)

The default navbar casts a light shadow to separate it from the page content below. Use all three slots for a complete navigation layout: brand on the left, links in the center, and call-to-action buttons on the right.

<preview path="./navbar/demos/NavbarBasic.vue" />

## App Navbar with User Avatar

A common pattern for authenticated applications. The start slot holds the brand mark, the center slot contains primary navigation, and the end slot pairs notification controls with a user avatar.

<preview path="./navbar/demos/NavbarAvatar.vue" />

## Logo Only (Start Slot)

Not every navbar needs all three slots. For landing pages or simple tools, use just the start and end slots for a clean, minimal header.

<preview path="./navbar/demos/NavbarMinimal.vue" />

## Bordered (No Shadow)

Prefer a flat aesthetic? The `bordered` prop swaps the drop shadow for a thin bottom border, giving the navbar a lighter visual weight that works well in dense dashboards.

<preview path="./navbar/demos/NavbarBordered.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `elevated` | `boolean` | `true` | Show subtle box-shadow elevation |
| `bordered` | `boolean` | `false` | Show bottom border instead of shadow |

### Slots

| Slot | Description |
|------|-------------|
| `#start` | Left-aligned content (logo, brand name) |
| `#center` | Centered content (navigation links) |
| `#end` | Right-aligned content (actions, user menu) |
