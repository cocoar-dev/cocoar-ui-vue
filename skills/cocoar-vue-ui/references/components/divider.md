<!-- Generated from apps/docs/components/divider.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Divider

Dividers create clear visual breaks between sections of content. They're especially useful in forms, settings panels, and feeds where distinct groups of information sit close together. Add an optional text label to give the break semantic meaning.

```ts
import { CoarDivider } from '@cocoar/vue-ui';
```

## Basic Divider

A clean horizontal line that separates content blocks. Drop it between any two sections to improve scannability.

**Demo — `divider/demos/DividerBasic.vue`**

```vue
<template>
  <div>
    <p style="margin: 0 0 8px; font-size: 14px;">Content above the divider</p>
    <CoarDivider />
    <p style="margin: 8px 0 0; font-size: 14px;">Content below the divider</p>
  </div>
</template>

<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
</script>
```

## With Content

Embed text directly in the divider line via the default slot -- common in forms ("or continue with") and settings pages.

**Demo — `divider/demos/DividerLabel.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarDivider>Or continue with</CoarDivider>
    <CoarDivider>Section Title</CoarDivider>
    <CoarDivider>More options</CoarDivider>
  </div>
</template>

<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
</script>
```

## Alignment

Position the content to the `left`, `center`, or `right` of the line to match your layout's reading flow.

**Demo — `divider/demos/DividerAlignment.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarDivider align="left">Left</CoarDivider>
    <CoarDivider align="center">Center (default)</CoarDivider>
    <CoarDivider align="right">Right</CoarDivider>
  </div>
</template>

<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
</script>
```

## Variants

Two visual weights: `subtle` (the default) for light separation within a card, and `strong` for more prominent visual breaks.

**Demo — `divider/demos/DividerVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarDivider>Subtle (default)</CoarDivider>
    <CoarDivider variant="strong">Strong</CoarDivider>
  </div>
</template>

<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
</script>
```

## Real-world Usage

A classic login form pattern where a labeled divider separates OAuth sign-in buttons from the traditional email/password fields.

**Demo — `divider/demos/DividerRealWorld.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; max-width: 360px;">
    <button class="oauth-btn">Continue with Google</button>
    <button class="oauth-btn">Continue with GitHub</button>
    <CoarDivider>or sign in with email</CoarDivider>
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <label style="font-size: 14px;">Email</label>
      <input type="email" placeholder="you@example.com" class="native-input" />
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <label style="font-size: 14px;">Password</label>
      <input type="password" placeholder="••••••••" class="native-input" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
</script>

<style scoped>
.oauth-btn {
  padding: 8px 16px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 6px;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  font-size: 14px;
  cursor: pointer;
}
.oauth-btn:hover {
  background: var(--coar-background-neutral-tertiary);
}
.native-input {
  padding: 6px 10px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 6px;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  font-size: 14px;
}
</style>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `align` | `'left' \| 'center' \| 'right'` | `'center'` | Content alignment |
| `variant` | `'subtle' \| 'strong'` | `'subtle'` | Line visual weight |
| `width` | `number` | `90` | Divider width as a percentage (0–100) |
| `spacingTop` | `number` | `0` | Top spacing in pixels |
| `spacingBottom` | `number` | `0` | Bottom spacing in pixels |

### Slots

| Slot | Description |
|------|-------------|
| `default` | Optional content displayed centered on the line |
