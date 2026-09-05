<!-- Generated from apps/docs/foundations/colors.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Colors

Cocoar's color system is built on two layers: **primitives** (the raw palette) and **semantic tokens** (purpose-driven aliases). Semantic tokens adapt to light and dark mode automatically — always use them in your components instead of referencing primitives directly.

## Color Primitives

Six scales, ten shades each. These are the building blocks that semantic tokens reference under the hood.

**Demo — `colors/demos/ColorPrimitives.vue`**

```vue
<template>
  <div class="color-primitives">
    <div v-for="palette in palettes" :key="palette.name" class="palette-row">
      <div class="palette-label">
        <span class="palette-name">{{ palette.name }}</span>
        <span class="palette-sub">{{ palette.sub }}</span>
      </div>
      <div class="palette-swatches">
        <div
          v-for="shade in shades"
          :key="shade"
          class="swatch-cell"
        >
          <div
            class="swatch"
            :style="{ backgroundColor: `var(--coar-color-${palette.key}-${shade})` }"
            :title="`--coar-color-${palette.key}-${shade}`"
          />
          <span class="shade-num">{{ shade }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

const palettes = [
  { name: 'Gray', sub: 'Neutral UI', key: 'gray' },
  { name: 'Slate', sub: 'Brand', key: 'slate' },
  { name: 'Accent', sub: 'Themeable', key: 'accent' },
  { name: 'Green', sub: 'Success', key: 'green' },
  { name: 'Red', sub: 'Error', key: 'red' },
  { name: 'Amber', sub: 'Warning', key: 'amber' },
];
</script>

<style scoped>
.color-primitives {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.palette-row {
  display: flex;
  align-items: center;
  gap: 24px;
}

.palette-label {
  display: flex;
  flex-direction: column;
  min-width: 90px;
  flex-shrink: 0;
}

.palette-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.palette-sub {
  font-size: 11px;
  color: var(--vp-c-text-3);
  line-height: 1.3;
}

.palette-swatches {
  display: flex;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.swatch-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
}

.swatch:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 1;
  position: relative;
}

.shade-num {
  font-size: 10px;
  font-weight: 500;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .palette-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .palette-label {
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
  }

  .palette-swatches {
    width: 100%;
  }

  .swatch {
    border-radius: 8px;
  }
}
</style>
```

> **Tip: When to use primitives**
>
> Almost never. Use semantic tokens in component code. Primitives are useful only when defining new semantic tokens or building one-off illustrations.

## Semantic Colors

Semantic tokens give colors *meaning* — background, text, border, or status — so your UI stays consistent and adapts to theme changes without touching component code.

**Demo — `colors/demos/SemanticColors.vue`**

