<!-- Generated from apps/docs/components/breadcrumb.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Breadcrumb

Show users exactly where they are within a page hierarchy and give them a quick path back to any parent level. Breadcrumbs are especially valuable in applications with deep navigation structures, where the sidebar alone does not make the current location obvious.

```ts
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
```

## Basic Usage

Pass `to` to render each crumb as a link. The library handles the `<a>` element for you — no need to wrap content in a manual anchor. Mark the last item `active` to indicate the current page; it renders as a non-interactive `<span aria-current="page">` (current page is not a link to itself, per WAI-ARIA convention).

```vue
<CoarBreadcrumb>
  <CoarBreadcrumbItem to="/projects" icon="folder">Projects</CoarBreadcrumbItem>
  <CoarBreadcrumbItem to="/projects/alpha">Alpha</CoarBreadcrumbItem>
  <CoarBreadcrumbItem to="/projects/alpha/issues">Issues</CoarBreadcrumbItem>
  <CoarBreadcrumbItem active>#142 Fix date picker</CoarBreadcrumbItem>
</CoarBreadcrumb>
```

**Demo — `breadcrumb/demos/BreadcrumbBasic.vue`**

```vue
<template>
  <CoarBreadcrumb>
    <CoarBreadcrumbItem to="/admin" icon="home">Home</CoarBreadcrumbItem>
    <CoarBreadcrumbItem to="/admin/users" icon="users">Users</CoarBreadcrumbItem>
    <CoarBreadcrumbItem active>John Doe</CoarBreadcrumbItem>
  </CoarBreadcrumb>
</template>

<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
</script>
```

## Deep Hierarchy

Breadcrumbs scale naturally for deeply nested content. Even a five-level trail remains compact and readable, giving users confidence about their location.

**Demo — `breadcrumb/demos/BreadcrumbDeep.vue`**

```vue
<template>
  <CoarBreadcrumb>
    <CoarBreadcrumbItem to="/shop" icon="home">Home</CoarBreadcrumbItem>
    <CoarBreadcrumbItem to="/shop/products" icon="folder">Products</CoarBreadcrumbItem>
    <CoarBreadcrumbItem to="/shop/products/electronics" icon="layout-grid">Electronics</CoarBreadcrumbItem>
    <CoarBreadcrumbItem to="/shop/products/electronics/laptops" icon="file-text">Laptops</CoarBreadcrumbItem>
    <CoarBreadcrumbItem active>MacBook Pro 16"</CoarBreadcrumbItem>
  </CoarBreadcrumb>
</template>

<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
</script>
```

## App Navigation

Here are several breadcrumb paths you might encounter in a real application -- from a simple two-level dashboard path to a four-level project issue drill-down.

**Demo — `breadcrumb/demos/BreadcrumbApp.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Simple 2-level dashboard path -->
    <CoarBreadcrumb>
      <CoarBreadcrumbItem to="/dashboard" icon="layout-grid">Dashboard</CoarBreadcrumbItem>
      <CoarBreadcrumbItem active>Overview</CoarBreadcrumbItem>
    </CoarBreadcrumb>

    <!-- Settings drilldown -->
    <CoarBreadcrumb>
      <CoarBreadcrumbItem to="/settings" icon="settings">Settings</CoarBreadcrumbItem>
      <CoarBreadcrumbItem to="/settings/account" icon="user">Account</CoarBreadcrumbItem>
      <CoarBreadcrumbItem active>Security</CoarBreadcrumbItem>
    </CoarBreadcrumb>

    <!-- Project / issue drill-down -->
    <CoarBreadcrumb>
      <CoarBreadcrumbItem to="/projects" icon="folder">Projects</CoarBreadcrumbItem>
      <CoarBreadcrumbItem to="/projects/alpha">Alpha</CoarBreadcrumbItem>
      <CoarBreadcrumbItem to="/projects/alpha/issues" icon="bookmark">Issues</CoarBreadcrumbItem>
      <CoarBreadcrumbItem active>#142 Fix date picker</CoarBreadcrumbItem>
    </CoarBreadcrumb>
  </div>
</template>

<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
</script>
```

## Three render modes

`CoarBreadcrumbItem` picks its render strategy automatically from the props:

| Mode | Trigger | Renders as |
|------|---------|------------|
| **Active** | `:active="true"` | `<span aria-current="page">` — non-interactive, current page |
| **Router-aware link** | `:to="..."` and `vue-router` installed | `<a href>` via `<RouterLink>` (SPA navigation, middle-click new-tab, etc.) |
| **Plain link** | `:to="..."` without router, or `:href="..."` | `<a href>` with browser-native navigation |
| **Bare slot (escape hatch)** | none of the above | Whatever the slot contains (custom dropdown, button, plain text…) |

**Active wins over `to`**: you can pass `to` on every crumb (including the last) without filtering — the `active` flag is the single source of truth for "this is the current page". Useful when generating the trail programmatically from `router.matched`.

```vue
<!-- All four crumbs in one loop, no special-case for the last item -->
<CoarBreadcrumb>
  <CoarBreadcrumbItem
    v-for="(crumb, i) in trail"
    :key="crumb.path"
    :to="crumb.path"
    :icon="crumb.icon"
    :active="i === trail.length - 1"
  >
    {{ crumb.label }}
  </CoarBreadcrumbItem>
</CoarBreadcrumb>
```

