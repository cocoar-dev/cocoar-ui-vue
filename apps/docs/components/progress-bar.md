---
description: "CoarProgressBar — determinate and indeterminate progress indicator with semantic color variants, three sizes, optional value display and accessible labels"
---

# Progress Bar

Progress bars keep users informed about ongoing operations -- file uploads, multi-step workflows, or background tasks. They reduce uncertainty by showing either a concrete completion percentage or an animated indicator when the duration is unknown.

```ts
import { CoarProgressBar } from '@cocoar/vue-ui';
```

## Basic Progress

Bind a numeric `value` (0--100) to show determinate progress. Ideal for file uploads, form completion, or any task where you can measure how much work remains.

<preview path="./progress-bar/demos/ProgressBarBasic.vue" />

## Indeterminate

When you can't predict how long an operation will take -- network requests, server-side processing -- switch to indeterminate mode for a continuous animation that signals "working on it."

<preview path="./progress-bar/demos/ProgressBarIndeterminate.vue" />

## Color Variants

Match the bar color to its context: `accent` (default) for standard progress, `success` for completed uploads, `warning` for approaching limits, `error` for failed operations.

<preview path="./progress-bar/demos/ProgressBarVariants.vue" />

## Sizes

Three heights give you flexibility. Use `s` inside compact cards or table rows, `m` for standard layouts, and `l` when the progress bar is the focal point.

<preview path="./progress-bar/demos/ProgressBarSizes.vue" />

## Live Progress

A continuously animating example that shows how the bar transitions smoothly as the value changes.

<preview path="./progress-bar/demos/ProgressBarAnimated.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Current progress value |
| `max` | `number` | `100` | Maximum progress value |
| `indeterminate` | `boolean` | `false` | Show animated indeterminate state |
| `variant` | `'accent' \| 'success' \| 'warning' \| 'error'` | `'accent'` | Color variant |
| `size` | `'s' \| 'm' \| 'l'` | `'m'` | Bar height |
| `label` | `string` | `''` | Accessible label for screen readers |
| `showValue` | `boolean` | `false` | Display the percentage value next to the bar |
