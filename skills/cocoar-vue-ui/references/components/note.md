<!-- Generated from apps/docs/components/note.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Note

Notes call attention to supplementary information without interrupting the main content flow. Use them for tips, requirements, deprecation warnings, or any contextual message that readers should notice but shouldn't be blocked by. A colored left border and tinted background create just enough contrast to stand out.

```ts
import { CoarNote } from '@cocoar/vue-ui';
```

## Color Variants

Six semantic variants communicate intent at a glance: `info` for tips, `success` for confirmations, `warning` for cautions, `error` for critical issues, `neutral` for general remarks, and `accent` for brand-specific callouts.

**Demo — `note/demos/NoteVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarNote variant="info"><strong>Info:</strong> Informational message for guidance or context.</CoarNote>
    <CoarNote variant="success"><strong>Success:</strong> Action completed successfully.</CoarNote>
    <CoarNote variant="warning"><strong>Warning:</strong> Pay attention, potential issue ahead.</CoarNote>
    <CoarNote variant="error"><strong>Error:</strong> Something went wrong. Action required.</CoarNote>
    <CoarNote variant="neutral">Neutral note for general content without semantic meaning.</CoarNote>
    <CoarNote variant="accent">Accent-colored note for brand-specific or promotional callouts.</CoarNote>
  </div>
</template>

<script setup lang="ts">
import { CoarNote } from '@cocoar/vue-ui';
</script>
```

## Padding Sizes

Use `m` (the default) for standalone callouts, `s` inside compact layouts like cards or sidebars, and `l` for more prominent call-to-action notes.

**Demo — `note/demos/NotePadding.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarNote variant="info" padding="s">Small padding — compact notes in tight spaces.</CoarNote>
    <CoarNote variant="info" padding="m">Medium padding (default) — standard note spacing.</CoarNote>
  </div>
</template>

<script setup lang="ts">
import { CoarNote } from '@cocoar/vue-ui';
</script>
```

## Rich Content

The default slot accepts any HTML, so you can include links, bold text, inline code, and multi-line content without limitations.

**Demo — `note/demos/NoteRichContent.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarNote variant="info">
      <strong>Did you know?</strong> The Temporal API is the modern JavaScript standard for date/time handling.
      It provides <code>PlainDate</code>, <code>PlainDateTime</code>, and <code>ZonedDateTime</code> types
      for precise date and time manipulation without timezone ambiguity.
    </CoarNote>
    <CoarNote variant="warning">
      <strong>Breaking Change in v2.0:</strong> The <code>value</code> prop has been renamed to <code>modelValue</code>
      to align with Vue 3's composition API conventions. Update your code before upgrading.
    </CoarNote>
    <CoarNote variant="success">
      <strong>Migration Complete:</strong> Your project has been successfully upgraded to the latest version.
      All components have been updated and tests are passing.
    </CoarNote>
  </div>
</template>

<script setup lang="ts">
import { CoarNote } from '@cocoar/vue-ui';
</script>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'neutral' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'accent'` | `'neutral'` | Note color variant |
| `padding` | `'s' \| 'm' \| 'l'` | `'m'` | Internal padding size |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Note content (supports rich HTML) |
