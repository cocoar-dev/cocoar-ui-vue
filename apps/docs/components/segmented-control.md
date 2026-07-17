---
description: "CoarSegmentedControl — toolbar button-bar for switching between mutually-exclusive view options, with icons, four sizes, disabled segments and full-width mode"
---

# Segmented Control

Switch between a small fixed set of mutually-exclusive options like view modes, filters, density, or time ranges. A segmented control reads as a button-bar for view-state — same semantics as a radio group (single selection from N options), different visual register: it belongs in toolbars and headers, not in forms.

```ts
import { CoarSegmentedControl } from '@cocoar/vue-ui';
```

## Basic Usage

Pass an array of `{ value, label }` options and bind the active value via `v-model`. The control is generic over the option's value type, so the model and event payloads stay strongly typed.

<preview path="./segmented-control/demos/SegmentedControlBasic.vue" />

## Sizes

Heights and font sizes line up with `CoarButton`'s `xs / s / m / l` so the segmented control sits naturally next to other buttons in a toolbar. Default is `s`.

<preview path="./segmented-control/demos/SegmentedControlSizes.vue" />

## With Icons

Each option accepts an optional `icon` (`CoarIcon` name) rendered before the label. Icon-only segments work too — pass `ariaLabel` on the option for screen-reader text when the visible label is empty.

<preview path="./segmented-control/demos/SegmentedControlIcons.vue" />

## Disabled

Disable a single option to hide a state that's currently unavailable, or disable the whole control when the surrounding context is read-only.

<preview path="./segmented-control/demos/SegmentedControlDisabled.vue" />

## Full Width

Set `fullWidth` to make the control fill its container; segments share the available width equally. Useful in narrow side panels and mobile layouts.

<preview path="./segmented-control/demos/SegmentedControlFullWidth.vue" />

## When to Use

| Use a segmented control when… | Use a radio group instead when… |
|---|---|
| The choices are 2–6 view-state options | The choices are part of a form being submitted |
| The control sits in a toolbar / header | The control sits in a labelled form field |
| Choosing should switch the UI immediately | Choosing should be confirmed by a Submit |

## Accessibility

The control is exposed as `role="group"` with the `ariaLabel` you pass; each segment is a `<button type="button">` with `aria-pressed` reflecting the active state. Screen readers announce both the group label and the pressed state of the active segment. Disabled segments use the native `disabled` attribute.

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `T` (required) | — | Active option's `value`. |
| `options` | `CoarSegmentedControlOption<T>[]` | — | List of segments. |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'s'` | Sizes match `CoarButton`. |
| `disabled` | `boolean` | `false` | Disable the entire control. |
| `fullWidth` | `boolean` | `false` | Stretch to fill the parent's width. |
| `ariaLabel` | `string` | — | Screen-reader label for the group. |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `T` | Standard v-model update. |
| `change` | `(value: T, option: CoarSegmentedControlOption<T>)` | Fired only when the user picks a *different* option. |

### `CoarSegmentedControlOption<T>`

| Field | Type | Description |
|-------|------|-------------|
| `value` | `T` | Bound to `v-model`. |
| `label` | `string` | Visible label. May be empty for icon-only segments. |
| `icon` | `string` | Optional `CoarIcon` name rendered before the label. |
| `disabled` | `boolean` | Disable just this segment. |
| `ariaLabel` | `string` | Override aria-label for the segment (typical for icon-only). |
