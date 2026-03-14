<script setup lang="ts">
import { CoarCard, CoarTag } from '@cocoar/vue-ui';

const primitives = [
  {
    name: 'Gray',
    variable: '--coar-color-gray',
    shades: ['50','100','200','300','400','500','600','700','800','900'].map(s => ({ shade: s, variable: `--coar-color-gray-${s}` })),
  },
  {
    name: 'Slate (Brand)',
    variable: '--coar-color-slate',
    shades: ['50','100','200','300','400','500','600','700','800','900'].map(s => ({ shade: s, variable: `--coar-color-slate-${s}` })),
  },
  {
    name: 'Accent (Themeable)',
    variable: '--coar-color-accent',
    shades: ['50','100','200','300','400','500','600','700','800','900'].map(s => ({ shade: s, variable: `--coar-color-accent-${s}` })),
  },
  {
    name: 'Green',
    variable: '--coar-color-green',
    shades: ['50','100','200','300','400','500','600','700','800','900'].map(s => ({ shade: s, variable: `--coar-color-green-${s}` })),
  },
  {
    name: 'Red',
    variable: '--coar-color-red',
    shades: ['50','100','200','300','400','500','600','700','800','900'].map(s => ({ shade: s, variable: `--coar-color-red-${s}` })),
  },
  {
    name: 'Amber',
    variable: '--coar-color-amber',
    shades: ['50','100','200','300','400','500','600','700','800','900'].map(s => ({ shade: s, variable: `--coar-color-amber-${s}` })),
  },
];

