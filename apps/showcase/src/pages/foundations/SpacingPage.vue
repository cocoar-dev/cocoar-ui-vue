<script setup lang="ts">
import { CoarCard } from '@cocoar/vue-ui';

const radiusTokens = [
  { name: 'XXS', variable: '--coar-radius-xxs', value: '1px' },
  { name: 'XS', variable: '--coar-radius-xs', value: '2px' },
  { name: 'S', variable: '--coar-radius-s', value: '3px' },
  { name: 'M', variable: '--coar-radius-m', value: '4px' },
  { name: 'L', variable: '--coar-radius-l', value: '5px' },
  { name: 'XL', variable: '--coar-radius-xl', value: '6px' },
  { name: 'Full', variable: '--coar-radius-full', value: '999px' },
];

const strokeTokens = [
  { name: 'XS', variable: '--coar-stroke-width-xs', value: '0.5px' },
  { name: 'S', variable: '--coar-stroke-width-s', value: '1px' },
  { name: 'M', variable: '--coar-stroke-width-m', value: '2px' },
  { name: 'L', variable: '--coar-stroke-width-l', value: '4px' },
];

const spacingTokens = [
  { name: 'XXS', variable: '--coar-spacing-xxs', value: '2px' },
  { name: 'XS', variable: '--coar-spacing-xs', value: '4px' },
  { name: 'S', variable: '--coar-spacing-s', value: '8px' },
  { name: 'M', variable: '--coar-spacing-m', value: '16px' },
  { name: 'L', variable: '--coar-spacing-l', value: '24px' },
  { name: 'XL', variable: '--coar-spacing-xl', value: '32px' },
  { name: 'XXL', variable: '--coar-spacing-xxl', value: '48px' },
  { name: 'XXXL', variable: '--coar-spacing-xxxl', value: '64px' },
];

const shadowTokens = [
  { name: 'XS', variable: '--coar-shadow-xs', description: 'Subtle lift for hover states' },
  { name: 'S', variable: '--coar-shadow-s', description: 'Cards and raised elements' },
  { name: 'M', variable: '--coar-shadow-m', description: 'Dropdowns and popovers' },
  { name: 'L', variable: '--coar-shadow-l', description: 'Modals and dialogs' },
  { name: 'XL', variable: '--coar-shadow-xl', description: 'Elevated overlays' },
  { name: 'Focus', variable: '--coar-shadow-focus', description: 'Keyboard focus ring' },
];
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Spacing & Effects</h1>
      <p class="page-description">Spacing, sizing, and visual effects that create consistent layouts and depth across the design system.</p>
    </header>

    <div class="examples-content">
      <h2 class="component-section-title">Border Radius</h2>
      <p class="component-section-description">Corner rounding for cards, buttons, inputs, and other UI elements.</p>

      <div class="examples-grid">
        <CoarCard padding="m" elevated class="examples-grid__span">
          <code class="token-display">--coar-radius-[xxs|xs|s|m|l|xl|full]</code>
          <div class="radius-grid">
            <div v-for="token in radiusTokens" :key="token.name" class="radius-item">
              <div class="radius-preview" :style="{ borderRadius: `var(${token.variable})` }"></div>
              <div class="token-info">
                <span class="coar-body-small">{{ token.name }}</span>
                <span class="token-value">{{ token.value }}</span>
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Stroke Width</h2>
      <p class="component-section-description">Border thickness for dividers, outlines, and component borders.</p>

      <div class="examples-grid">
        <CoarCard padding="m" elevated>
          <code class="token-display">--coar-stroke-width-[xs|s|m|l]</code>
          <div class="stroke-grid">
            <div v-for="token in strokeTokens" :key="token.name" class="stroke-item">
              <div class="stroke-preview">
                <div class="stroke-line" :style="{ height: `var(${token.variable})` }"></div>
              </div>
              <div class="token-info">
                <span class="coar-body-small">{{ token.name }}</span>
                <span class="token-value">{{ token.value }}</span>
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Spacing</h2>
      <p class="component-section-description">Margins, padding, and gaps for consistent layout spacing. Based on a 4px grid.</p>

      <div class="examples-grid">
        <CoarCard padding="m" elevated class="examples-grid__span">
          <code class="token-display">--coar-spacing-[xxs|xs|s|m|l|xl|xxl|xxxl]</code>
          <div class="spacing-list">
            <div v-for="token in spacingTokens" :key="token.name" class="spacing-row">
              <div class="spacing-label">
                <span class="coar-body-small">{{ token.name }}</span>
                <span class="token-value">{{ token.value }}</span>
              </div>
              <div class="spacing-bar-container">
                <div class="spacing-bar" :style="{ width: `var(${token.variable})` }"></div>
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Shadows & Elevation</h2>
      <p class="component-section-description">Box shadows for depth and layering. Higher elevations create more prominent shadows.</p>

      <div class="examples-grid">
        <CoarCard padding="m" elevated class="examples-grid__span">
          <code class="token-display">--coar-shadow-[xs|s|m|l|xl|focus]</code>
          <div class="shadow-grid">
            <div v-for="token in shadowTokens" :key="token.name" class="shadow-item">
              <div class="shadow-preview" :style="{ boxShadow: `var(${token.variable})` }"></div>
              <div class="shadow-info">
                <span class="coar-body-small">{{ token.name }}</span>
                <span class="shadow-desc">{{ token.description }}</span>
              </div>
            </div>
          </div>
        </CoarCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.token-display {
  display: block;
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  margin-bottom: var(--coar-spacing-m);
  font-family: 'Consolas', 'Monaco', monospace;
}

.token-value {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.token-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Radius */
.radius-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--coar-spacing-m);
}

.radius-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--coar-spacing-xs);
}

.radius-preview {
  width: 64px;
  height: 64px;
  background: var(--coar-background-accent-secondary);
  border: 2px solid var(--coar-border-accent-primary);
}

/* Stroke */
.stroke-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--coar-spacing-l);
}

.stroke-item {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
  min-width: 80px;
}

.stroke-preview {
  display: flex;
  align-items: center;
  height: 32px;
}

.stroke-line {
  width: 100%;
  background: var(--coar-text-neutral-primary);
}

/* Spacing */
.spacing-list {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.spacing-row {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-m);
}

.spacing-label {
  display: flex;
  flex-direction: column;
  min-width: 80px;
}

.spacing-bar-container {
  flex: 1;
  height: 20px;
  background: var(--coar-background-neutral-tertiary);
  border-radius: var(--coar-radius-xs);
  overflow: hidden;
  display: flex;
  align-items: center;
}

.spacing-bar {
  height: 100%;
  background: var(--coar-background-accent-primary);
  min-width: 2px;
  border-radius: var(--coar-radius-xs);
}

/* Shadows */
.shadow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--coar-spacing-l);
}

.shadow-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--coar-spacing-s);
}

.shadow-preview {
  width: 80px;
  height: 80px;
  background: var(--coar-background-neutral-primary);
  border-radius: var(--coar-radius-m);
}

.shadow-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.shadow-desc {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  text-align: center;
}
</style>
