---
description: "CoarIcon and the built-in SVG icon set: preset sizes, colors, rotation, spin animation, and registering custom icon sources with fallback."
---

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

## Custom Icon Sources

Register your own icons alongside the built-in set. Cocoar supports multiple icon sources with automatic fallback.

### SVG Map (Inline Icons)

Register a set of SVG strings — resolved synchronously, no network requests.

```ts
// main.ts
import { CoarIconPlugin, CoarIconMapSource } from '@cocoar/vue-ui';

app.use(CoarIconPlugin, {
  sources: [
    {
      key: 'app',
      source: new CoarIconMapSource({
        'logo': '<svg viewBox="0 0 24 24">...</svg>',
        'dashboard': '<svg viewBox="0 0 24 24">...</svg>',
      }),
    },
  ],
  defaultSource: 'app', // check custom icons first
});
```

```vue
<template>
  <!-- Resolves from 'app' source first, then built-in -->
  <CoarIcon name="logo" size="xl" />

  <!-- Explicitly target a source -->
  <CoarIcon name="settings" source="coar-builtin" />
</template>
```

### HTTP Source (Remote Icons)

Load icons on demand from a URL. Responses are cached automatically.

```ts
import { CoarIconPlugin, CoarHttpIconSource } from '@cocoar/vue-ui';

app.use(CoarIconPlugin, {
  sources: [
    {
      key: 'cdn',
      source: new CoarHttpIconSource(
        (name) => `https://cdn.example.com/icons/${name}.svg`,
      ),
    },
  ],
});
```

```vue
<!-- Fetched async, shows nothing while loading -->
<CoarIcon name="custom-icon" source="cdn" />
```

### Override Built-in Icons

Replace specific built-in icons without creating a full source:

```ts
app.use(CoarIconPlugin, {
  builtInOverrides: {
    'settings': '<svg viewBox="0 0 24 24"><!-- your custom settings icon --></svg>',
  },
});
```

### Resolution Order

When no `source` prop is specified, icons are resolved in this order:
1. **Default source** (set via `defaultSource` option)
2. **Additional sources** (in registration order)
3. **Built-in icons** (`coar-builtin`)

The first source that returns a match wins. Use the `source` prop to bypass fallback and target a specific source directly.

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | `—` | Icon name from the registered icon set |
| `source` | `string` | — | Target a specific icon source (bypasses fallback) |
| `size` | `'xs' \| 's' \| 'm' \| 'l' \| 'xl' \| string` | `'m'` | Icon size (preset or custom CSS value) |
| `color` | `string` | `'inherit'` | Icon color (any valid CSS color) |
| `strokeWidth` | `number` | — | Override stroke width for stroke-based icons |
| `rotate` | `number` | `0` | Rotation angle in degrees |
| `rotateTransition` | `number \| string` | — | Rotation animation (ms or CSS transition) |
| `spin` | `boolean` | `false` | Enable continuous spinning animation |
| `label` | `string \| number` | — | Text label displayed next to the icon |

### Size Reference

| Size | Pixels |
|------|--------|
| `xs` | 12px |
| `s` | 16px |
| `m` | 20px |
| `l` | 24px |
| `xl` | 32px |