## Icons

Pass `icon` for a Lucide-style leading icon, or use the `#icon` slot for custom content (avatar, badge, coloured icon).

```vue
<CoarBreadcrumb>
  <!-- Named icon via prop -->
  <CoarBreadcrumbItem to="/" icon="home">Home</CoarBreadcrumbItem>

  <!-- Custom icon via #icon slot — overrides icon prop -->
  <CoarBreadcrumbItem to="/teams/alpha">
    <template #icon>
      <CoarAvatar :src="team.avatarUrl" size="xs" />
    </template>
    {{ team.name }}
  </CoarBreadcrumbItem>

  <CoarBreadcrumbItem active>Settings</CoarBreadcrumbItem>
</CoarBreadcrumb>
```

The icon renders inside the `<a>` / `<span>` so it shares the link's hit-area and styling (hover, focus, disabled states all apply uniformly).

## Custom content (dropdown, picker, etc.)

When `to` / `href` / `active` are all omitted, the item falls back to rendering the bare slot. Use this for inline UI like a project-switcher dropdown embedded in the trail:

```vue
<CoarBreadcrumb>
  <CoarBreadcrumbItem to="/projects">Projects</CoarBreadcrumbItem>

  <!-- Bare-slot mode: library renders just the <li>, you control the rest -->
  <CoarBreadcrumbItem>
    <CoarSelect
      v-model="currentProject"
      :options="availableProjects"
      size="s"
      variant="ghost"
    />
  </CoarBreadcrumbItem>

  <CoarBreadcrumbItem active>Settings</CoarBreadcrumbItem>
</CoarBreadcrumb>
```

This also covers the legacy CSS-only pattern (`<CoarBreadcrumbItem><a href="/x">Foo</a></CoarBreadcrumbItem>`) — consumer-slotted anchors keep working without changes.

## Router Integration

When `to` is set and `vue-router` is registered (`app.use(router)`), the item renders via `<RouterLink>` in custom-slot mode for SPA navigation. Without a router, it falls back to a plain `<a href={String(to)}>`. The detection uses `resolveDynamicComponent('RouterLink')` — no hard dependency on `vue-router`.

> **Info**
>
> `vue-router` is declared as an **optional `peerDependenciesMeta`** entry. Install it for SPA routing, omit it for static / `href`-only / bare-slot use.

> **Warning: Object `to` without router**
>
> Passing an object literal (`:to="{ name: 'projects' }"`) when no router is installed falls back to `String(to)`, producing `href="[object Object]"` — a broken link. The component logs a DEV-only `console.warn` once per component instance. Pass a string path for the no-router case.

## Sizes

Two sizes:

- **`m`** (default, 14 px) — primary navigation. Sits at the top of a page above the page title.
- **`s`** (13 px) — secondary chrome. File-explorer paths, settings trails, address-bar style indicators sitting above other content.

```vue
<CoarBreadcrumb separator="›" size="s" aria-label="File path">
  <CoarBreadcrumbItem>src</CoarBreadcrumbItem>
  <CoarBreadcrumbItem>components</CoarBreadcrumbItem>
  <CoarBreadcrumbItem active>Button.tsx</CoarBreadcrumbItem>
</CoarBreadcrumb>
```

Pass items without `to` / `href` to render as plain text (the slot-only escape hatch) — useful for path indicators where the segments aren't independently navigable.

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move between breadcrumb links |
| `Enter` | Activate the focused link |
| `Shift + Tab` | Move focus backward |

## API

### CoarBreadcrumb Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `separator` | `string` | `'/'` | Separator character between items |
| `ariaLabel` | `string` | `'Breadcrumb'` | Accessible label for the nav landmark |
| `size` | `'m' \| 's'` | `'m'` | Visual density. `'s'` (13 px) for secondary chrome — file-explorer paths, settings trails, etc. Drives only the font-size token; spacing + colors stay identical to `'m'` so both sizes look consistent in the same UI. |

### CoarBreadcrumbItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `to` | `RouteLocationRaw \| string` | `undefined` | Vue Router target. Library renders an `<a>` (via `<RouterLink>` if available, plain `<a>` otherwise). Ignored when `active` is true. |
| `href` | `string` | `undefined` | External URL. Used when `to` is not set. |
| `icon` | `string` | `undefined` | Leading icon name. Rendered inside the link / active span. |
| `active` | `boolean` | `false` | Mark as the current/active page — renders as `<span aria-current="page">`, NOT a link to itself. Takes precedence over `to` / `href`. |
| `disabled` | `boolean` | `false` | Disabled link (only meaningful in link modes): `aria-disabled`, `tabindex=-1`, navigation suppressed. |

### CoarBreadcrumbItem Slots

| Slot | Description |
|------|-------------|
| `default` | Item content — text for the common case, or any custom content (dropdown, button, etc.) in bare-slot mode |
| `icon` | Custom icon content. Overrides the `icon` prop when both are provided. Use for avatars, badges, coloured icons. |
