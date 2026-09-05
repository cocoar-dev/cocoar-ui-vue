<!-- Generated from apps/docs/foundations/spacing.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Spacing & Effects

Layout rhythm, corner shapes, and depth — the visual building blocks that give the system its feel.

## Border Radius

Seven radius tokens shape everything from subtle input rounding to fully circular avatars.

**Demo — `spacing/demos/BorderRadius.vue`**

```vue
<template>
  <div class="radius-showcase">
    <div
      v-for="token in radiusTokens"
      :key="token.name"
      class="radius-card"
    >
      <div
        class="radius-shape"
        :style="{ borderRadius: token.value }"
      />
      <div class="radius-meta">
        <span class="radius-name">{{ token.name }}</span>
        <code class="radius-value">{{ token.value }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const radiusTokens = [
  { name: 'XXS', value: '1px' },
  { name: 'XS', value: '2px' },
  { name: 'S', value: '3px' },
  { name: 'M', value: '4px' },
  { name: 'L', value: '5px' },
  { name: 'XL', value: '6px' },
  { name: 'Full', value: '999px' },
];
</script>

<style scoped>
.radius-showcase {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 8px 0;
}

.radius-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.radius-shape {
  width: 72px;
  height: 72px;
  background: var(--vp-c-brand-soft);
  transition: transform 0.2s ease;
}

.radius-shape:hover {
  transform: scale(1.08);
}

.radius-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.radius-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.radius-value {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  background: none !important;
}
</style>
```

## Spacing Scale

All spacing is built on a **4 px grid**. These tokens control padding, margins, and gaps throughout the system.

**Demo — `spacing/demos/SpacingScale.vue`**

```vue
<template>
  <div class="spacing-scale">
    <div
      v-for="token in spacingTokens"
      :key="token.name"
      class="spacing-row"
    >
      <div class="spacing-label">
        <span class="spacing-name">{{ token.name }}</span>
        <code class="spacing-value">{{ token.value }}</code>
      </div>
      <div class="spacing-track">
        <div
          class="spacing-bar"
          :style="{ width: token.value }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const spacingTokens = [
  { name: 'XXS', value: '2px' },
  { name: 'XS', value: '4px' },
  { name: 'S', value: '8px' },
  { name: 'M', value: '16px' },
  { name: 'L', value: '24px' },
  { name: 'XL', value: '32px' },
  { name: 'XXL', value: '48px' },
  { name: 'XXXL', value: '64px' },
];
</script>

<style scoped>
.spacing-scale {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}

.spacing-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.spacing-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 100px;
  flex-shrink: 0;
}

.spacing-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  min-width: 36px;
}

.spacing-value {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  background: none !important;
}

.spacing-track {
  flex: 1;
  height: 24px;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 4px;
  overflow: hidden;
}

.spacing-bar {
  height: 14px;
  min-width: 2px;
  background: var(--vp-c-brand-1);
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
```

## Stroke Width

Border thickness for dividers, outlines, and component borders.

| Token | Value | Use case |
|-------|-------|----------|
| `--coar-stroke-width-xs` | 0.5 px | Hairline dividers |
| `--coar-stroke-width-s` | 1 px | Default borders |
| `--coar-stroke-width-m` | 2 px | Emphasis borders |
| `--coar-stroke-width-l` | 4 px | Heavy accents |

## Shadows & Elevation

Six shadow levels create the illusion of depth. The shadow _is_ the demo — notice how each card lifts further off the surface.

**Demo — `spacing/demos/Shadows.vue`**

```vue
<template>
  <div class="shadow-showcase">
    <div class="shadow-surface">
      <div
        v-for="token in shadowTokens"
        :key="token.name"
        class="shadow-card-wrap"
      >
        <div
          class="shadow-card"
          :style="{ boxShadow: `var(${token.variable})` }"
        />
        <div class="shadow-meta">
          <span class="shadow-name">{{ token.name }}</span>
          <span class="shadow-desc">{{ token.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const shadowTokens = [
  { name: 'XS', variable: '--coar-shadow-xs', description: 'Hover states' },
  { name: 'S', variable: '--coar-shadow-s', description: 'Cards' },
  { name: 'M', variable: '--coar-shadow-m', description: 'Dropdowns' },
  { name: 'L', variable: '--coar-shadow-l', description: 'Modals' },
  { name: 'XL', variable: '--coar-shadow-xl', description: 'Overlays' },
  { name: 'Focus', variable: '--coar-shadow-focus', description: 'Focus ring' },
];
</script>

<style scoped>
.shadow-showcase {
  padding: 8px 0;
}

.shadow-surface {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 32px;
  padding: 32px 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.shadow-card-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.shadow-card {
  width: 88px;
  height: 88px;
  background: var(--vp-c-bg);
  border-radius: 10px;
  transition: transform 0.25s ease;
}

.shadow-card:hover {
  transform: translateY(-2px);
}

.shadow-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.shadow-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.shadow-desc {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
</style>
```

## Token Reference

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--coar-spacing-xxs` | 2 px | Tight inner gaps |
| `--coar-spacing-xs` | 4 px | Small padding, icon gaps |
| `--coar-spacing-s` | 8 px | Compact padding, list gaps |
| `--coar-spacing-m` | 16 px | Default padding and gaps |
| `--coar-spacing-l` | 24 px | Section padding |
| `--coar-spacing-xl` | 32 px | Large section gaps |
| `--coar-spacing-xxl` | 48 px | Page-level spacing |
| `--coar-spacing-xxxl` | 64 px | Hero / splash spacing |

### Border Radius

| Token | Value |
|-------|-------|
| `--coar-radius-xxs` | 1 px |
| `--coar-radius-xs` | 2 px |
| `--coar-radius-s` | 3 px |
| `--coar-radius-m` | 4 px |
| `--coar-radius-l` | 5 px |
| `--coar-radius-xl` | 6 px |
| `--coar-radius-full` | 999 px |

### Shadows

| Token | Usage |
|-------|-------|
| `--coar-shadow-xs` | Subtle lift for hover states |
| `--coar-shadow-s` | Cards and raised elements |
| `--coar-shadow-m` | Dropdowns and popovers |
| `--coar-shadow-l` | Modals and dialogs |
| `--coar-shadow-xl` | Elevated overlays |
| `--coar-shadow-focus` | Keyboard focus ring |
