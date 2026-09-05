<!-- Generated from apps/docs/components/tooltip.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Tooltip

Tooltips are small, text-only hints that appear on hover or focus. They are the simplest way to add contextual labels to icon buttons, truncated text, or any element that benefits from a brief explanation. Use the `v-tooltip` directive on any element -- no wrapper component needed.

```ts
import { vTooltip } from '@cocoar/vue-ui';
```

## Basic Tooltip

Pass a string directly to `v-tooltip` for the quickest setup. Hover over any button below to see its tooltip.

**Demo — `tooltip/demos/TooltipBasic.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton v-tooltip="'Save your changes'">Save</CoarButton>
    <CoarButton variant="danger" v-tooltip="'This action cannot be undone'">Delete</CoarButton>
    <CoarButton variant="ghost" v-tooltip="'Cancel and go back'">Cancel</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, vTooltip } from '@cocoar/vue-ui';
</script>
```

## Placements

By default, tooltips appear above the trigger. Use the options object form to position them on any side. Pick the placement that avoids clipping in your layout.

**Demo — `tooltip/demos/TooltipPlacements.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 16px 0;">
    <CoarButton v-tooltip="{ text: 'Top tooltip', placement: 'top' }">Top</CoarButton>
    <CoarButton v-tooltip="{ text: 'Bottom tooltip', placement: 'bottom' }">Bottom</CoarButton>
    <CoarButton v-tooltip="{ text: 'Left tooltip', placement: 'left' }">Left</CoarButton>
    <CoarButton v-tooltip="{ text: 'Right tooltip', placement: 'right' }">Right</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, vTooltip } from '@cocoar/vue-ui';
</script>
```

## On Icon Buttons

Icon-only buttons look clean, but their meaning can be ambiguous. Adding a tooltip provides both a visual hint for sighted users and an accessible label for screen readers -- making tooltips essential for any icon-only control.

**Demo — `tooltip/demos/TooltipIcons.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="ghost" icon-start="plus" v-tooltip="'Add new item'" aria-label="Add new item" />
    <CoarButton variant="ghost" icon-start="copy" v-tooltip="'Copy to clipboard'" aria-label="Copy" />
    <CoarButton variant="ghost" icon-start="trash-2" v-tooltip="'Delete selected'" aria-label="Delete" />
    <CoarButton variant="ghost" icon-start="settings" v-tooltip="'Open settings'" aria-label="Settings" />
  </div>
</template>

<script setup lang="ts">
import { CoarButton, vTooltip } from '@cocoar/vue-ui';
</script>
```

## On Any Element

`v-tooltip` is a directive, so it works on any HTML element -- spans, icons, code snippets, or custom components. No special wrapper needed.

**Demo — `tooltip/demos/TooltipElements.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <span
      v-tooltip="'This is a span'"
      style="padding: 4px 8px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 4px; font-size: 13px; cursor: default;"
    >Hover me (span)</span>
    <CoarIcon name="circle-help" size="l" v-tooltip="'Help: Click for more info'" style="cursor: help" />
    <code
      v-tooltip="'CSS custom property'"
      style="cursor: default; background: var(--coar-background-neutral-tertiary); padding: 2px 6px; border-radius: 3px; font-size: 13px;"
    >--coar-spacing-m</code>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon, vTooltip } from '@cocoar/vue-ui';
</script>
```

> **Tip: Tooltip vs Popover**
>
> Use **Tooltip** for short, non-interactive text hints on hover or focus. Use **Popover** for rich interactive content that opens on click. Tooltips are text-only and disappear when the pointer leaves; popovers can hold buttons, forms, and full HTML.

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
