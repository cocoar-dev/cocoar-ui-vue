<!-- Generated from apps/docs/components/tag.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Tag

Tags label, categorize, and organize content. Use them for metadata (status labels, technology stacks), filter chips, or user-driven selections. Unlike badges, which show counts and status dots, tags convey descriptive information that users can read and often interact with.

```ts
import { CoarTag } from '@cocoar/vue-ui';
```

## Color Variants

Six semantic variants let you color-code categories, statuses, or priority levels consistently across your application.

**Demo — `tag/demos/TagVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarTag variant="neutral">Neutral</CoarTag>
    <CoarTag variant="info">Info</CoarTag>
    <CoarTag variant="success">Success</CoarTag>
    <CoarTag variant="warning">Warning</CoarTag>
    <CoarTag variant="error">Error</CoarTag>
    <CoarTag variant="accent">Accent</CoarTag>
  </div>
</template>

<script setup lang="ts">
import { CoarTag } from '@cocoar/vue-ui';
</script>
```

## Sizes

Three sizes to match the surrounding context -- `s` for data tables, `m` for general use, and `l` for prominent labels.

**Demo — `tag/demos/TagSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end;">
    <CoarTag variant="info" size="s">Small</CoarTag>
    <CoarTag variant="info" size="m">Medium</CoarTag>
    <CoarTag variant="info" size="l">Large</CoarTag>
  </div>
</template>

<script setup lang="ts">
import { CoarTag } from '@cocoar/vue-ui';
</script>
```

## Closable Tags

Enable the `closable` prop to let users remove tags. Listen to the `@closed` event to update your data. Ideal for filter bars, selected options, and editable tag lists.

**Demo — `tag/demos/TagClosable.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarTag
      v-for="tag in tags"
      :key="tag"
      variant="info"
      closable
      @closed="removeTag(tag)"
    >{{ tag }}</CoarTag>
    <span v-if="tags.length === 0" style="font-size: 14px; color: #94a3b8;">All tags removed</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTag } from '@cocoar/vue-ui';

const tags = ref(['Vue 3', 'TypeScript', 'Vite', 'Pinia', 'TailwindCSS']);

function removeTag(tag: string) {
  tags.value = tags.value.filter(t => t !== tag);
}
</script>
```

## Selectable Tags

Make tags toggleable for selection interfaces -- filter panels, interest pickers, or any multi-choice input that benefits from a visual, chip-style UI.

**Demo — `tag/demos/TagSelectable.vue`**

```vue
<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
      <CoarTag
        v-for="tech in options"
        :key="tech"
        :variant="activeTags.includes(tech) ? 'info' : 'neutral'"
        style="cursor: pointer;"
        @click="toggleTag(tech)"
      >{{ tech }}</CoarTag>
    </div>
    <p style="margin: 8px 0 0; font-size: 13px; color: #64748b;">Active: {{ activeTags.join(', ') || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTag } from '@cocoar/vue-ui';

const options = ['vue', 'typescript', 'vite', 'pinia'];
const activeTags = ref(['vue', 'typescript']);

function toggleTag(tag: string) {
  const i = activeTags.value.indexOf(tag);
  if (i >= 0) activeTags.value.splice(i, 1);
  else activeTags.value.push(tag);
}
</script>
```

## Tag Groups

Cluster related tags together to label content. This pattern works well for article metadata, skill sets, and category breakdowns.

**Demo — `tag/demos/TagGroups.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <p style="font-size: 13px; color: #64748b; margin: 0 0 4px;">Status</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <CoarTag variant="success">Active</CoarTag>
        <CoarTag variant="warning">Pending</CoarTag>
        <CoarTag variant="error">Expired</CoarTag>
      </div>
    </div>
    <div>
      <p style="font-size: 13px; color: #64748b; margin: 0 0 4px;">Technologies</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <CoarTag variant="accent">Vue 3</CoarTag>
        <CoarTag variant="accent">TypeScript</CoarTag>
        <CoarTag variant="accent">Vite</CoarTag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarTag } from '@cocoar/vue-ui';
</script>
```

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

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.tag.remove` | `'Remove tag'` | Close button `aria-label` (when `closable` is true) |
