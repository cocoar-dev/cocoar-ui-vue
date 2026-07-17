---
description: "CoarDivider — horizontal separator with optional slotted label, left/center/right alignment, subtle or strong weight and spacing controls."
---

# Divider

Dividers create clear visual breaks between sections of content. They're especially useful in forms, settings panels, and feeds where distinct groups of information sit close together. Add an optional text label to give the break semantic meaning.

```ts
import { CoarDivider } from '@cocoar/vue-ui';
```

## Basic Divider

A clean horizontal line that separates content blocks. Drop it between any two sections to improve scannability.

<preview path="./divider/demos/DividerBasic.vue" />

## With Content

Embed text directly in the divider line via the default slot -- common in forms ("or continue with") and settings pages.

<preview path="./divider/demos/DividerLabel.vue" />

## Alignment

Position the content to the `left`, `center`, or `right` of the line to match your layout's reading flow.

<preview path="./divider/demos/DividerAlignment.vue" />

## Variants

Two visual weights: `subtle` (the default) for light separation within a card, and `strong` for more prominent visual breaks.

<preview path="./divider/demos/DividerVariants.vue" />

## Real-world Usage

A classic login form pattern where a labeled divider separates OAuth sign-in buttons from the traditional email/password fields.

<preview path="./divider/demos/DividerRealWorld.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `align` | `'left' \| 'center' \| 'right'` | `'center'` | Content alignment |
| `variant` | `'subtle' \| 'strong'` | `'subtle'` | Line visual weight |
| `width` | `number` | `90` | Divider width as a percentage (0–100) |
| `spacingTop` | `number` | `0` | Top spacing in pixels |
| `spacingBottom` | `number` | `0` | Bottom spacing in pixels |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Optional content displayed centered on the line |
