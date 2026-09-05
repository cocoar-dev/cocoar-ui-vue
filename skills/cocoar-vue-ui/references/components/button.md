<!-- Generated from apps/docs/components/button.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Button

Buttons trigger actions and communicate what will happen when pressed.

```ts
import { CoarButton } from '@cocoar/vue-ui';
```

## Variants

Choose the appropriate variant based on the action's importance and context.

**Demo — `button/demos/ButtonVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="primary">Primary</CoarButton>
    <CoarButton variant="secondary">Secondary</CoarButton>
    <CoarButton variant="tertiary">Tertiary</CoarButton>
    <CoarButton variant="danger">Danger</CoarButton>
    <CoarButton variant="ghost">Ghost</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
```

**When to use each variant:**

- **Primary** — Main call-to-action. Use sparingly, typically once per view.
- **Secondary** — Alternative actions. Pairs well with primary buttons.
- **Tertiary** — Low-emphasis actions with brand color hint.
- **Danger** — Destructive actions like delete or remove.
- **Ghost** — Minimal emphasis, often for cancel or dismiss.

## Sizes

Four sizes to fit different contexts and layouts.

**Demo — `button/demos/ButtonSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end;">
    <CoarButton size="xs">Extra Small</CoarButton>
    <CoarButton size="s">Small</CoarButton>
    <CoarButton size="m">Medium</CoarButton>
    <CoarButton size="l">Large</CoarButton>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
    <code>xs</code> 27px | <code>s</code> 32px | <code>m</code> 40px | <code>l</code> 48px
  </p>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
```

## Icons

Add icons before or after the label to enhance meaning.

**Demo — `button/demos/ButtonIcons.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton icon-start="plus">Add Item</CoarButton>
    <CoarButton variant="secondary" icon-end="chevron-right">Next</CoarButton>
    <CoarButton variant="tertiary" icon-start="clipboard">Download</CoarButton>
    <CoarButton variant="danger" icon-start="trash-2">Delete</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
```

## Loading State

Show a spinner while an async action is in progress. Click to test.

**Demo — `button/demos/ButtonLoading.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 13px; color: #64748b; min-width: 100px;">With start icon:</span>
      <CoarButton icon-start="check" :loading="isLoading" @click="simulateLoading">Save Changes</CoarButton>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 13px; color: #64748b; min-width: 100px;">Icon end:</span>
      <CoarButton icon-end="chevron-right" :loading="isLoadingEnd" @click="simulateLoadingEnd">Continue</CoarButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';

const isLoading = ref(false);
const isLoadingEnd = ref(false);

function simulateLoading() {
  isLoading.value = true;
  setTimeout(() => { isLoading.value = false; }, 2000);
}

function simulateLoadingEnd() {
  isLoadingEnd.value = true;
  setTimeout(() => { isLoadingEnd.value = false; }, 2000);
}
</script>
```

## Disabled State

Disable buttons when actions are not available.

**Demo — `button/demos/ButtonDisabled.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton :disabled="true">Primary</CoarButton>
    <CoarButton variant="secondary" :disabled="true">Secondary</CoarButton>
    <CoarButton variant="tertiary" :disabled="true">Tertiary</CoarButton>
    <CoarButton variant="danger" :disabled="true">Danger</CoarButton>
    <CoarButton variant="ghost" :disabled="true">Ghost</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
```

## Full Width

Buttons can expand to fill their container.

**Demo — `button/demos/ButtonFullWidth.vue`**

```vue
<template>
  <div style="max-width: 360px; display: flex; flex-direction: column; gap: 8px;">
    <CoarButton :full-width="true">Full Width Primary</CoarButton>
    <CoarButton variant="secondary" :full-width="true">Full Width Secondary</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
```

## Router Integration

Pass `to` to render the button as a real `<a href>` link instead of a `<button>`. The button keeps its full visual styling — variants, sizes, icons, loading spinner — but right-click → "Open in new tab", middle-click, and Ctrl/Cmd-click all work as expected via the browser's native link handling. Screenreaders announce "link" instead of "button".

```vue
<!-- Before — modifier-clicks silently did nothing -->
<CoarButton variant="primary" @click="router.push('/docs')">
  Open documentation
</CoarButton>

<!-- After — full browser link affordances -->
<CoarButton variant="primary" to="/docs">
  Open documentation
</CoarButton>
```

If `vue-router` is installed and registered (`app.use(router)`), the button renders via `<RouterLink>` and plain clicks trigger SPA navigation. Without a router it falls back to a plain `<a href={String(to)}>` that uses the browser's native navigation — useful for external links.

```vue
<!-- External link — works with or without vue-router -->
<CoarButton variant="ghost" iconEnd="external-link" to="https://docs.cocoar.dev">
  Documentation
</CoarButton>
```

`@click` still emits on plain click for telemetry and other consumer side-effects. Modifier-clicks (Ctrl/Cmd/Shift/Alt/middle-button) pass through to the browser without SPA navigation, so the user can open the destination in a new tab. `disabled` and `loading` block both navigation and the emit; the `type` attribute is only applied when rendering as `<button>` (it is invalid on `<a>`).

> **Info**
>
> `vue-router` is declared as an **optional `peerDependenciesMeta`** entry of `@cocoar/vue-ui` — install it if you want SPA routing, omit it for click-emit-only / external-URL use. Apps without a router can use `<CoarButton>` exactly as before; setting `to` to a string URL still gives you a proper `<a href>` for browser navigation.

> **Warning: Object `to` without router**
>
> Passing an object literal (`:to="{ name: 'docs' }"`) when no router is installed falls back to `String(to)`, producing `href="[object Object]"` — a broken link. The component logs a DEV-only `console.warn` once per component instance to make this loud at dev-time. Pass a string path for the no-router case.

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to button |
| `Shift + Tab` | Move focus backward |
| `Enter` | Activate button |
| `Space` | Activate button |

> **Info**
>
> Disabled and loading buttons cannot be activated via keyboard.

### Screen Reader Support

- Button text or `aria-label` announces on focus
- Disabled state properly communicated
- Loading state indicates button is busy
- Icon-only buttons should include `aria-label`
- `type` attribute ensures correct form behavior

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'tertiary' \| 'danger' \| 'ghost'` | `'primary'` | Button style variant |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Button size |
| `iconStart` | `string` | `undefined` | Icon name before label |
| `iconEnd` | `string` | `undefined` | Icon name after label |
| `loading` | `boolean` | `false` | Show loading spinner |
| `disabled` | `boolean` | `false` | Disable the button |
| `fullWidth` | `boolean` | `false` | Expand to fill container |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type (ignored when `to` is set — invalid on `<a>`) |
| `to` | `RouteLocationRaw \| string` | `undefined` | Vue Router target. When set, renders as `<a href>` via `<RouterLink>` (or plain `<a>` if no router is installed). Enables right-click / middle-click / Ctrl+click new-tab behaviour and "Copy link address". See [Router Integration](#router-integration). |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `MouseEvent` | Emitted when clicked (not when disabled/loading) |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.button.loading` | `'Loading'` | Screen reader announcement when `loading` is true |
