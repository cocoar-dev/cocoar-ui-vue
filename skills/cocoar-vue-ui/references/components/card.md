<!-- Generated from apps/docs/components/card.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Card

Cards group related content into a visually distinct container, making it easy for users to scan and interact with discrete chunks of information. Use them for dashboards, content feeds, settings panels, or anywhere you need clear visual boundaries.

```ts
import { CoarCard } from '@cocoar/vue-ui';
```

## Basic Usage

A straightforward card with a title and body text. Cards provide structure without imposing rigid layout rules -- just slot in whatever content you need.

**Demo — `card/demos/CardBasic.vue`**

```vue
<template>
  <CoarCard elevated>
    <h4 style="margin: 0 0 4px;">Card Title</h4>
    <p style="margin: 0; font-size: 14px;">This is a basic card with default settings. Cards help organize content into distinct sections.</p>
  </CoarCard>
</template>

<script setup lang="ts">
import { CoarCard } from '@cocoar/vue-ui';
</script>
```

## Elevated vs Outlined

Choose `elevated` for cards that need to stand out from the page (primary content), or `outlined` for a subtler border-based style that sits flatter in the layout.

**Demo — `card/demos/CardElevatedOutlined.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarCard elevated>
      <span style="font-size: 14px;">Elevated — box shadow for depth</span>
    </CoarCard>
    <CoarCard variant="outlined">
      <span style="font-size: 14px;">Outlined — border without shadow</span>
    </CoarCard>
  </div>
</template>

<script setup lang="ts">
import { CoarCard } from '@cocoar/vue-ui';
</script>
```

## Color Variants

Semantic color variants add a tinted background to convey meaning at a glance -- info for tips, success for confirmations, warning and error for alerts.

**Demo — `card/demos/CardVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarCard variant="info" elevated><span style="font-size: 14px;">Info — tips, guidance, neutral context</span></CoarCard>
    <CoarCard variant="success" elevated><span style="font-size: 14px;">Success — positive results</span></CoarCard>
    <CoarCard variant="warning" elevated><span style="font-size: 14px;">Warning — caution, attention needed</span></CoarCard>
    <CoarCard variant="error" elevated><span style="font-size: 14px;">Error — problems, validation failures</span></CoarCard>
    <CoarCard variant="neutral" elevated><span style="font-size: 14px;">Neutral — default, no semantic meaning</span></CoarCard>
  </div>
</template>

<script setup lang="ts">
import { CoarCard } from '@cocoar/vue-ui';
</script>
```

## Padding Sizes

Adjust internal spacing to suit your content density. Use `s` for compact data cards, `m` for general use, and `l` when the card is the primary focus of the page.

**Demo — `card/demos/CardPadding.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarCard elevated padding="s">
      <span style="font-size: 14px;">Small padding (s)</span>
    </CoarCard>
    <CoarCard elevated padding="m">
      <span style="font-size: 14px;">Medium padding (m) — default</span>
    </CoarCard>
    <CoarCard elevated padding="l">
      <span style="font-size: 14px;">Large padding (l)</span>
    </CoarCard>
  </div>
</template>

<script setup lang="ts">
import { CoarCard } from '@cocoar/vue-ui';
</script>
```

## Rich Content Example

Cards shine when combining multiple elements. Here a header, tags, body text, and action buttons work together inside a single card.

**Demo — `card/demos/CardRichContent.vue`**

```vue
<template>
  <CoarCard elevated style="max-width: 400px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
      <h4 style="margin: 0;">New Feature Release</h4>
      <span style="font-size: 14px; color: #64748b;">2 hours ago</span>
    </div>
    <p style="margin: 8px 0; font-size: 14px;">
      We've just released a major update to the date picker component. It now supports timezone-aware datetime selection using the Temporal API.
    </p>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
      <CoarTag variant="info">New</CoarTag>
      <CoarTag variant="success">Stable</CoarTag>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      <CoarButton variant="primary" size="s">Read More</CoarButton>
      <CoarButton variant="ghost" size="s">Dismiss</CoarButton>
    </div>
  </CoarCard>
</template>

<script setup lang="ts">
import { CoarCard, CoarTag, CoarButton } from '@cocoar/vue-ui';
</script>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'neutral' \| 'outlined' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'accent'` | `'neutral'` | Card color/style variant |
| `padding` | `'none' \| 's' \| 'm' \| 'l'` | `'m'` | Internal padding size |
| `elevated` | `boolean` | `false` | Add box shadow for elevation |
| `borderless` | `boolean` | `false` | Hide the border |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Card content |
| `#header` | Fixed header area |
| `#footer` | Fixed footer area |
| `#inset` | Full-width inset area (negative margins) |
