<!-- Generated from apps/docs/components/progress-bar.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Progress Bar

Progress bars keep users informed about ongoing operations -- file uploads, multi-step workflows, or background tasks. They reduce uncertainty by showing either a concrete completion percentage or an animated indicator when the duration is unknown.

```ts
import { CoarProgressBar } from '@cocoar/vue-ui';
```

## Basic Progress

Bind a numeric `value` (0--100) to show determinate progress. Ideal for file uploads, form completion, or any task where you can measure how much work remains.

**Demo — `progress-bar/demos/ProgressBarBasic.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarProgressBar :value="progress" />
    <div style="display: flex; gap: 8px; align-items: center;">
      <button class="adj-btn" @click="progress = Math.max(0, progress - 10)">-10</button>
      <span style="min-width: 40px; text-align: center; font-size: 14px;">{{ progress }}%</span>
      <button class="adj-btn" @click="progress = Math.min(100, progress + 10)">+10</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarProgressBar } from '@cocoar/vue-ui';

const progress = ref(65);
</script>

<style scoped>
.adj-btn {
  padding: 4px 12px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 6px;
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  font-size: 14px;
}
.adj-btn:hover {
  background: var(--coar-background-neutral-tertiary);
}
</style>
```

## Indeterminate

When you can't predict how long an operation will take -- network requests, server-side processing -- switch to indeterminate mode for a continuous animation that signals "working on it."

**Demo — `progress-bar/demos/ProgressBarIndeterminate.vue`**

```vue
<template>
  <CoarProgressBar indeterminate />
</template>

<script setup lang="ts">
import { CoarProgressBar } from '@cocoar/vue-ui';
</script>
```

## Color Variants

Match the bar color to its context: `accent` (default) for standard progress, `success` for completed uploads, `warning` for approaching limits, `error` for failed operations.

**Demo — `progress-bar/demos/ProgressBarVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <span style="font-size: 13px; color: #64748b;">Accent (default)</span>
      <CoarProgressBar :value="75" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Success</span>
      <CoarProgressBar :value="75" variant="success" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Warning</span>
      <CoarProgressBar :value="75" variant="warning" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Error</span>
      <CoarProgressBar :value="75" variant="error" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarProgressBar } from '@cocoar/vue-ui';
</script>
```

## Sizes

Three heights give you flexibility. Use `s` inside compact cards or table rows, `m` for standard layouts, and `l` when the progress bar is the focal point.

**Demo — `progress-bar/demos/ProgressBarSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <span style="font-size: 13px; color: #64748b;">Small</span>
      <CoarProgressBar :value="60" size="s" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Medium (default)</span>
      <CoarProgressBar :value="60" size="m" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Large</span>
      <CoarProgressBar :value="60" size="l" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarProgressBar } from '@cocoar/vue-ui';
</script>
```

## Live Progress

A continuously animating example that shows how the bar transitions smoothly as the value changes.

**Demo — `progress-bar/demos/ProgressBarAnimated.vue`**

```vue
<template>
  <div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <span style="font-size: 14px;">Processing...</span>
      <span style="font-size: 14px;">{{ animatedProgress }}%</span>
    </div>
    <CoarProgressBar :value="animatedProgress" variant="info" size="l" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { CoarProgressBar } from '@cocoar/vue-ui';

const animatedProgress = ref(0);
let interval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  interval = setInterval(() => {
    animatedProgress.value = (animatedProgress.value + 1) % 101;
  }, 50);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>
```

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
