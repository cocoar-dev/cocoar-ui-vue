---
description: "CoarNote — callout for supplementary information with six semantic color variants, three padding sizes and rich HTML slot content"
---

# Note

Notes call attention to supplementary information without interrupting the main content flow. Use them for tips, requirements, deprecation warnings, or any contextual message that readers should notice but shouldn't be blocked by. A colored left border and tinted background create just enough contrast to stand out.

```ts
import { CoarNote } from '@cocoar/vue-ui';
```

## Color Variants

Six semantic variants communicate intent at a glance: `info` for tips, `success` for confirmations, `warning` for cautions, `error` for critical issues, `neutral` for general remarks, and `accent` for brand-specific callouts.

<preview path="./note/demos/NoteVariants.vue" />

## Padding Sizes

Use `m` (the default) for standalone callouts, `s` inside compact layouts like cards or sidebars, and `l` for more prominent call-to-action notes.

<preview path="./note/demos/NotePadding.vue" />

## Rich Content

The default slot accepts any HTML, so you can include links, bold text, inline code, and multi-line content without limitations.

<preview path="./note/demos/NoteRichContent.vue" />

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