const semanticColors = [
  {
    category: 'Background — Accent',
    colors: [
      { name: 'Accent Primary', variable: '--coar-background-accent-primary' },
      { name: 'Accent Secondary', variable: '--coar-background-accent-secondary' },
      { name: 'Accent Tertiary', variable: '--coar-background-accent-tertiary' },
      { name: 'Accent Hover', variable: '--coar-background-accent-hover' },
      { name: 'Accent Active', variable: '--coar-background-accent-active' },
    ],
  },
  {
    category: 'Background — Brand',
    colors: [
      { name: 'Brand Primary', variable: '--coar-background-brand-primary' },
      { name: 'Brand Secondary', variable: '--coar-background-brand-secondary' },
      { name: 'Brand Tertiary', variable: '--coar-background-brand-tertiary' },
    ],
  },
  {
    category: 'Background — Neutral',
    colors: [
      { name: 'Neutral Primary', variable: '--coar-background-neutral-primary' },
      { name: 'Neutral Secondary', variable: '--coar-background-neutral-secondary' },
      { name: 'Neutral Tertiary', variable: '--coar-background-neutral-tertiary' },
    ],
  },
  {
    category: 'Text — Neutral',
    colors: [
      { name: 'Neutral Primary', variable: '--coar-text-neutral-primary' },
      { name: 'Neutral Secondary', variable: '--coar-text-neutral-secondary' },
      { name: 'Neutral Tertiary', variable: '--coar-text-neutral-tertiary' },
      { name: 'Neutral Disabled', variable: '--coar-text-neutral-disabled' },
    ],
  },
  {
    category: 'Text — Accent',
    colors: [
      { name: 'Accent Primary', variable: '--coar-text-accent-primary' },
      { name: 'Accent Secondary', variable: '--coar-text-accent-secondary' },
    ],
  },
  {
    category: 'Border',
    colors: [
      { name: 'Neutral Primary', variable: '--coar-border-neutral-primary' },
      { name: 'Neutral Secondary', variable: '--coar-border-neutral-secondary' },
      { name: 'Accent Primary', variable: '--coar-border-accent-primary' },
      { name: 'Accent Secondary', variable: '--coar-border-accent-secondary' },
    ],
  },
  {
    category: 'Semantic — Status',
    colors: [
      { name: 'Success Bold', variable: '--coar-background-semantic-success-bold' },
      { name: 'Success Subtle', variable: '--coar-background-semantic-success-subtle' },
      { name: 'Error Bold', variable: '--coar-background-semantic-error-bold' },
      { name: 'Error Subtle', variable: '--coar-background-semantic-error-subtle' },
      { name: 'Warning Bold', variable: '--coar-background-semantic-warning-bold' },
      { name: 'Warning Subtle', variable: '--coar-background-semantic-warning-subtle' },
      { name: 'Info Bold', variable: '--coar-background-semantic-info-bold' },
      { name: 'Info Subtle', variable: '--coar-background-semantic-info-subtle' },
    ],
  },
];
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Colors</h1>
      <p class="page-description">
        Our color system provides consistent, accessible colors across light and dark modes.
        Toggle the theme at the bottom of the sidebar to see how colors adapt.
      </p>
    </header>

    <div class="examples-content">
      <h2 class="component-section-title">Color Primitives</h2>
      <p class="component-section-description">
        The raw color palette. Referenced by semantic tokens — avoid using these directly in components.
      </p>

      <div class="primitives-grid">
        <CoarCard v-for="palette in primitives" :key="palette.name" padding="m" elevated>
          <h3>{{ palette.name }}</h3>
          <code class="token-display">{{ palette.variable }}-[50-900]</code>
          <div class="shades">
            <div v-for="shade in palette.shades" :key="shade.shade" class="shade-item">
              <div class="shade-swatch" :style="{ backgroundColor: `var(${shade.variable})` }"></div>
              <span class="shade-label">{{ shade.shade }}</span>
            </div>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Semantic Colors</h2>
      <p class="component-section-description">Use semantic tokens in your components — they automatically adapt to light/dark mode.</p>

      <div class="semantic-grid-outer">
        <CoarCard v-for="group in semanticColors" :key="group.category" padding="m" elevated>
          <h3>{{ group.category }}</h3>
          <div class="semantic-list">
            <div v-for="color in group.colors" :key="color.name" class="semantic-item">
              <div class="semantic-swatch" :style="{ backgroundColor: `var(${color.variable})` }">
                <span v-if="color.variable.includes('text')" class="text-sample" :style="{ color: `var(${color.variable})` }">Aa</span>
              </div>
              <div class="semantic-info">
                <span class="coar-body-small">{{ color.name }}</span>
                <code class="token-name">{{ color.variable }}</code>
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Usage Example</h2>
      <p class="component-section-description">How semantic colors create consistent UI across themes.</p>

      <div class="examples-grid">
        <CoarCard padding="m" elevated>
          <div class="color-example-header">
            <strong>Card Title</strong>
            <span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Subtitle text</span>
          </div>
          <p class="coar-body-small" style="margin: var(--coar-spacing-s) 0;">
            This card uses semantic color tokens for background, text, and border colors. It automatically adapts to light and dark modes.
          </p>
          <div class="demo-row" style="margin: 0;">
            <CoarTag variant="success">Success</CoarTag>
            <CoarTag variant="error">Error</CoarTag>
            <CoarTag variant="warning">Warning</CoarTag>
            <CoarTag variant="info">Info</CoarTag>
          </div>
        </CoarCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.primitives-grid {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
  margin-bottom: var(--coar-spacing-l);
}

.shade-swatch {
  width: 56px;
  height: 56px;
}

.token-display {
  display: block;
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-tertiary);
  margin-bottom: var(--coar-spacing-s);
  font-family: 'Consolas', 'Monaco', monospace;
}

.shades {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: var(--coar-spacing-s);
}

.shade-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.shade-swatch {
  border-radius: var(--coar-radius-xs);
  border: 1px solid var(--coar-border-neutral-secondary);
}

.shade-label {
  font-size: 10px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
}

.semantic-grid-outer {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
  margin-bottom: var(--coar-spacing-l);
}

.semantic-list {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
  margin-top: var(--coar-spacing-s);
}

.semantic-item {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
}

.semantic-swatch {
  width: 40px;
  height: 40px;
  border-radius: var(--coar-radius-s);
  border: 1px solid var(--coar-border-neutral-secondary);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-sample {
  font-size: 16px;
  font-weight: bold;
}

.semantic-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.token-name {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.color-example-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: var(--coar-spacing-s);
}

h3 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}
</style>
