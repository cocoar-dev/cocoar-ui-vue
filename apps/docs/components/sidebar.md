# Sidebar

A structured navigation sidebar with three distinct sections: a header for branding, a scrollable content area for navigation, and a footer for secondary actions. Pair it with `CoarMenu` (using the `borderless` prop) to build full application navigation in minutes.

```ts
import { CoarSidebar } from '@cocoar/vue-ui';
```

## Basic Sidebar

A typical sidebar layout with a brand logo in the header, a flat list of nav items in the body, and a logout action in the footer. The content area scrolls independently when there are more items than the sidebar can display.

<preview path="./sidebar/demos/SidebarBasic.vue" />

## With Sections & Submenus

For larger applications, organize navigation into labeled sections with `CoarMenuHeading` and nest related pages under expandable `CoarSubExpand` groups. This keeps a complex information architecture browsable without overwhelming the user.

<preview path="./sidebar/demos/SidebarSections.vue" />

## API

### Slots

| Slot | Description |
|------|-------------|
| `#header` | Top section -- logo, brand, workspace switcher |
| `default` | Scrollable content area -- typically a CoarMenu |
| `#footer` | Bottom section -- user profile, logout, secondary actions |
