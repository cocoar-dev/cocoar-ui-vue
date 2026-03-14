<script setup lang="ts">
import { ref } from 'vue';
import { CoarPasswordInput, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const password = ref('');
const confirmPassword = ref('');

const codeBasic = `<CoarPasswordInput v-model="password" label="Password" placeholder="Enter password" />`;
const codeStrength = `<CoarPasswordInput v-model="password" label="New Password" hint="Min 8 characters" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Password Input</h1>
      <p class="page-description">
        Secure password entry with show/hide toggle. The eye icon allows users to temporarily reveal their password for verification.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarPasswordInput } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Password input with show/hide toggle. Click the eye icon to reveal.</p>
          <div class="example-demo example-demo--form">
            <CoarPasswordInput v-model="password" label="Password" placeholder="Enter your password" />
          </div>
          <p class="demo-value">Length: {{ password.length }} characters</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>With Validation</h3>
          <p class="example-description">Required field with hint and error feedback.</p>
          <div class="example-demo example-demo--form">
            <CoarPasswordInput
              v-model="password"
              label="New Password"
              placeholder="Min 8 characters"
              :required="true"
              hint="Use a mix of letters, numbers, and symbols"
              :error="password.length > 0 && password.length < 8 ? 'Password must be at least 8 characters' : ''"
            />
            <CoarPasswordInput
              v-model="confirmPassword"
              label="Confirm Password"
              placeholder="Repeat your password"
              :error="confirmPassword.length > 0 && confirmPassword !== password ? 'Passwords do not match' : ''"
            />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeStrength" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>States</h3>
          <p class="example-description">Disabled and readonly states.</p>
          <div class="example-demo example-demo--form">
            <CoarPasswordInput :model-value="'secret123'" label="Disabled" :disabled="true" />
            <CoarPasswordInput :model-value="'readonly-pass'" label="Readonly" :readonly="true" />
          </div>
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Sizes</h3>
          <p class="example-description">Four sizes matching other form controls.</p>
          <div class="example-demo sizes-grid">
            <CoarPasswordInput size="xs" label="Extra Small" placeholder="xs" />
            <CoarPasswordInput size="s" label="Small" placeholder="s" />
            <CoarPasswordInput size="m" label="Medium" placeholder="m" />
            <CoarPasswordInput size="l" label="Large" placeholder="l" />
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Password Input API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>string</code></td><td><code>''</code></td><td>Password value</td></tr>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>''</code></td><td>Label text</td></tr>
              <tr><td><code>placeholder</code></td><td><code>string</code></td><td><code>''</code></td><td>Placeholder text</td></tr>
              <tr><td><code>hint</code></td><td><code>string</code></td><td><code>''</code></td><td>Hint text</td></tr>
              <tr><td><code>error</code></td><td><code>string</code></td><td><code>''</code></td><td>Error message</td></tr>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Input size</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the input</td></tr>
              <tr><td><code>readonly</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Make read-only</td></tr>
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
.sizes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--coar-spacing-m);
}
</style>
