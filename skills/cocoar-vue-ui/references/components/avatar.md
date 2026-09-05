<!-- Generated from apps/docs/components/avatar.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Avatar

Use avatars to give users and entities a recognizable visual identity throughout your application. They display a profile image when available and gracefully fall back to generated initials, so every user always has a face -- even before they upload a photo.

```ts
import { CoarAvatar } from '@cocoar/vue-ui';
```

## Basic Usage

Pass a `name` and the avatar automatically extracts and displays initials. Ideal for user lists, comment threads, and anywhere you need a quick visual identifier.

**Demo — `avatar/demos/AvatarBasic.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
    <CoarAvatar name="John Doe" />
    <CoarAvatar name="Jane Smith" />
    <CoarAvatar name="Alice" />
    <CoarAvatar name="Bob Wilson" />
  </div>
</template>

<script setup lang="ts">
import { CoarAvatar } from '@cocoar/vue-ui';
</script>
```

## With Image

Provide a `src` URL to show a profile photo. If the image fails to load, the avatar seamlessly reverts to initials so the layout never breaks.

**Demo — `avatar/demos/AvatarImage.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
    <CoarAvatar src="https://i.pravatar.cc/150?img=1" name="User One" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=2" name="User Two" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=3" name="User Three" />
    <CoarAvatar src="https://invalid-url.xyz/broken.jpg" name="Broken Image" />
  </div>
</template>

<script setup lang="ts">
import { CoarAvatar } from '@cocoar/vue-ui';
</script>
```

## Sizes

Six sizes let you match the avatar to its context -- use `xs` in dense tables or chat lists, and `xxl` for prominent profile headers.

**Demo — `avatar/demos/AvatarSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="xs" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">xs</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="s" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">s</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="m" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">m</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">l</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="AB" size="xl" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">xl</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarAvatar } from '@cocoar/vue-ui';
</script>
```

## Shapes

Choose between circle (the default, great for people) and square (useful for teams, organizations, or app icons).

**Demo — `avatar/demos/AvatarShapes.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="JD" shape="circle" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">circle</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar name="JD" shape="square" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">square</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar src="https://i.pravatar.cc/150?img=5" name="JD" shape="circle" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">circle + image</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarAvatar src="https://i.pravatar.cc/150?img=5" name="JD" shape="square" size="l" />
      <span style="font-size: 11px; color: #64748b; font-family: monospace;">square + image</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarAvatar } from '@cocoar/vue-ui';
</script>
```

## Avatar Group

Stack avatars with negative margins to show team members or participants at a glance. Add a "+N" overflow indicator when the list is too long to display in full.

**Demo — `avatar/demos/AvatarGroup.vue`**

```vue
<template>
  <div class="avatar-stack">
    <CoarAvatar src="https://i.pravatar.cc/150?img=10" name="User A" size="m" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=11" name="User B" size="m" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=12" name="User C" size="m" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=13" name="User D" size="m" />
    <CoarAvatar name="+5" size="m" />
  </div>
</template>

<script setup lang="ts">
import { CoarAvatar } from '@cocoar/vue-ui';
</script>

<style scoped>
.avatar-stack {
  display: flex;
  align-items: center;
}
.avatar-stack > * + * {
  margin-left: -8px;
}
.avatar-stack > * {
  border: 2px solid var(--coar-background-neutral-primary, #fff);
  border-radius: 50%;
}
</style>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | `''` | User's name (used for initials fallback) |
| `src` | `string` | `undefined` | Image URL |
| `size` | `'xs' \| 's' \| 'm' \| 'l' \| 'xl' \| 'xxl'` | `'m'` | Avatar size |
| `shape` | `'circle' \| 'square'` | `'circle'` | Avatar shape |
| `initials` | `string` | `''` | Custom initials override |
| `clickable` | `boolean` | `false` | Make avatar interactive (button role) |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.avatar.avatar` | `'Avatar'` | `aria-label` and `alt` text fallback when no `name` prop is set |
