<script setup lang="ts">
import { CoarLabel, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<CoarLabel text="Username" :required="true" hint="Choose a unique name" />`;
const codeFor = `<CoarLabel for="my-input" text="Email" :required="true" />
<input id="my-input" type="email" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Labels</h1>
      <p class="page-description">
        Form field labels with optional required indicator and hint text.
        Labels are typically rendered automatically by input components, but can be used standalone for custom form layouts.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarLabel } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Label</h3>
          <p class="example-description">Simple label with text.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarLabel text="Username" />
            <CoarLabel text="Email address" />
            <CoarLabel text="Phone number" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Required</h3>
          <p class="example-description">Add a required asterisk indicator.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarLabel text="First name" :required="true" />
            <CoarLabel text="Email" :required="true" />
            <CoarLabel text="Password" :required="true" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>With Hint</h3>
          <p class="example-description">Labels can include hint text for additional guidance.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarLabel text="Username" hint="3–20 characters, letters and numbers only" />
            <CoarLabel text="Password" :required="true" hint="Min 8 characters" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Three sizes to match different form densities.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarLabel text="Small label" size="s" :required="true" />
            <CoarLabel text="Medium label (default)" size="m" :required="true" />
            <CoarLabel text="Large label" size="l" :required="true" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Associated with Input</h3>
          <p class="example-description">Use the <code>for</code> prop to associate a label with an input element.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-xs)">
            <CoarLabel for="demo-input" text="Custom input" :required="true" hint="Enter anything" />
            <input
              id="demo-input"
              type="text"
              placeholder="Associated input"
              class="native-input"
            />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeFor" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Label API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>text</code></td><td><code>string</code></td><td><code>''</code></td><td>Label text</td></tr>
              <tr><td><code>for</code></td><td><code>string</code></td><td><code>''</code></td><td>Associated input's id</td></tr>
              <tr><td><code>hint</code></td><td><code>string</code></td><td><code>''</code></td><td>Hint text below the label</td></tr>
              <tr><td><code>required</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Show required asterisk</td></tr>
              <tr><td><code>size</code></td><td><code>'s' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Label size</td></tr>
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

.native-input {
  width: 100%;
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  font-size: var(--coar-body-small-base-size);
  box-sizing: border-box;
}
</style>
