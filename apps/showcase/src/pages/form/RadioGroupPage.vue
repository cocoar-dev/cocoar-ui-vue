<script setup lang="ts">
import { ref } from 'vue';
import { CoarRadioGroup, CoarRadioButton, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const size = ref<string>('m');
const color = ref<string>('');
const orientation = ref<string>('horizontal');
const disabled = ref<string>('option1');

const codeBasic = `<CoarRadioGroup v-model="value" label="Size">
  <CoarRadioButton value="xs">Extra Small</CoarRadioButton>
  <CoarRadioButton value="s">Small</CoarRadioButton>
  <CoarRadioButton value="m">Medium</CoarRadioButton>
  <CoarRadioButton value="l">Large</CoarRadioButton>
</CoarRadioGroup>`;

const codeVertical = `<CoarRadioGroup v-model="value" label="Color" orientation="vertical">
  <CoarRadioButton value="red">Red</CoarRadioButton>
  <CoarRadioButton value="green">Green</CoarRadioButton>
  <CoarRadioButton value="blue">Blue</CoarRadioButton>
</CoarRadioGroup>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Radio Group</h1>
      <p class="page-description">Radio groups allow users to select a single option from a set of mutually exclusive choices.</p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Horizontal (Default)</h3>
          <p class="example-description">Options are arranged side by side. Best for short labels.</p>
          <div class="example-demo">
            <CoarRadioGroup v-model="size" label="Button Size">
              <CoarRadioButton value="xs">XS</CoarRadioButton>
              <CoarRadioButton value="s">S</CoarRadioButton>
              <CoarRadioButton value="m">M</CoarRadioButton>
              <CoarRadioButton value="l">L</CoarRadioButton>
            </CoarRadioGroup>
          </div>
          <p class="demo-value">Selected: {{ size }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Vertical</h3>
          <p class="example-description">Stack options vertically. Better for longer labels or many options.</p>
          <div class="example-demo">
            <CoarRadioGroup v-model="color" label="Preferred Color" orientation="vertical">
              <CoarRadioButton value="red">Red — Passionate and energetic</CoarRadioButton>
              <CoarRadioButton value="blue">Blue — Calm and trustworthy</CoarRadioButton>
              <CoarRadioButton value="green">Green — Fresh and natural</CoarRadioButton>
              <CoarRadioButton value="purple">Purple — Creative and luxurious</CoarRadioButton>
            </CoarRadioGroup>
          </div>
          <p class="demo-value">Selected: {{ color || 'none' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeVertical" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>States</h3>
          <p class="example-description">Required, error, and disabled states.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarRadioGroup :model-value="'a'" label="Required Group" :required="true">
              <CoarRadioButton value="a">Option A</CoarRadioButton>
              <CoarRadioButton value="b">Option B</CoarRadioButton>
            </CoarRadioGroup>
            <CoarRadioGroup :model-value="''" label="With Error" error="Please select an option">
              <CoarRadioButton value="a">Option A</CoarRadioButton>
              <CoarRadioButton value="b">Option B</CoarRadioButton>
            </CoarRadioGroup>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Disabled Buttons</h3>
          <p class="example-description">Individual options can be disabled independently.</p>
          <div class="example-demo">
            <CoarRadioGroup v-model="disabled" label="Plan">
              <CoarRadioButton value="option1">Free</CoarRadioButton>
              <CoarRadioButton value="option2">Pro</CoarRadioButton>
              <CoarRadioButton value="option3" :disabled="true">Enterprise (Coming Soon)</CoarRadioButton>
            </CoarRadioGroup>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Radio groups support the same sizes as other form controls.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarRadioGroup :model-value="'a'" label="Small" size="s">
              <CoarRadioButton value="a">Option A</CoarRadioButton>
              <CoarRadioButton value="b">Option B</CoarRadioButton>
            </CoarRadioGroup>
            <CoarRadioGroup :model-value="'a'" label="Medium (default)" size="m">
              <CoarRadioButton value="a">Option A</CoarRadioButton>
              <CoarRadioButton value="b">Option B</CoarRadioButton>
            </CoarRadioGroup>
            <CoarRadioGroup :model-value="'a'" label="Large" size="l">
              <CoarRadioButton value="a">Option A</CoarRadioButton>
              <CoarRadioButton value="b">Option B</CoarRadioButton>
            </CoarRadioGroup>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Radio Group API</summary>
        <div class="api-content">
          <h4>CoarRadioGroup Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>unknown</code></td><td><code>undefined</code></td><td>Currently selected value</td></tr>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>''</code></td><td>Group label</td></tr>
              <tr><td><code>orientation</code></td><td><code>'horizontal' | 'vertical'</code></td><td><code>'horizontal'</code></td><td>Layout direction</td></tr>
              <tr><td><code>size</code></td><td><code>'s' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Radio button size</td></tr>
              <tr><td><code>required</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Mark as required</td></tr>
              <tr><td><code>error</code></td><td><code>string</code></td><td><code>''</code></td><td>Error message</td></tr>
            </tbody>
          </table>
          <h4>CoarRadioButton Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>value</code></td><td><code>unknown</code></td><td><code>—</code></td><td>Value emitted when selected</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable this option</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
h3, h4 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}
h4 { margin-top: var(--coar-spacing-m); }
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }
</style>
