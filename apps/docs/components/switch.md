---
description: "CoarSwitch — toggle for boolean settings that apply immediately, with four sizes, label positioning, validation states and keyboard and screen-reader support"
---

# Switch

A toggle for boolean settings that take effect immediately -- think "Enable notifications" or "Dark mode". Unlike a [Checkbox](/components/checkbox), a switch signals instant action rather than a deferred choice that requires a submit button.

```ts
import { CoarSwitch } from '@cocoar/vue-ui';
```

## Basic Usage

Bind a boolean with `v-model` and provide a `label`. The switch flips on click or keyboard activation.

<preview path="./switch/demos/BasicSwitch.vue" />

## With Hint Text

Wrap in `CoarFormField` with a `hint` prop to add a brief explanation, helping users understand the consequence of toggling.

<preview path="./switch/demos/SwitchHint.vue" />

## States

Supports `disabled` (both on and off), `required`, and `error` states for complete form validation coverage.

<preview path="./switch/demos/SwitchStates.vue" />

## Sizes

Four sizes so the switch fits naturally alongside other controls at any density.

<preview path="./switch/demos/SwitchSizes.vue" />

## Label Position

Place the label before or after the switch with the `labelPosition` prop. Defaults to `'after'`.

<preview path="./switch/demos/SwitchLabelPosition.vue" />

## Settings Panel Example

Switches shine in settings panels where each row controls an independent feature. Here is a typical layout pattern.

<preview path="./switch/demos/SwitchSettingsPanel.vue" />

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to switch |
| `Space` | Toggle on/off state |
| `Enter` | Toggle on/off state |

::: info
Switches use `role="switch"` with `aria-checked` to properly communicate state to screen readers.
:::

### Screen Reader Support

- Label text announces on focus
- On/off state properly communicated via `aria-checked`
- Hint text accessible via `aria-describedby`
- Error messages announced when present

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `boolean` | `false` | Switch on/off state |
| `label` | `string` | `''` | Label text |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Switch size |
| `disabled` | `boolean` | `false` | Disable the switch |
| `labelPosition` | `'before' \| 'after'` | `'after'` | Label position relative to the switch |
