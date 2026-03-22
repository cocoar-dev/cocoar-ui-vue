# Breadcrumb

Show users exactly where they are within a page hierarchy and give them a quick path back to any parent level. Breadcrumbs are especially valuable in applications with deep navigation structures, where the sidebar alone does not make the current location obvious.

```ts
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
```

## Basic Usage

Wrap each level in a `CoarBreadcrumbItem`. Parent levels are rendered as links; the last item is marked `active` to indicate the current page. Separators between items are handled automatically.

<preview path="./breadcrumb/demos/BreadcrumbBasic.vue" />

## Deep Hierarchy

Breadcrumbs scale naturally for deeply nested content. Even a five-level trail remains compact and readable, giving users confidence about their location.

<preview path="./breadcrumb/demos/BreadcrumbDeep.vue" />

## App Navigation

Here are several breadcrumb paths you might encounter in a real application -- from a simple two-level dashboard path to a four-level project issue drill-down.

<preview path="./breadcrumb/demos/BreadcrumbApp.vue" />

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move between breadcrumb links |
| `Enter` | Activate the focused link |
| `Shift + Tab` | Move focus backward |

## API

### CoarBreadcrumb

Container component. No props.

### CoarBreadcrumbItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `active` | `boolean` | `false` | Mark as the current/active page (not a link) |

### CoarBreadcrumbItem Slots

| Slot | Description |
|------|-------------|
| `default` | Item content -- typically an anchor tag for links, or plain text for the active item |
