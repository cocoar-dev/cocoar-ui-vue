<script setup lang="ts">
import { CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<a class="coar-link" href="/path">Default link</a>`;
const codeVariants = `<a class="coar-link" href="#">Default (accent)</a>
<a class="coar-link coar-link--subtle" href="#">Subtle link</a>`;
const codeSizes = `<a class="coar-link coar-link--sm" href="#">Small link</a>
<a class="coar-link" href="#">Default link</a>
<a class="coar-link coar-link--lg" href="#">Large link</a>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Link</h1>
      <p class="page-description">
        CSS-only link styles applied to native anchor elements. Supports accent and subtle variants,
        size modifiers, and disabled state. No wrapper component needed.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="<!-- Import via @cocoar/vue-ui/styles -->"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Link</h3>
          <p class="example-description">Default accent-colored link with underline on hover.</p>
          <div class="example-demo">
            <a class="coar-link" href="javascript:void(0)">Default link</a>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Variants</h3>
          <p class="example-description">Accent (default) and subtle variants for different emphasis levels.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <div><a class="coar-link" href="javascript:void(0)">Accent link (default)</a> — Primary interactive text</div>
            <div><a class="coar-link coar-link--subtle" href="javascript:void(0)">Subtle link</a> — Secondary actions, less emphasis</div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeVariants" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Three size modifiers matching the typography scale.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <div><a class="coar-link coar-link--sm" href="javascript:void(0)">Small link</a> — Compact contexts</div>
            <div><a class="coar-link" href="javascript:void(0)">Default link</a> — Body text size</div>
            <div><a class="coar-link coar-link--lg" href="javascript:void(0)">Large link</a> — Prominent CTAs</div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeSizes" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Disabled State</h3>
          <p class="example-description">Disable a link by adding the <code>aria-disabled</code> attribute.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <div><a class="coar-link" href="javascript:void(0)">Active link</a></div>
            <div><a class="coar-link coar-link--disabled" href="javascript:void(0)" aria-disabled="true">Disabled link</a></div>
          </div>
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Inline Usage</h3>
          <p class="example-description">Links work naturally within flowing text content.</p>
          <div class="example-demo">
            <p class="coar-body-small">
              The COAR Design System is built on top of
              <a class="coar-link" href="javascript:void(0)">Vue 3</a> and uses the
              <a class="coar-link" href="javascript:void(0)">Temporal API</a> for date/time handling.
              See the <a class="coar-link" href="javascript:void(0)">Getting Started guide</a> or
              browse the <a class="coar-link coar-link--subtle" href="javascript:void(0)">full component reference</a>
              for more details.
            </p>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Link CSS Classes</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Class</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.coar-link</code></td><td>Base link style — accent color, underline on hover</td></tr>
              <tr><td><code>.coar-link--subtle</code></td><td>Subtle variant with less color emphasis</td></tr>
              <tr><td><code>.coar-link--sm</code></td><td>Small text size</td></tr>
              <tr><td><code>.coar-link--lg</code></td><td>Large text size</td></tr>
              <tr><td><code>.coar-link--disabled</code></td><td>Disabled appearance (use with aria-disabled)</td></tr>
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
code {
  background: var(--coar-background-neutral-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--coar-radius-xxs);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
}
</style>
