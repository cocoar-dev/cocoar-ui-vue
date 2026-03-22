<script setup>
import IconGallery from './icons/demos/IconGallery.vue';
import IconSizes from './icons/demos/IconSizes.vue';
import IconColors from './icons/demos/IconColors.vue';
import IconRotation from './icons/demos/IconRotation.vue';
import IconSpin from './icons/demos/IconSpin.vue';
</script>

# Icons

A flexible icon system with built-in SVG icons. Icons support multiple sizes, colors, rotation, and animations.

```ts
import { CoarIcon } from '@cocoar/vue-ui';
```

## Icon Gallery

<IconGallery />

## Sizes

Icons come in 5 preset sizes and can use any valid CSS value.

<IconSizes />

## Colors

Icons inherit color by default. Override with any valid CSS color value.

<IconColors />

## Rotation

Rotate icons to any angle using the `rotate` prop.

<IconRotation />

## Spin Animation

Enable continuous spinning for loading indicators.

<IconSpin />

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
