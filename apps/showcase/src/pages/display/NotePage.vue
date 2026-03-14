<script setup lang="ts">
import { CoarNote, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<CoarNote variant="info">
  <strong>Note:</strong> This is an informational message.
</CoarNote>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Note</h1>
      <p class="page-description">
        Notes are callout components for highlighting important information, tips, warnings, or contextual messages.
        They feature a colored left border and subtle background to draw attention without being intrusive.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarNote } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Color Variants</h3>
          <p class="example-description">Six semantic variants for different contexts and meanings.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarNote variant="info"><strong>Info:</strong> Informational message for guidance or context.</CoarNote>
            <CoarNote variant="success"><strong>Success:</strong> Action completed successfully.</CoarNote>
            <CoarNote variant="warning"><strong>Warning:</strong> Pay attention, potential issue ahead.</CoarNote>
            <CoarNote variant="error"><strong>Error:</strong> Something went wrong. Action required.</CoarNote>
            <CoarNote variant="neutral">Neutral note for general content without semantic meaning.</CoarNote>
            <CoarNote variant="brand">Brand-colored note for promotional or feature highlights.</CoarNote>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Padding Sizes</h3>
          <p class="example-description">Two padding options for different density needs.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarNote variant="info" padding="s">Small padding — compact notes in tight spaces.</CoarNote>
            <CoarNote variant="info" padding="m">Medium padding (default) — standard note spacing.</CoarNote>
          </div>
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Rich Content</h3>
          <p class="example-description">Notes support rich HTML content including links and formatted text.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarNote variant="info">
              <strong>Did you know?</strong> The Temporal API is the modern JavaScript standard for date/time handling.
              It provides <code>PlainDate</code>, <code>PlainDateTime</code>, and <code>ZonedDateTime</code> types
              for precise date and time manipulation without timezone ambiguity.
            </CoarNote>
            <CoarNote variant="warning">
              <strong>Breaking Change in v2.0:</strong> The <code>value</code> prop has been renamed to <code>modelValue</code>
              to align with Vue 3's composition API conventions. Update your code before upgrading.
            </CoarNote>
            <CoarNote variant="success">
              <strong>Migration Complete:</strong> Your project has been successfully upgraded to the latest version.
              All components have been updated and tests are passing.
            </CoarNote>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Note API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>variant</code></td><td><code>'neutral' | 'info' | 'success' | 'warning' | 'error' | 'brand'</code></td><td><code>'neutral'</code></td><td>Note color variant</td></tr>
              <tr><td><code>padding</code></td><td><code>'s' | 'm'</code></td><td><code>'m'</code></td><td>Internal padding size</td></tr>
            </tbody>
          </table>
          <h4>Slots</h4>
          <table class="api-table">
            <thead><tr><th>Slot</th><th>Description</th></tr></thead>
            <tbody><tr><td><code>default</code></td><td>Note content (supports rich HTML)</td></tr></tbody>
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
h4 { margin: var(--coar-spacing-m) 0 var(--coar-spacing-xs); font-size: var(--coar-body-base-size); font-weight: var(--coar-body-base-bold-weight); }
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }
code {
  background: var(--coar-background-neutral-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--coar-radius-xxs);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
}
</style>
