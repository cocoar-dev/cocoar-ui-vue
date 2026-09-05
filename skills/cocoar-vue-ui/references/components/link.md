<!-- Generated from apps/docs/components/link.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Link

Styled anchor elements for in-page navigation, external references, and any clickable text that isn't a button action. Two equivalent APIs:

- **`<CoarLink>` SFC** (recommended) — `to` for router navigation, `href` for external links, automatic `rel="noopener"` for new-tab safety, disabled handling.
- **CSS classes** — `<a class="coar-link">` with hand-written `href` / `<RouterLink>` for consumers who want zero abstraction.

Both layers share the same CSS in `@cocoar/vue-ui/styles`. Mix them freely.

```ts
import { CoarLink } from '@cocoar/vue-ui';
```

## Basic usage

```vue
<!-- Router navigation (when vue-router is installed) -->
<CoarLink to="/docs">Documentation</CoarLink>

<!-- External link with safe new-tab default -->
<CoarLink href="https://docs.cocoar.dev" target="_blank">
  Cocoar Docs
</CoarLink>

<!-- mailto / tel still works via href -->
<CoarLink href="mailto:hi@example.com">hi@example.com</CoarLink>
```

The default style applies an accent color with an underline on hover, making links instantly recognizable in any context.

**Demo — `link/demos/LinkBasic.vue`**

```vue
<template>
  <CoarLink to="/getting-started">Default link</CoarLink>
</template>

<script setup lang="ts">
import { CoarLink } from '@cocoar/vue-ui';
</script>
```

## Variants

Use the `accent` variant (default) for primary navigation and calls to action. Switch to `subtle` when the link should blend into surrounding body text.

```vue
<CoarLink to="/docs" variant="subtle">Read the docs</CoarLink>
```

**Demo — `link/demos/LinkVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div><CoarLink to="/getting-started">Accent link (default)</CoarLink> — Primary interactive text</div>
    <div><CoarLink to="/changelog" variant="subtle">Subtle link</CoarLink> — Secondary actions, less emphasis</div>
  </div>
</template>

<script setup lang="ts">
import { CoarLink } from '@cocoar/vue-ui';
</script>
```

## Sizes

Three size modifiers align with the typography scale, so links stay proportional whether they appear in footnotes or headings.

```vue
<CoarLink href="#" size="s">Small</CoarLink>
<CoarLink href="#" size="m">Medium (default)</CoarLink>
<CoarLink href="#" size="l">Large</CoarLink>
```

**Demo — `link/demos/LinkSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div><CoarLink to="/changelog" size="s">Small link</CoarLink> — Compact contexts</div>
    <div><CoarLink to="/getting-started" size="m">Default link</CoarLink> — Body text size</div>
    <div><CoarLink to="/components/button" size="l">Large link</CoarLink> — Prominent CTAs</div>
  </div>
</template>

<script setup lang="ts">
import { CoarLink } from '@cocoar/vue-ui';
</script>
```

## Disabled state

Pass `disabled` to deactivate the link visually and semantically. The component sets `aria-disabled="true"`, `tabindex="-1"`, and intercepts clicks — navigation and `@click` emit are both suppressed.

```vue
<CoarLink to="/admin" disabled>Admin (insufficient permissions)</CoarLink>
```

**Demo — `link/demos/LinkDisabled.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div><CoarLink to="/getting-started">Active link</CoarLink></div>
    <div><CoarLink to="/components/button" disabled>Disabled link</CoarLink></div>
  </div>
</template>

<script setup lang="ts">
import { CoarLink } from '@cocoar/vue-ui';
</script>
```

## Inline usage

Links are designed to sit naturally inside running prose without disrupting line height or text flow.

**Demo — `link/demos/LinkInline.vue`**

```vue
<template>
  <p style="margin: 0; font-size: 14px; line-height: 1.6;">
    The COAR Design System is built on top of
    <CoarLink href="https://vuejs.org" target="_blank">Vue 3</CoarLink> and uses the
    <CoarLink href="https://tc39.es/proposal-temporal/docs/" target="_blank">Temporal API</CoarLink> for date/time handling.
    See the <CoarLink to="/getting-started">Getting Started guide</CoarLink> or
    browse the <CoarLink to="/components/button" variant="subtle">full component reference</CoarLink>
    for more details.
  </p>
</template>

<script setup lang="ts">
import { CoarLink } from '@cocoar/vue-ui';
</script>
```

