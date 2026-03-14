<script setup lang="ts">
import { CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const durationTokens = [
  { name: 'Instant', variable: '--coar-duration-instant', value: '0ms', description: 'No animation (immediate)' },
  { name: 'Fast', variable: '--coar-duration-fast', value: '100ms', description: 'Micro-interactions, hover states' },
  { name: 'Normal', variable: '--coar-duration-normal', value: '200ms', description: 'Most transitions' },
  { name: 'Slow', variable: '--coar-duration-slow', value: '300ms', description: 'Complex state changes' },
  { name: 'Slower', variable: '--coar-duration-slower', value: '400ms', description: 'Large movements' },
  { name: 'Slowest', variable: '--coar-duration-slowest', value: '600ms', description: 'Page-level transitions' },
];

const easingTokens = [
  { name: 'Linear', variable: '--coar-ease-linear', description: 'Constant speed — for opacity, color' },
  { name: 'Ease Out', variable: '--coar-ease-out', description: 'Fast start, slow end — most UI motion' },
  { name: 'Ease In', variable: '--coar-ease-in', description: 'Slow start, fast end — dismissals' },
  { name: 'Ease In-Out', variable: '--coar-ease-in-out', description: 'Slow start and end — complex motions' },
  { name: 'Bounce', variable: '--coar-ease-bounce', description: 'Elastic overshoot — playful feedback' },
];

const transitionTokens = [
  { name: 'Default', variable: '--coar-transition-default', description: 'General-purpose transition' },
  { name: 'Fast', variable: '--coar-transition-fast', description: 'Quick micro-interactions' },
  { name: 'Colors', variable: '--coar-transition-colors', description: 'Background and text color changes' },
  { name: 'Transform', variable: '--coar-transition-transform', description: 'Scale, rotate, translate' },
  { name: 'Opacity', variable: '--coar-transition-opacity', description: 'Show/hide transitions' },
  { name: 'Shadow', variable: '--coar-transition-shadow', description: 'Elevation changes on hover' },
];

const codeBasicTransition = `.my-element {
  transition: var(--coar-transition-default);
}`;

const codeCustomTransition = `.my-element {
  transition:
    background-color var(--coar-duration-normal) var(--coar-ease-out),
    transform var(--coar-duration-fast) var(--coar-ease-bounce);
}`;

const codeAnimation = `@keyframes slide-in {
  from { transform: translateY(-8px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.my-element {
  animation: slide-in var(--coar-duration-normal) var(--coar-ease-out);
}`;

const codeReducedMotion = `@media (prefers-reduced-motion: reduce) {
  :root {
    --coar-duration-fast:    0ms;
    --coar-duration-normal:  0ms;
    --coar-duration-slow:    0ms;
    --coar-duration-slower:  0ms;
    --coar-duration-slowest: 0ms;
  }
}`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Motion</h1>
      <p class="page-description">Timing and easing tokens for consistent, accessible animations across the UI.</p>
    </header>

    <div class="examples-content">
      <!-- Duration -->
      <div class="examples-grid">
        <CoarCard padding="m" elevated class="examples-grid__span">
          <h3>Duration</h3>
          <p class="example-description">How long animations take to complete. Use shorter durations for small/simple changes, longer for complex/large movements.</p>
          <code class="token-display">--coar-duration-[instant|fast|normal|slow|slower|slowest]</code>
          <div class="duration-grid">
            <div v-for="token in durationTokens" :key="token.name" class="duration-item">
              <div class="duration-preview">
                <div class="duration-bar" :style="{ animationDuration: `var(${token.variable})` }"></div>
              </div>
              <div class="duration-info">
                <span class="coar-body-small">{{ token.name }}</span>
                <span class="token-value">{{ token.value }}</span>
                <span class="token-desc">{{ token.description }}</span>
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <!-- Easing -->
      <div class="examples-grid">
        <CoarCard padding="m" elevated class="examples-grid__span">
          <h3>Easing</h3>
          <p class="example-description">How animations accelerate and decelerate. Based on Material Design motion principles.</p>
          <code class="token-display">--coar-ease-[linear|out|in|in-out|bounce]</code>
          <div class="easing-grid">
            <div v-for="token in easingTokens" :key="token.name" class="easing-item">
              <div class="easing-preview">
                <div class="easing-dot" :style="{ animationTimingFunction: `var(${token.variable})` }"></div>
              </div>
              <div class="easing-info">
                <span class="coar-body-small">{{ token.name }}</span>
                <span class="token-desc">{{ token.description }}</span>
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <!-- Transitions -->
      <div class="examples-grid">
        <CoarCard padding="m" elevated class="examples-grid__span">
          <h3>Pre-composed Transitions</h3>
          <p class="example-description">Pre-composed transition values combining duration and easing for common use cases.</p>
          <code class="token-display">--coar-transition-[default|fast|colors|transform|opacity|shadow]</code>
          <div class="transition-grid">
            <div v-for="token in transitionTokens" :key="token.name" class="transition-item">
              <button class="transition-demo" :style="{ '--t': `var(${token.variable})` }">Hover me</button>
              <div class="transition-info">
                <span class="coar-body-small">{{ token.name }}</span>
                <span class="token-desc">{{ token.description }}</span>
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <!-- Usage -->
      <div class="examples-grid">
        <CoarCard padding="m" elevated class="examples-grid__span">
          <h3>Usage</h3>
          <p class="example-description">How to use motion tokens in your CSS. Reference the CSS custom properties directly.</p>
          <div class="usage-examples">
            <div class="usage-example">
              <h4 class="coar-body-small">Basic transition</h4>
              <CoarCodeBlock :code="codeBasicTransition" language="css" :show-line-numbers="false" variant="info" :collapsible="false" />
            </div>
            <div class="usage-example">
              <h4 class="coar-body-small">Custom transition with tokens</h4>
              <CoarCodeBlock :code="codeCustomTransition" language="css" :show-line-numbers="false" variant="info" :collapsible="false" />
            </div>
            <div class="usage-example">
              <h4 class="coar-body-small">Animation with duration</h4>
              <CoarCodeBlock :code="codeAnimation" language="css" :show-line-numbers="false" variant="info" :collapsible="false" />
            </div>
          </div>
        </CoarCard>
      </div>

      <!-- Accessibility -->
      <div class="examples-grid">
        <CoarCard padding="m" variant="info" elevated class="examples-grid__span">
          <h3>Accessibility</h3>
          <p class="example-description">
            All motion tokens respect the <code>prefers-reduced-motion</code> media query.
            When users prefer reduced motion, all durations automatically become 0ms.
          </p>
          <CoarCodeBlock :code="codeReducedMotion" language="css" :show-line-numbers="false" variant="info" :collapsible="false" />
        </CoarCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}

