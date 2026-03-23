# Avatar

Use avatars to give users and entities a recognizable visual identity throughout your application. They display a profile image when available and gracefully fall back to generated initials, so every user always has a face -- even before they upload a photo.

```ts
import { CoarAvatar } from '@cocoar/vue-ui';
```

## Basic Usage

Pass a `name` and the avatar automatically extracts and displays initials. Ideal for user lists, comment threads, and anywhere you need a quick visual identifier.

<preview path="./avatar/demos/AvatarBasic.vue" />

## With Image

Provide a `src` URL to show a profile photo. If the image fails to load, the avatar seamlessly reverts to initials so the layout never breaks.

<preview path="./avatar/demos/AvatarImage.vue" />

## Sizes

Six sizes let you match the avatar to its context -- use `xs` in dense tables or chat lists, and `xxl` for prominent profile headers.

<preview path="./avatar/demos/AvatarSizes.vue" />

## Shapes

Choose between circle (the default, great for people) and square (useful for teams, organizations, or app icons).

<preview path="./avatar/demos/AvatarShapes.vue" />

## Avatar Group

Stack avatars with negative margins to show team members or participants at a glance. Add a "+N" overflow indicator when the list is too long to display in full.

<preview path="./avatar/demos/AvatarGroup.vue" />

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

These keys can be translated via [`@cocoar/vue-localization`](/guide/i18n).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.avatar.avatar` | `'Avatar'` | `aria-label` and `alt` text fallback when no `name` prop is set |
