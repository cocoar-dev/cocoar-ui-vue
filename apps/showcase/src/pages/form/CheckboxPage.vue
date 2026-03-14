<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const basic = ref(false);
const required = ref(false);
const indeterminate = ref(false);

const codeBasic = `<CoarCheckbox v-model="checked" label="Accept terms and conditions" />`;
const codeIndeterminate = `<CoarCheckbox v-model="checked" :indeterminate="true" label="Select all" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Checkbox</h1>
      <p class="page-description">Checkboxes allow users to select one or more items from a set, or toggle a single option on or off.</p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarCheckbox } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Simple checkbox with a label.</p>
          <div class="example-demo">
            <CoarCheckbox v-model="basic" label="Accept terms and conditions" />
          </div>
          <p class="demo-value">Checked: {{ basic }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>States</h3>
          <p class="example-description">Required, disabled checked, disabled unchecked, and error states.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarCheckbox v-model="required" label="Required checkbox" :required="true" />
            <CoarCheckbox :model-value="true" label="Disabled (checked)" :disabled="true" />
            <CoarCheckbox :model-value="false" label="Disabled (unchecked)" :disabled="true" />
            <CoarCheckbox :model-value="false" label="With error" error="This field is required" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Indeterminate</h3>
          <p class="example-description">The indeterminate state represents a partially selected group.</p>
          <div class="example-demo">
            <CoarCheckbox v-model="indeterminate" :indeterminate="true" label="Select all (partial)" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeIndeterminate" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Three size variants for different contexts.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarCheckbox :model-value="true" size="s" label="Small checkbox" />
            <CoarCheckbox :model-value="true" size="m" label="Medium checkbox (default)" />
            <CoarCheckbox :model-value="true" size="l" label="Large checkbox" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Hint Text</h3>
          <p class="example-description">Additional context below the label.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarCheckbox :model-value="false" label="Subscribe to newsletter" hint="Receive weekly updates about new features." />
            <CoarCheckbox :model-value="false" label="Enable analytics" hint="Help us improve the product by sharing usage data." />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Without Label</h3>
          <p class="example-description">Use the checkbox without a visible label for custom layouts.</p>
          <div class="example-demo demo-row">
            <CoarCheckbox :model-value="false" aria-label="Select row 1" />
            <CoarCheckbox :model-value="true" aria-label="Select row 2" />
            <CoarCheckbox :model-value="false" :indeterminate="true" aria-label="Select all" />
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Checkbox API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Checked state</td></tr>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>''</code></td><td>Label text</td></tr>
              <tr><td><code>hint</code></td><td><code>string</code></td><td><code>''</code></td><td>Hint text below label</td></tr>
              <tr><td><code>error</code></td><td><code>string</code></td><td><code>''</code></td><td>Error message</td></tr>
              <tr><td><code>size</code></td><td><code>'s' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Checkbox size</td></tr>
              <tr><td><code>indeterminate</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Show indeterminate (dash) state</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the checkbox</td></tr>
              <tr><td><code>required</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Mark as required</td></tr>
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
</style>
