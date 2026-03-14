<script setup lang="ts">
import { CoarSpinner, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<CoarSpinner />`;
const codeSizes = `<CoarSpinner size="xs" />
<CoarSpinner size="s" />
<CoarSpinner size="m" />
<CoarSpinner size="l" />
<CoarSpinner size="xl" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Spinner</h1>
      <p class="page-description">
        Spinners indicate indeterminate loading states. Use them when content is being fetched and the duration is unknown.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarSpinner } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Spinner</h3>
          <p class="example-description">A simple spinning loading indicator.</p>
          <div class="example-demo" style="display: flex; justify-content: center; padding: var(--coar-spacing-l)">
            <CoarSpinner />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Five sizes from compact <code>xs</code> to large <code>xl</code>.</p>
          <div class="example-demo demo-row demo-row--align-end" style="justify-content: center; gap: var(--coar-spacing-xl)">
            <div class="spin-size-item"><CoarSpinner size="xs" /><span class="size-label">xs</span></div>
            <div class="spin-size-item"><CoarSpinner size="s" /><span class="size-label">s</span></div>
            <div class="spin-size-item"><CoarSpinner size="m" /><span class="size-label">m</span></div>
            <div class="spin-size-item"><CoarSpinner size="l" /><span class="size-label">l</span></div>
            <div class="spin-size-item"><CoarSpinner size="xl" /><span class="size-label">xl</span></div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeSizes" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Colors</h3>
          <p class="example-description">Spinners inherit current color or accept a custom color prop.</p>
          <div class="example-demo demo-row" style="justify-content: center; gap: var(--coar-spacing-l)">
            <CoarSpinner />
            <CoarSpinner color="var(--coar-background-semantic-success-bold)" />
            <CoarSpinner color="var(--coar-background-semantic-error-bold)" />
            <CoarSpinner color="var(--coar-background-semantic-warning-bold)" />
            <CoarSpinner color="var(--coar-text-accent-primary)" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>With Loading Text</h3>
          <p class="example-description">Combine spinner with text for a complete loading state.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <div class="loading-row">
              <CoarSpinner size="s" />
              <span class="coar-body-small">Loading data...</span>
            </div>
            <div class="loading-row">
              <CoarSpinner size="m" />
              <span class="coar-body-small">Saving changes...</span>
            </div>
            <div class="loading-row">
              <CoarSpinner size="l" />
              <span>Processing request...</span>
            </div>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Full Page Overlay</h3>
          <p class="example-description">A typical loading overlay pattern.</p>
          <div class="example-demo">
            <div class="loading-overlay">
              <CoarSpinner size="xl" />
              <span class="coar-body-small">Loading application...</span>
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Spinner API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l' | 'xl'</code></td><td><code>'m'</code></td><td>Spinner size</td></tr>
              <tr><td><code>color</code></td><td><code>string</code></td><td><code>'currentColor'</code></td><td>Spinner color (any CSS color value)</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }

.spin-size-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--coar-spacing-s);
}

.size-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
}

.loading-overlay {
  background: var(--coar-background-neutral-primary);
  border-radius: var(--coar-radius-m);
  border: 1px solid var(--coar-border-neutral-secondary);
  padding: var(--coar-spacing-xxl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--coar-spacing-m);
  min-height: 160px;
  justify-content: center;
}
</style>
