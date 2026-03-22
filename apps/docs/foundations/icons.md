# Icons

A flexible icon system with built-in SVG icons. Icons support multiple sizes, colors, rotation, and animations.

```ts
import { CoarIcon } from '@cocoar/vue-ui';
```

## Icon Gallery

<preview path="./icons/demos/IconGallery.vue" />

## Sizes

Icons come in 5 preset sizes and can use any valid CSS value.

<preview path="./icons/demos/IconSizes.vue" />

## Colors

Icons inherit color by default. Override with any valid CSS color value.

<preview path="./icons/demos/IconColors.vue" />

## Rotation

Rotate icons to any angle using the `rotate` prop.

<preview path="./icons/demos/IconRotation.vue" />

## Spin Animation

Enable continuous spinning for loading indicators.

<preview path="./icons/demos/IconSpin.vue" />

## Usage

```vue
<template>
  <!-- Basic usage -->
  <CoarIcon name="settings" />

  <!-- With size and color -->
  <CoarIcon name="check" size="l" color="green" />

  <!-- Rotated -->
  <CoarIcon name="chevron-right" :rotate="90" />

  <!-- Spinning -->
  <CoarIcon name="loader-circle" :spin="true" />
</template>

<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';
</script>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | `—` | Icon name from the registered icon set |
| `size` | `'xs' \| 's' \| 'm' \| 'l' \| 'xl' \| string` | `'m'` | Icon size (preset or custom CSS value) |
| `color` | `string` | `'currentColor'` | Icon color (any valid CSS color) |
| `rotate` | `number` | `0` | Rotation angle in degrees |
| `spin` | `boolean` | `false` | Enable continuous spinning animation |
| `source` | `string` | `'default'` | Icon source/set name |

### Size Reference

| Size | Pixels |
|------|--------|
| `xs` | 12px |
| `s` | 16px |
| `m` | 20px |
| `l` | 24px |
| `xl` | 32px |