## Router Integration

When `to` is set, the link renders via `<RouterLink>` (if `vue-router` is installed and `app.use(router)` has registered the plugin) for SPA navigation. Without a router, it falls back to a plain `<a href={String(to)}>` that works for absolute URLs. The router detection uses `resolveDynamicComponent('RouterLink')` — no hard dependency, no peerDependency requirement.

```vue
<!-- SPA navigation when router available -->
<CoarLink to="/docs">Documentation</CoarLink>

<!-- Object-shaped routes work too (with router) -->
<CoarLink :to="{ name: 'docs', params: { section: 'intro' } }">
  Intro
</CoarLink>
```

`aria-current="page"` is applied automatically when the current route matches `to` (via `RouterLink.isActive`).

> **Warning: Object `to` without router**
>
> Passing an object literal (`{ name: 'docs' }`) when no router is installed falls back to `String(to)`, producing `href="[object Object]"` — a broken link. The component logs a DEV-only `console.warn` once per call site to make this loud. Pass a string path for the no-router case.

## External Links

For absolute URLs and `mailto:` / `tel:` schemes, use `href` instead of `to`. The component skips the router entirely and renders a plain `<a>`. When `target="_blank"` is set, `rel="noopener"` is added automatically as a tab-nabbing defence (browsers do this by default since 2021, but the explicit attribute documents intent and works in older browsers).

```vue
<CoarLink href="https://github.com/cocoar-dev" target="_blank">
  GitHub
</CoarLink>
<!-- Renders: <a href="..." target="_blank" rel="noopener" class="coar-link"> -->
```

You can override the auto-rel by passing your own:

```vue
<CoarLink
  href="https://untrusted.example.com"
  target="_blank"
  rel="noopener noreferrer external"
>
  External (extra-cautious)
</CoarLink>
```

## CSS-only usage (no SFC)

If you only need the styling and want to wire the link element yourself (typically inside a `<RouterLink>` slot, breadcrumb, or templated context), apply the CSS classes directly to a native `<a>`:

```vue
<RouterLink to="/docs" custom v-slot="{ href, navigate, isActive }">
  <a
    :href="href"
    class="coar-link"
    :class="{ 'coar-link--disabled': !canVisit }"
    @click="navigate"
  >
    Documentation
  </a>
</RouterLink>
```

This is the original API and stays supported indefinitely — the SFC is purely additive.

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `to` | `RouteLocationRaw \| string` | `undefined` | Vue Router target. Takes precedence over `href`. Renders via `<RouterLink>` if installed, else falls back to plain `<a href={String(to)}>`. |
| `href` | `string` | `undefined` | External URL. Used when `to` is not set. Works for `https:`, `mailto:`, `tel:`, etc. |
| `variant` | `'accent' \| 'subtle'` | `'accent'` | Visual variant. `accent` for primary links, `subtle` for blending into body text. |
| `size` | `'s' \| 'm' \| 'l'` | `'m'` | Typography size. |
| `disabled` | `boolean` | `false` | Disabled state (aria-disabled, tabindex=-1, click suppressed). |
| `target` | `string` | `undefined` | Anchor target attribute. Only applied to the plain `<a>` branches (not via `<RouterLink>`). |
| `rel` | `string` | *(see below)* | Anchor rel attribute. Auto-fills to `noopener` when `target="_blank"` is set and no explicit `rel` is provided. |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `MouseEvent` | Emitted on every plain click (not when disabled). Modifier-clicks (Ctrl/Cmd/Middle) pass through to the browser. |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Link content (text, icons, anything inline). |

### CSS Classes (legacy / advanced)

| Class | Description |
|-------|-------------|
| `.coar-link` | Base link style — accent color, underline on hover |
| `.coar-link--subtle` | Subtle variant with less color emphasis |
| `.coar-link--s` / `--m` / `--l` | Typography size |
| `.coar-link--disabled` | Disabled appearance (combine with `aria-disabled="true"`) |
