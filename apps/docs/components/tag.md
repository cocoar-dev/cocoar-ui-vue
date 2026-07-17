---
description: "CoarTag — label chip with six semantic color variants, three sizes, closable and selectable modes for metadata, categories and filter bars"
---

# Tag

Tags label, categorize, and organize content. Use them for metadata (status labels, technology stacks), filter chips, or user-driven selections. Unlike badges, which show counts and status dots, tags convey descriptive information that users can read and often interact with.

```ts
import { CoarTag } from '@cocoar/vue-ui';
```

## Color Variants

Six semantic variants let you color-code categories, statuses, or priority levels consistently across your application.

<preview path="./tag/demos/TagVariants.vue" />

## Sizes

Three sizes to match the surrounding context -- `s` for data tables, `m` for general use, and `l` for prominent labels.

<preview path="./tag/demos/TagSizes.vue" />

## Closable Tags

Enable the `closable` prop to let users remove tags. Listen to the `@closed` event to update your data. Ideal for filter bars, selected options, and editable tag lists.

<preview path="./tag/demos/TagClosable.vue" />

## Selectable Tags

Make tags toggleable for selection interfaces -- filter panels, interest pickers, or any multi-choice input that benefits from a visual, chip-style UI.

<preview path="./tag/demos/TagSelectable.vue" />

## Tag Groups

Cluster related tags together to label content. This pattern works well for article metadata, skill sets, and category breakdowns.

<preview path="./tag/demos/TagGroups.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'neutral' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'accent'` | `'neutral'` | Tag color variant |
| `size` | `'s' \| 'm' \| 'l'` | `'m'` | Tag size |
| `closable` | `boolean` | `false` | Show close button |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `closed` | — | Emitted when the close button is clicked |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.tag.remove` | `'Remove tag'` | Close button `aria-label` (when `closable` is true) |
