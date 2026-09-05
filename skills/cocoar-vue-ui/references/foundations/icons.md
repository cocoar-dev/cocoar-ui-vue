<!-- Generated from apps/docs/foundations/icons.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Icons

A flexible icon system with built-in SVG icons. Icons support multiple sizes, colors, rotation, and animations.

```ts
import { CoarIcon } from '@cocoar/vue-ui';
```

## Icon Gallery

**Demo — `icons/demos/IconGallery.vue`**

```vue
<template>
  <div>
    <p style="margin: 0 0 8px; font-size: 14px; color: var(--coar-text-neutral-secondary);">
      Browse all {{ allIcons.length }} available icons. Click an icon to copy its name.
    </p>
    <div class="search-wrapper">
      <CoarTextInput v-model="search" placeholder="Search icons..." :clearable="true" />
    </div>

    <div v-if="filteredIcons.length > 0" class="icons-grid">
      <button
        v-for="icon in filteredIcons"
        :key="icon"
        class="icon-item"
        :class="{ 'icon-item--copied': copiedIcon === icon }"
        :title="`Click to copy: ${icon}`"
        @click="copyIconName(icon)"
      >
        <CoarIcon :name="icon" size="l" />
        <span class="icon-name">{{ icon }}</span>
        <span v-if="copiedIcon === icon" class="icon-copied">Copied!</span>
      </button>
    </div>
    <p v-else style="color: var(--coar-text-neutral-secondary); font-size: 14px; margin-top: 16px;">
      No icons match "{{ search }}"
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarTextInput, CoarIcon, CORE_ICONS } from '@cocoar/vue-ui';

const search = ref('');
const copiedIcon = ref<string | null>(null);

const allIcons = Object.keys(CORE_ICONS);

const filteredIcons = computed(() => {
  const q = search.value.toLowerCase().trim();
  return q ? allIcons.filter(name => name.includes(q)) : allIcons;
});

function copyIconName(name: string) {
  navigator.clipboard.writeText(name).catch(() => {});
  copiedIcon.value = name;
  setTimeout(() => { copiedIcon.value = null; }, 1500);
}
</script>

<style scoped>
.search-wrapper {
  margin-bottom: 16px;
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 4px;
  max-height: 480px;
  overflow-y: auto;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--coar-radius-s);
  cursor: pointer;
  transition: background 100ms ease-out;
  color: var(--coar-text-neutral-primary);
  position: relative;
}

.icon-item:hover {
  background: var(--coar-background-neutral-tertiary);
  border-color: var(--coar-border-neutral-secondary);
}

.icon-item--copied {
  background: var(--coar-background-semantic-success-subtle);
  border-color: var(--coar-background-semantic-success-bold);
}

.icon-name {
  font-size: 10px;
  color: var(--coar-text-neutral-tertiary);
  text-align: center;
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
}

.icon-copied {
  position: absolute;
  bottom: 2px;
  font-size: 9px;
  color: var(--coar-text-neutral-secondary);
  font-weight: 600;
}
</style>
```

## Sizes

Icons come in 5 preset sizes and can use any valid CSS value.

**Demo — `icons/demos/IconSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end;">
    <div v-for="size in sizes" :key="size" class="size-item">
      <CoarIcon name="settings" :size="size" />
      <span class="size-label">{{ size }} ({{ sizeLabels[size] }})</span>
    </div>
    <div class="size-item">
      <CoarIcon name="settings" size="48px" />
      <span class="size-label">custom (48px)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l', 'xl'] as const;
const sizeLabels: Record<string, string> = { xs: '12px', s: '16px', m: '20px', l: '24px', xl: '32px' };
</script>

<style scoped>
.size-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.size-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
  white-space: nowrap;
}
</style>
```

## Colors

Icons inherit color by default. Override with any valid CSS color value.

**Demo — `icons/demos/IconColors.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
    <div class="color-item"><CoarIcon name="check" size="l" color="green" /><span class="color-label">green</span></div>
    <div class="color-item"><CoarIcon name="x" size="l" color="red" /><span class="color-label">red</span></div>
    <div class="color-item"><CoarIcon name="triangle-alert" size="l" color="orange" /><span class="color-label">orange</span></div>
    <div class="color-item"><CoarIcon name="circle-help" size="l" color="blue" /><span class="color-label">blue</span></div>
    <div class="color-item"><CoarIcon name="settings" size="l" color="#888" /><span class="color-label">#888</span></div>
    <div class="color-item"><CoarIcon name="user" size="l" color="var(--coar-text-accent-primary)" /><span class="color-label">accent</span></div>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';
</script>

<style scoped>
.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.color-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
  white-space: nowrap;
}
</style>
```

## Rotation

Rotate icons to any angle using the `rotate` prop.

**Demo — `icons/demos/IconRotation.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
    <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="0" /><span class="rotation-label">0&deg;</span></div>
    <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="90" /><span class="rotation-label">90&deg;</span></div>
    <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="180" /><span class="rotation-label">180&deg;</span></div>
    <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="270" /><span class="rotation-label">270&deg;</span></div>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';
</script>

<style scoped>
.rotation-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.rotation-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
  white-space: nowrap;
}
</style>
```

## Spin Animation

Enable continuous spinning for loading indicators.

**Demo — `icons/demos/IconSpin.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start;">
    <div class="spin-item">
      <CoarIcon name="loader-circle" size="xl" :spin="true" />
      <span style="font-size: 14px;">Loading...</span>
    </div>
    <div class="spin-item">
      <CoarIcon name="settings" size="l" :spin="true" />
      <span style="font-size: 14px;">Processing</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarIcon } from '@cocoar/vue-ui';
</script>

<style scoped>
.spin-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
</style>
```

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
