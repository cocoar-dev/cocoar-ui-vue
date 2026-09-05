<!-- Generated from apps/docs/components/spinner.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Spinner

Spinners signal that something is loading when you can't show a progress bar. They tell users "we're working on it" for network requests, lazy-loaded content, or any asynchronous operation with an unpredictable duration.

```ts
import { CoarSpinner } from '@cocoar/vue-ui';
```

## Basic Spinner

Drop in a spinner wherever content is still loading. It animates continuously until you remove it or swap in the real content.

**Demo — `spinner/demos/SpinnerBasic.vue`**

```vue
<template>
  <div style="display: flex; justify-content: center; padding: 24px;">
    <CoarSpinner />
  </div>
</template>

<script setup lang="ts">
import { CoarSpinner } from '@cocoar/vue-ui';
</script>
```

## Sizes

Four sizes to fit any context -- `xs` for inline loading indicators next to text, up to `l` for full-page or overlay states.

**Demo — `spinner/demos/SpinnerSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-end; justify-content: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <CoarSpinner size="xs" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">xs</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <CoarSpinner size="s" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">s</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <CoarSpinner size="m" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">m</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <CoarSpinner size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">l</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarSpinner } from '@cocoar/vue-ui';
</script>
```

## With Loading Text

Pair a spinner with a descriptive message so users know what's being loaded, not just that something is happening.

**Demo — `spinner/demos/SpinnerWithText.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <CoarSpinner size="s" />
      <span style="font-size: 14px;">Loading data...</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <CoarSpinner size="m" />
      <span style="font-size: 14px;">Saving changes...</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <CoarSpinner size="l" />
      <span>Processing request...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarSpinner } from '@cocoar/vue-ui';
</script>
```

## Full Page Overlay

Center a spinner in a container overlay to block interaction while critical data loads. This pattern works well for initial page loads and modal content.

**Demo — `spinner/demos/SpinnerOverlay.vue`**

```vue
<template>
  <div class="loading-overlay">
    <CoarSpinner size="l" />
    <span style="font-size: 14px;">Loading application...</span>
  </div>
</template>

<script setup lang="ts">
import { CoarSpinner } from '@cocoar/vue-ui';
</script>

<style scoped>
.loading-overlay {
  background: var(--coar-background-neutral-primary);
  border-radius: 8px;
  border: 1px solid var(--coar-border-neutral-secondary);
  padding: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 160px;
  justify-content: center;
}
</style>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Spinner size |
| `label` | `string` | `'Loading'` | Accessible label for screen readers |