```vue
<template>
  <div class="semantic-colors">
    <div v-for="group in groups" :key="group.title" class="token-group">
      <div class="group-header">
        <span class="group-icon">{{ group.icon }}</span>
        <h4 class="group-title">{{ group.title }}</h4>
      </div>
      <div class="token-list">
        <div
          v-for="token in group.tokens"
          :key="token.variable"
          class="token-row"
        >
          <div
            class="token-swatch"
            :class="{ 'token-swatch--text': token.type === 'text', 'token-swatch--border': token.type === 'border' }"
            :style="swatchStyle(token)"
          >
            <span v-if="token.type === 'text'" class="text-preview" :style="{ color: `var(${token.variable})` }">Ag</span>
            <span v-if="token.type === 'border'" class="border-preview" :style="{ borderColor: `var(${token.variable})` }"></span>
          </div>
          <div class="token-meta">
            <span class="token-name">{{ token.label }}</span>
            <code class="token-var">{{ token.variable }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Token {
  label: string;
  variable: string;
  type: 'background' | 'text' | 'border';
}

interface TokenGroup {
  title: string;
  icon: string;
  tokens: Token[];
}

function swatchStyle(token: Token) {
  if (token.type === 'background') {
    return { backgroundColor: `var(${token.variable})` };
  }
  return {};
}

const groups: TokenGroup[] = [
  {
    title: 'Backgrounds',
    icon: '\u25A3',
    tokens: [
      { label: 'Neutral Primary', variable: '--coar-background-neutral-primary', type: 'background' },
      { label: 'Neutral Secondary', variable: '--coar-background-neutral-secondary', type: 'background' },
      { label: 'Neutral Tertiary', variable: '--coar-background-neutral-tertiary', type: 'background' },
      { label: 'Accent Primary', variable: '--coar-background-accent-primary', type: 'background' },
      { label: 'Accent Secondary', variable: '--coar-background-accent-secondary', type: 'background' },
      { label: 'Accent Tertiary', variable: '--coar-background-accent-tertiary', type: 'background' },
      { label: 'Accent Hover', variable: '--coar-background-accent-hover', type: 'background' },
      { label: 'Brand Primary', variable: '--coar-background-brand-primary', type: 'background' },
      { label: 'Brand Secondary', variable: '--coar-background-brand-secondary', type: 'background' },
      { label: 'Brand Tertiary', variable: '--coar-background-brand-tertiary', type: 'background' },
    ],
  },
  {
    title: 'Text',
    icon: 'A',
    tokens: [
      { label: 'Neutral Primary', variable: '--coar-text-neutral-primary', type: 'text' },
      { label: 'Neutral Secondary', variable: '--coar-text-neutral-secondary', type: 'text' },
      { label: 'Neutral Tertiary', variable: '--coar-text-neutral-tertiary', type: 'text' },
      { label: 'Neutral Disabled', variable: '--coar-text-neutral-disabled', type: 'text' },
      { label: 'Accent Primary', variable: '--coar-text-accent-primary', type: 'text' },
      { label: 'Accent Secondary', variable: '--coar-text-accent-secondary', type: 'text' },
      { label: 'Brand Primary', variable: '--coar-text-brand-primary', type: 'text' },
    ],
  },
  {
    title: 'Borders',
    icon: '\u25A1',
    tokens: [
      { label: 'Neutral Primary', variable: '--coar-border-neutral-primary', type: 'border' },
      { label: 'Neutral Secondary', variable: '--coar-border-neutral-secondary', type: 'border' },
      { label: 'Neutral Tertiary', variable: '--coar-border-neutral-tertiary', type: 'border' },
      { label: 'Accent Primary', variable: '--coar-border-accent-primary', type: 'border' },
      { label: 'Accent Secondary', variable: '--coar-border-accent-secondary', type: 'border' },
      { label: 'Input', variable: '--coar-border-input', type: 'border' },
      { label: 'Input Hover', variable: '--coar-border-input-hover', type: 'border' },
    ],
  },
  {
    title: 'Status',
    icon: '\u25CF',
    tokens: [
      { label: 'Success Bold', variable: '--coar-background-semantic-success-bold', type: 'background' },
      { label: 'Success Subtle', variable: '--coar-background-semantic-success-subtle', type: 'background' },
      { label: 'Error Bold', variable: '--coar-background-semantic-error-bold', type: 'background' },
      { label: 'Error Subtle', variable: '--coar-background-semantic-error-subtle', type: 'background' },
      { label: 'Warning Bold', variable: '--coar-background-semantic-warning-bold', type: 'background' },
      { label: 'Warning Subtle', variable: '--coar-background-semantic-warning-subtle', type: 'background' },
      { label: 'Info Bold', variable: '--coar-background-semantic-info-bold', type: 'background' },
      { label: 'Info Subtle', variable: '--coar-background-semantic-info-subtle', type: 'background' },
    ],
  },
];
</script>

<style scoped>
.semantic-colors {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.group-icon {
  font-size: 14px;
  color: var(--vp-c-text-2);
  width: 20px;
  text-align: center;
}

.group-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  letter-spacing: -0.01em;
}

.token-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.token-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}

.token-row:hover {
  background-color: var(--vp-c-bg-soft);
}

/* --- Swatches --- */

.token-swatch {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.token-swatch--text {
  background-color: var(--vp-c-bg-soft);
}

.text-preview {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.token-swatch--border {
  background: transparent;
  box-shadow: none;
}

.border-preview {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 2.5px solid;
}

/* --- Meta --- */

.token-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.token-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.token-var {
  font-size: 11px;
  color: var(--vp-c-text-3) !important;
  background: none !important;
  padding: 0 !important;
  font-family: var(--vp-font-family-mono);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

## Usage Example

A realistic card built entirely with semantic tokens. Toggle light/dark mode to see every color adapt.

**Demo — `colors/demos/ColorUsageExample.vue`**

```vue
<template>
  <div class="usage-demo">
    <div class="card-example">
      <div class="card-header">
        <div class="card-avatar">
          <span class="avatar-text">JD</span>
        </div>
        <div class="card-header-text">
          <span class="card-title">John Doe</span>
          <span class="card-subtitle">Senior Designer</span>
        </div>
      </div>
      <p class="card-body">
        This card is built entirely with semantic color tokens. Toggle between light and dark mode to see how every color adapts automatically.
      </p>
      <div class="card-tags">
        <span class="tag tag--accent">Design</span>
        <span class="tag tag--success">Active</span>
        <span class="tag tag--warning">Review</span>
      </div>
      <div class="card-footer">
        <button class="btn-primary">View Profile</button>
        <button class="btn-secondary">Message</button>
      </div>
    </div>

    <div class="token-annotations">
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-background-neutral-primary)"></span>
        <code>--coar-background-neutral-primary</code>
        <span class="annotation-desc">Card surface</span>
      </div>
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-text-neutral-primary)"></span>
        <code>--coar-text-neutral-primary</code>
        <span class="annotation-desc">Title text</span>
      </div>
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-text-neutral-secondary)"></span>
        <code>--coar-text-neutral-secondary</code>
        <span class="annotation-desc">Body text</span>
      </div>
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-background-accent-primary)"></span>
        <code>--coar-background-accent-primary</code>
        <span class="annotation-desc">Primary button</span>
      </div>
      <div class="annotation">
        <span class="annotation-dot" style="background: var(--coar-border-neutral-tertiary)"></span>
        <code>--coar-border-neutral-tertiary</code>
        <span class="annotation-desc">Card border</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.usage-demo {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

/* --- Example Card --- */

.card-example {
  flex: 1;
  min-width: 260px;
  max-width: 360px;
  padding: 24px;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--coar-background-accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--coar-text-on-bold);
}

