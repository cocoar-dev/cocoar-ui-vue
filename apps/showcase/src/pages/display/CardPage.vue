<script setup lang="ts">
import { CoarCard, CoarButton, CoarTag, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<CoarCard>
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</CoarCard>`;

const codeVariants = `<CoarCard variant="info" elevated>Info card</CoarCard>
<CoarCard variant="success" elevated>Success card</CoarCard>
<CoarCard variant="warning" elevated>Warning card</CoarCard>
<CoarCard variant="error" elevated>Error card</CoarCard>
<CoarCard variant="neutral" elevated>Neutral card</CoarCard>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Card</h1>
      <p class="page-description">A versatile container component for grouping related content and actions.</p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarCard } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard variant="outlined">
          <h3>Basic Usage</h3>
          <p class="example-description">A simple card with default settings.</p>
          <div class="example-demo">
            <CoarCard elevated>
              <h4>Card Title</h4>
              <p class="coar-body-small">This is a basic card with default settings. Cards help organize content into distinct sections.</p>
            </CoarCard>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard variant="outlined">
          <h3>Elevated vs Outlined</h3>
          <p class="example-description">Two main appearance styles.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarCard elevated>
              <span class="coar-body-small">Elevated — box shadow for depth</span>
            </CoarCard>
            <CoarCard variant="outlined">
              <span class="coar-body-small">Outlined — border without shadow</span>
            </CoarCard>
          </div>
        </CoarCard>

        <CoarCard variant="outlined">
          <h3>Color Variants</h3>
          <p class="example-description">Semantic color variants for different contexts.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarCard variant="info" elevated><span class="coar-body-small">Info — tips, guidance, neutral context</span></CoarCard>
            <CoarCard variant="success" elevated><span class="coar-body-small">Success — positive results</span></CoarCard>
            <CoarCard variant="warning" elevated><span class="coar-body-small">Warning — caution, attention needed</span></CoarCard>
            <CoarCard variant="error" elevated><span class="coar-body-small">Error — problems, validation failures</span></CoarCard>
            <CoarCard variant="neutral" elevated><span class="coar-body-small">Neutral — default, no semantic meaning</span></CoarCard>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeVariants" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard variant="outlined">
          <h3>Padding Sizes</h3>
          <p class="example-description">Three padding options for different content densities.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarCard elevated padding="s">
              <span class="coar-body-small">Small padding (s)</span>
            </CoarCard>
            <CoarCard elevated padding="m">
              <span class="coar-body-small">Medium padding (m) — default</span>
            </CoarCard>
            <CoarCard elevated padding="l">
              <span class="coar-body-small">Large padding (l)</span>
            </CoarCard>
          </div>
        </CoarCard>

        <CoarCard variant="outlined" class="examples-grid__span">
          <h3>Content Card Example</h3>
          <p class="example-description">A real-world card with header, body, tags, and action buttons.</p>
          <div class="example-demo">
            <CoarCard elevated style="max-width: 400px">
              <div class="card-header">
                <h4 style="margin: 0">New Feature Release</h4>
                <span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">2 hours ago</span>
              </div>
              <p class="coar-body-small" style="margin: var(--coar-spacing-s) 0">
                We've just released a major update to the date picker component. It now supports timezone-aware datetime selection using the Temporal API.
              </p>
              <div class="demo-row" style="margin-bottom: var(--coar-spacing-m)">
                <CoarTag variant="info">New</CoarTag>
                <CoarTag variant="success">Stable</CoarTag>
              </div>
              <div class="demo-row" style="margin: 0">
                <CoarButton variant="primary" size="s">Read More</CoarButton>
                <CoarButton variant="ghost" size="s">Dismiss</CoarButton>
              </div>
            </CoarCard>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Card API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>variant</code></td><td><code>'neutral' | 'info' | 'success' | 'warning' | 'error' | 'outlined'</code></td><td><code>'neutral'</code></td><td>Card color/style variant</td></tr>
              <tr><td><code>padding</code></td><td><code>'s' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Internal padding size</td></tr>
              <tr><td><code>elevated</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Add box shadow for elevation</td></tr>
            </tbody>
          </table>
          <h4>Slots</h4>
          <table class="api-table">
            <thead><tr><th>Slot</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>default</code></td><td>Card content</td></tr>
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
h4 { margin: 0 0 var(--coar-spacing-xs); font-size: var(--coar-body-base-size); font-weight: var(--coar-body-base-bold-weight); }
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--coar-spacing-xs); }
</style>
