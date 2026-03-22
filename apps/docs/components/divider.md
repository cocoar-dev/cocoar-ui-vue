# Divider

Dividers create clear visual breaks between sections of content. They're especially useful in forms, settings panels, and feeds where distinct groups of information sit close together. Add an optional text label to give the break semantic meaning.

```ts
import { CoarDivider } from '@cocoar/vue-ui';
```

## Basic Divider

A clean horizontal line that separates content blocks. Drop it between any two sections to improve scannability.

<preview path="./divider/demos/DividerBasic.vue" />

## With Label

Embed a text label directly in the divider line to describe what follows -- common in forms ("or continue with") and settings pages.

<preview path="./divider/demos/DividerLabel.vue" />

## Alignment

Position the label at the start, center, or end of the line to match your layout's reading flow.

<preview path="./divider/demos/DividerAlignment.vue" />

## Variants

Choose from three visual weights: `default` for standard sections, `subtle` for light separation within a card, and `bold` for strong visual breaks.

<preview path="./divider/demos/DividerVariants.vue" />

## Real-world Usage

A classic login form pattern where a labeled divider separates OAuth sign-in buttons from the traditional email/password fields.

<preview path="./divider/demos/DividerRealWorld.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `undefined` | Text label in the divider |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Label alignment |
| `variant` | `'default' \| 'subtle' \| 'bold'` | `'default'` | Line style variant |