.card-header-text {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--coar-text-neutral-primary);
  line-height: 1.3;
}

.card-subtitle {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
  line-height: 1.3;
}

.card-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--coar-text-neutral-secondary);
  margin: 0;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.tag--accent {
  background: var(--coar-background-accent-tertiary);
  color: var(--coar-text-accent-primary);
}

.tag--success {
  background: var(--coar-background-semantic-success-subtle);
  color: var(--coar-text-semantic-success-bold);
}

.tag--warning {
  background: var(--coar-background-semantic-warning-subtle);
  color: var(--coar-text-semantic-warning-bold);
}

.card-footer {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

.btn-primary {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--coar-background-accent-primary);
  color: var(--coar-text-on-bold);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-primary:hover {
  background: var(--coar-background-accent-hover);
}

.btn-secondary {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--coar-border-neutral-tertiary);
  background: transparent;
  color: var(--coar-text-neutral-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-secondary:hover {
  background: var(--coar-background-neutral-tertiary);
}

/* --- Annotations --- */

.token-annotations {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.annotation {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}

.annotation-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.annotation code {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2) !important;
  background: none !important;
  padding: 0 !important;
  white-space: nowrap;
}

.annotation-desc {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-left: auto;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .usage-demo {
    flex-direction: column;
  }

  .card-example {
    max-width: 100%;
  }
}
</style>
```

## Token Naming Convention

All tokens follow a predictable pattern:

```
--coar-{usage}-{category}-{variant}
```

| Segment | Values | Examples |
|---------|--------|----------|
| **Usage** | `background`, `text`, `border`, `icon` | What the color is applied to |
| **Category** | `neutral`, `brand`, `accent`, `semantic-{status}` | The color family |
| **Variant** | `primary`, `secondary`, `tertiary`, `bold`, `subtle`, `hover`, `active`, `disabled` | Emphasis level or state |

## Token Reference

### Background

| Token | Usage |
|-------|-------|
| `--coar-background-neutral-primary` | Default page / card surface |
| `--coar-background-neutral-secondary` | Slightly raised surface |
| `--coar-background-neutral-tertiary` | Subtle fill for inputs, hover states |
| `--coar-background-accent-primary` | Primary accent (buttons, active states) |
| `--coar-background-accent-secondary` | Lighter accent fill |
| `--coar-background-accent-tertiary` | Subtlest accent fill |
| `--coar-background-accent-hover` | Accent hover state |
| `--coar-background-accent-active` | Accent pressed state |
| `--coar-background-brand-primary` | Brand-colored surface |
| `--coar-background-brand-secondary` | Lighter brand surface |
| `--coar-background-brand-tertiary` | Subtlest brand surface |

### Text

| Token | Usage |
|-------|-------|
| `--coar-text-neutral-primary` | Primary body text |
| `--coar-text-neutral-secondary` | Supporting / secondary text |
| `--coar-text-neutral-tertiary` | Placeholder, hint text |
| `--coar-text-neutral-disabled` | Disabled text |
| `--coar-text-accent-primary` | Accent-colored text (links, highlights) |
| `--coar-text-accent-secondary` | Lighter accent text |
| `--coar-text-brand-primary` | Brand-colored text |
| `--coar-text-on-bold` | White text on bold / colored surfaces |

### Border

| Token | Usage |
|-------|-------|
| `--coar-border-neutral-primary` | Strong border (emphasis) |
| `--coar-border-neutral-secondary` | Default visible border |
| `--coar-border-neutral-tertiary` | Subtle divider |
| `--coar-border-accent-primary` | Accent border (focus rings) |
| `--coar-border-accent-secondary` | Lighter accent border |
| `--coar-border-input` | Input field border |
| `--coar-border-input-hover` | Input border on hover |

### Status

| Token | Usage |
|-------|-------|
| `--coar-background-semantic-success-bold` | Success background (solid) |
| `--coar-background-semantic-success-subtle` | Success background (light) |
| `--coar-background-semantic-error-bold` | Error background (solid) |
| `--coar-background-semantic-error-subtle` | Error background (light) |
| `--coar-background-semantic-warning-bold` | Warning background (solid) |
| `--coar-background-semantic-warning-subtle` | Warning background (light) |
| `--coar-background-semantic-info-bold` | Info background (solid) |
| `--coar-background-semantic-info-subtle` | Info background (light) |
| `--coar-text-semantic-success-bold` | Success text (strong) |
| `--coar-text-semantic-error-bold` | Error text (strong) |
| `--coar-text-semantic-warning-bold` | Warning text (strong) |
| `--coar-text-semantic-info-bold` | Info text (strong) |
