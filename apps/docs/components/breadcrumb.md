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

<preview path="./breadcrumb/demos/BreadcrumbBasic.vue" />

## Deep Hierarchy

Breadcrumbs scale naturally for deeply nested content. Even a five-level trail remains compact and readable, giving users confidence about their location.

<preview path="./breadcrumb/demos/BreadcrumbDeep.vue" />

## App Navigation

Here are several breadcrumb paths you might encounter in a real application -- from a simple two-level dashboard path to a four-level project issue drill-down.

<preview path="./breadcrumb/demos/BreadcrumbApp.vue" />

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

::: info
`vue-router` is declared as an **optional `peerDependenciesMeta`** entry. Install it for SPA routing, omit it for static / `href`-only / bare-slot use.
:::

::: warning Object `to` without router
Passing an object literal (`:to="{ name: 'projects' }"`) when no router is installed falls back to `String(to)`, producing `href="[object Object]"` — a broken link. The component logs a DEV-only `console.warn` once per component instance. Pass a string path for the no-router case.
:::

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
