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
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `MouseEvent` | Emitted when clicked (not when disabled/loading) |