h4.coar-body-small { margin: 0 0 var(--coar-spacing-xs); }

.token-display {
  display: block;
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  margin-bottom: var(--coar-spacing-m);
  font-family: 'Consolas', 'Monaco', monospace;
}

.token-value {
  font-size: 11px;
  color: var(--coar-text-neutral-secondary);
  font-family: monospace;
}

.token-desc {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
}

/* Duration */
.duration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--coar-spacing-m);
}

.duration-item {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
}

.duration-preview {
  height: 32px;
  background: var(--coar-background-neutral-tertiary);
  border-radius: var(--coar-radius-xs);
  overflow: hidden;
  position: relative;
}

@keyframes slide-bar {
  0%   { transform: translateX(-100%); }
  50%  { transform: translateX(0); }
  100% { transform: translateX(100%); }
}

.duration-bar {
  position: absolute;
  width: 100%;
  height: 100%;
  background: var(--coar-background-accent-primary);
  animation: slide-bar 2s linear infinite;
}

.duration-info { display: flex; flex-direction: column; gap: 2px; }

/* Easing */
.easing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--coar-spacing-m);
}

.easing-item { display: flex; flex-direction: column; gap: var(--coar-spacing-xs); }

.easing-preview {
  height: 48px;
  background: var(--coar-background-neutral-tertiary);
  border-radius: var(--coar-radius-xs);
  overflow: hidden;
  position: relative;
}

@keyframes bounce-dot {
  0%   { left: 8px; }
  50%  { left: calc(100% - 24px); }
  100% { left: 8px; }
}

.easing-dot {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  background: var(--coar-background-accent-primary);
  border-radius: 50%;
  animation: bounce-dot 2s infinite;
}

.easing-info { display: flex; flex-direction: column; gap: 2px; }

/* Transitions */
.transition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--coar-spacing-m);
}

.transition-item { display: flex; flex-direction: column; gap: var(--coar-spacing-xs); }

.transition-demo {
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  background: var(--coar-background-accent-primary);
  color: white;
  border: none;
  border-radius: var(--coar-radius-s);
  cursor: pointer;
  font-size: var(--coar-body-small-base-size);
  transition: var(--t, var(--coar-transition-default));
}

.transition-demo:hover {
  background: var(--coar-background-accent-hover);
  transform: scale(1.04);
  box-shadow: var(--coar-shadow-m);
  opacity: 0.85;
}

.transition-info { display: flex; flex-direction: column; gap: 2px; }

/* Usage */
.usage-examples { display: flex; flex-direction: column; gap: var(--coar-spacing-m); }
.usage-example { display: flex; flex-direction: column; gap: var(--coar-spacing-xs); }
</style>
