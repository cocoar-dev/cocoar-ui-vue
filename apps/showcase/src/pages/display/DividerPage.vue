<script setup lang="ts">
import { CoarDivider, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<CoarDivider />`;
const codeLabel = `<CoarDivider label="Or continue with" />`;
const codeAlign = `<CoarDivider label="Left" align="start" />
<CoarDivider label="Center" align="center" />
<CoarDivider label="Right" align="end" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Divider</h1>
      <p class="page-description">
        A flexible divider for visually separating content sections. Supports optional text or icons with left, center, or right alignment.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarDivider } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Divider</h3>
          <p class="example-description">A simple horizontal line to separate content sections.</p>
          <div class="example-demo">
            <p class="coar-body-small">Content above the divider</p>
            <CoarDivider />
            <p class="coar-body-small">Content below the divider</p>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>With Label</h3>
          <p class="example-description">Add a text label centered in the divider line.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarDivider label="Or continue with" />
            <CoarDivider label="Section Title" />
            <CoarDivider label="More options" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeLabel" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Alignment</h3>
          <p class="example-description">Position the label at the start, center, or end.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarDivider label="Start" align="start" />
            <CoarDivider label="Center (default)" align="center" />
            <CoarDivider label="End" align="end" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeAlign" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Variants</h3>
          <p class="example-description">Different visual styles for different contexts.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarDivider label="Default" />
            <CoarDivider label="Subtle" variant="subtle" />
            <CoarDivider label="Bold" variant="bold" />
          </div>
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Real-world Usage</h3>
          <p class="example-description">Common patterns using dividers in layouts.</p>
          <div class="example-demo real-world-demo">
            <div class="login-section">
              <button class="oauth-btn">Continue with Google</button>
              <button class="oauth-btn">Continue with GitHub</button>
              <CoarDivider label="or sign in with email" />
              <div class="form-field">
                <label class="coar-body-small">Email</label>
                <input type="email" placeholder="you@example.com" class="native-input" />
              </div>
              <div class="form-field">
                <label class="coar-body-small">Password</label>
                <input type="password" placeholder="••••••••" class="native-input" />
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Divider API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>undefined</code></td><td>Text label in the divider</td></tr>
              <tr><td><code>align</code></td><td><code>'start' | 'center' | 'end'</code></td><td><code>'center'</code></td><td>Label alignment</td></tr>
              <tr><td><code>variant</code></td><td><code>'default' | 'subtle' | 'bold'</code></td><td><code>'default'</code></td><td>Line style variant</td></tr>
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

.real-world-demo { max-width: 360px; }

.login-section {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}

.oauth-btn {
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  font-size: var(--coar-body-small-base-size);
  cursor: pointer;
  transition: background var(--coar-duration-fast) var(--coar-ease-out);
}
.oauth-btn:hover { background: var(--coar-background-neutral-tertiary); }

.form-field { display: flex; flex-direction: column; gap: 4px; }

.native-input {
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  font-size: var(--coar-body-small-base-size);
}
</style>
