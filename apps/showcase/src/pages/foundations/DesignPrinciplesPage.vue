<script setup lang="ts">
import { CoarCard, CoarNote } from '@cocoar/vue-ui';

const principles = [
  {
    title: 'Clarity',
    icon: '◎',
    description: 'Every element has a clear purpose. Reduce visual noise. Make the important thing obvious.',
    examples: ['Consistent spacing creates rhythm', 'Typography hierarchy guides the eye', 'One primary action per screen'],
  },
  {
    title: 'Consistency',
    icon: '▣',
    description: 'Use the same patterns, tokens, and components everywhere. Predictability reduces cognitive load.',
    examples: ['Shared token vocabulary (colors, spacing, radius)', 'Uniform component API patterns', 'Consistent interaction models'],
  },
  {
    title: 'Accessibility',
    icon: '◉',
    description: 'Design for everyone. Meet WCAG AA standards at minimum. Keyboard navigation is not optional.',
    examples: ['4.5:1 contrast ratio for text', 'Full keyboard navigation in all components', 'Screen reader support built-in'],
  },
  {
    title: 'Touch-First',
    icon: '⬡',
    description: 'All interactive elements meet touch target sizes. Components work on mobile before desktop.',
    examples: ['Minimum 44×44px touch targets', 'Appropriate tap spacing', 'No hover-only interactions'],
  },
  {
    title: 'Performance',
    icon: '⚡',
    description: 'Icons are inlined SVGs. Components are tree-shaken. CSS uses custom properties for zero-cost theming.',
    examples: ['Inline SVG icons — no icon font weight', 'Individual component imports', 'CSS-variable theming — no JS'],
  },
  {
    title: 'Developer Experience',
    icon: '⌨',
    description: 'Strong TypeScript types. Composable APIs. Predictable props and events across all components.',
    examples: ['Full TypeScript support', 'Consistent v-model patterns', 'Self-documenting prop names'],
  },
];

const tokenGroups = [
  { category: 'Color', prefix: '--coar-color-*', description: 'Raw color primitives (gray, slate, accent, green, red, amber)' },
  { category: 'Background', prefix: '--coar-background-*', description: 'Semantic background tokens for accent, brand, neutral, and status' },
  { category: 'Text', prefix: '--coar-text-*', description: 'Text color tokens for all states and emphasis levels' },
  { category: 'Border', prefix: '--coar-border-*', description: 'Border color tokens for interactive and structural borders' },
  { category: 'Spacing', prefix: '--coar-spacing-*', description: 'Space scale: xxs (2px) → xxxl (64px) on a 4px grid' },
  { category: 'Radius', prefix: '--coar-radius-*', description: 'Border radius: xxs (1px) → full (999px)' },
  { category: 'Shadow', prefix: '--coar-shadow-*', description: 'Elevation shadows: xs → xl plus focus ring' },
  { category: 'Typography', prefix: '--coar-titles-* --coar-headings-* --coar-body-*', description: 'Font family, size, weight tokens for each text role' },
  { category: 'Motion', prefix: '--coar-duration-* --coar-ease-* --coar-transition-*', description: 'Duration, easing, and pre-composed transition tokens' },
];
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Design Principles</h1>
      <p class="page-description">
        The foundation of the COAR Design System — UI components for Vue 3 built with clarity, consistency, and accessibility at the core.
      </p>
    </header>

    <div class="examples-content">
      <h2 class="component-section-title">Core Principles</h2>
      <p class="component-section-description">Six principles guide every design decision in the system.</p>

      <div class="principles-grid">
        <CoarCard v-for="principle in principles" :key="principle.title" elevated variant="info">
          <div class="principle-header">
            <span class="principle-icon">{{ principle.icon }}</span>
            <h3>{{ principle.title }}</h3>
          </div>
          <p class="coar-body-small">{{ principle.description }}</p>
          <ul class="principle-examples">
            <li v-for="ex in principle.examples" :key="ex" class="coar-body-small">{{ ex }}</li>
          </ul>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Design Token Architecture</h2>
      <p class="component-section-description">
        COAR uses a two-layer token system: raw primitives referenced by semantic tokens.
        Always use semantic tokens in components — they adapt automatically to light/dark mode.
      </p>

      <div class="examples-grid">
        <CoarCard elevated class="examples-grid__span">
          <table class="api-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Token Prefix</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in tokenGroups" :key="group.category">
                <td><strong>{{ group.category }}</strong></td>
                <td><code>{{ group.prefix }}</code></td>
                <td>{{ group.description }}</td>
              </tr>
            </tbody>
          </table>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Do's & Don'ts</h2>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3 style="color: var(--coar-background-semantic-success-bold)">✓ Do</h3>
          <ul class="dos-list">
            <li class="coar-body-small">Use semantic tokens (<code>--coar-text-neutral-primary</code>)</li>
            <li class="coar-body-small">Follow the 4px spacing grid</li>
            <li class="coar-body-small">Use <code>v-model</code> for two-way binding</li>
            <li class="coar-body-small">Import components individually for tree-shaking</li>
            <li class="coar-body-small">Test keyboard navigation for every interaction</li>
            <li class="coar-body-small">Provide <code>aria-label</code> for icon-only buttons</li>
          </ul>
        </CoarCard>

        <CoarCard elevated>
          <h3 style="color: var(--coar-background-semantic-error-bold)">✕ Don't</h3>
          <ul class="dont-list">
            <li class="coar-body-small">Hardcode colors or spacing values</li>
            <li class="coar-body-small">Use primitive tokens directly (<code>--coar-color-gray-500</code>)</li>
            <li class="coar-body-small">Override component internals with deep selectors</li>
            <li class="coar-body-small">Create hover-only interactions</li>
            <li class="coar-body-small">Mix spacing values not on the 4px grid</li>
            <li class="coar-body-small">Ignore <code>prefers-reduced-motion</code></li>
          </ul>
        </CoarCard>
      </div>

      <CoarNote variant="info" style="margin-top: var(--coar-spacing-l)">
        <strong>Dark Mode:</strong> Toggle dark mode by adding the <code>.dark-mode</code> class to <code>document.documentElement</code>.
        All tokens and components update automatically — no JavaScript required at render time.
      </CoarNote>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}

.principles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--coar-spacing-m);
  margin-bottom: var(--coar-spacing-l);
}

.principle-header {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  margin-bottom: var(--coar-spacing-s);
}

.principle-icon {
  font-size: 24px;
  color: var(--coar-text-accent-primary);
}

.principle-examples {
  margin: var(--coar-spacing-s) 0 0;
  padding-left: var(--coar-spacing-m);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.principle-examples li { color: var(--coar-text-neutral-secondary); }

.dos-list, .dont-list {
  margin: 0;
  padding-left: var(--coar-spacing-m);
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
}

.dos-list li { color: var(--coar-text-neutral-primary); }
.dont-list li { color: var(--coar-text-neutral-primary); }
</style>
