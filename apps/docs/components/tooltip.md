---
description: "v-tooltip directive — text-only hover and focus hints for any element, with placement options and accessible labels for icon buttons"
---

# Tooltip

Tooltips are small, text-only hints that appear on hover or focus. They are the simplest way to add contextual labels to icon buttons, truncated text, or any element that benefits from a brief explanation. Use the `v-tooltip` directive on any element -- no wrapper component needed.

```ts
import { vTooltip } from '@cocoar/vue-ui';
```

## Basic Tooltip

Pass a string directly to `v-tooltip` for the quickest setup. Hover over any button below to see its tooltip.

<preview path="./tooltip/demos/TooltipBasic.vue" />

## Placements

By default, tooltips appear above the trigger. Use the options object form to position them on any side. Pick the placement that avoids clipping in your layout.

<preview path="./tooltip/demos/TooltipPlacements.vue" />

## On Icon Buttons

Icon-only buttons look clean, but their meaning can be ambiguous. Adding a tooltip provides both a visual hint for sighted users and an accessible label for screen readers -- making tooltips essential for any icon-only control.

<preview path="./tooltip/demos/TooltipIcons.vue" />

## On Any Element

`v-tooltip` is a directive, so it works on any HTML element -- spans, icons, code snippets, or custom components. No special wrapper needed.

<preview path="./tooltip/demos/TooltipElements.vue" />

::: tip Tooltip vs Popover
Use **Tooltip** for short, non-interactive text hints on hover or focus. Use **Popover** for rich interactive content that opens on click. Tooltips are text-only and disappear when the pointer leaves; popovers can hold buttons, forms, and full HTML.
:::

## API

### `v-tooltip` Options

The directive accepts either a plain string or an options object:

```vue
<!-- String shorthand -->
<CoarButton v-tooltip="'Save changes'">Save</CoarButton>

<!-- Options object -->
<CoarButton v-tooltip="{ text: 'Delete item', placement: 'top' }">Delete</CoarButton>
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `text` | `string` | -- | Tooltip text (or pass string directly to the directive) |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Preferred tooltip placement |
| `disabled` | `boolean` | `false` | Disable the tooltip |
