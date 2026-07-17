---
description: "CoarButton — action button with five variants, four sizes, icons, loading and disabled states, full width and router-aware link rendering."
---

# Button

Buttons trigger actions and communicate what will happen when pressed.

```ts
import { CoarButton } from '@cocoar/vue-ui';
```

## Variants

Choose the appropriate variant based on the action's importance and context.

<preview path="./button/demos/ButtonVariants.vue" />

**When to use each variant:**

- **Primary** — Main call-to-action. Use sparingly, typically once per view.
- **Secondary** — Alternative actions. Pairs well with primary buttons.
- **Tertiary** — Low-emphasis actions with brand color hint.
- **Danger** — Destructive actions like delete or remove.
- **Ghost** — Minimal emphasis, often for cancel or dismiss.

## Sizes

Four sizes to fit different contexts and layouts.

<preview path="./button/demos/ButtonSizes.vue" />

## Icons

Add icons before or after the label to enhance meaning.

<preview path="./button/demos/ButtonIcons.vue" />

## Loading State

Show a spinner while an async action is in progress. Click to test.

<preview path="./button/demos/ButtonLoading.vue" />

## Disabled State

Disable buttons when actions are not available.

<preview path="./button/demos/ButtonDisabled.vue" />

## Full Width

Buttons can expand to fill their container.

<preview path="./button/demos/ButtonFullWidth.vue" />

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

::: info
`vue-router` is declared as an **optional `peerDependenciesMeta`** entry of `@cocoar/vue-ui` — install it if you want SPA routing, omit it for click-emit-only / external-URL use. Apps without a router can use `<CoarButton>` exactly as before; setting `to` to a string URL still gives you a proper `<a href>` for browser navigation.
:::

::: warning Object `to` without router
Passing an object literal (`:to="{ name: 'docs' }"`) when no router is installed falls back to `String(to)`, producing `href="[object Object]"` — a broken link. The component logs a DEV-only `console.warn` once per component instance to make this loud at dev-time. Pass a string path for the no-router case.
:::

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to button |
| `Shift + Tab` | Move focus backward |
| `Enter` | Activate button |
| `Space` | Activate button |

::: info
Disabled and loading buttons cannot be activated via keyboard.
:::

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

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.button.loading` | `'Loading'` | Screen reader announcement when `loading` is true |
