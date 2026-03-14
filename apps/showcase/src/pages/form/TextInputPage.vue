<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const basicValue = ref('');
const emailValue = ref('');
const websiteValue = ref('');
const priceValue = ref('');
const searchValue = ref('');
const bioValue = ref('');

const codeBasic = `<CoarTextInput
  v-model="value"
  label="Username"
  placeholder="Enter your username"
  hint="Choose a unique username"
/>`;

const codeSizes = `<CoarTextInput size="xs" label="Extra Small" placeholder="27px" />
<CoarTextInput size="s" label="Small" placeholder="32px" />
<CoarTextInput size="m" label="Medium" placeholder="40px" />
<CoarTextInput size="l" label="Large" placeholder="48px" />`;

const codePrefixSuffix = `<CoarTextInput label="Website" placeholder="example.com" prefix="https://" v-model="value" />
<CoarTextInput label="Price" placeholder="0.00" suffix="EUR" v-model="value" />`;

const codeMultiline = `<CoarTextInput label="Bio" placeholder="Tell us..." :rows="4" hint="Max 500 chars" v-model="value" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Text Input</h1>
      <p class="page-description">
        A versatile text input for single-line and multiline text entry. Supports prefix/suffix, clear button,
        and can render as a textarea for longer content.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarTextInput } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Simple text input with label, placeholder, and hint.</p>
          <div class="example-demo example-demo--form">
            <CoarTextInput v-model="basicValue" label="Username" placeholder="Enter your username" hint="Choose a unique username" />
          </div>
          <p class="demo-value">Value: {{ basicValue || 'empty' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Validation States</h3>
          <p class="example-description">Required field indicator and error message display.</p>
          <div class="example-demo example-demo--form">
            <CoarTextInput v-model="emailValue" label="Email" placeholder="your@email.com" :required="true" hint="Required field" />
            <CoarTextInput label="Email" value="invalid-email" error="Please enter a valid email address" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Disabled & Readonly</h3>
          <p class="example-description">Non-interactive states for display or locked fields.</p>
          <div class="example-demo example-demo--form">
            <CoarTextInput label="Disabled" value="Cannot edit" :disabled="true" />
            <CoarTextInput label="Readonly" value="View only" :readonly="true" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Prefix & Suffix</h3>
          <p class="example-description">Add context with prefix or suffix text.</p>
          <div class="example-demo example-demo--form">
            <CoarTextInput v-model="websiteValue" label="Website" placeholder="example.com" prefix="https://" />
            <CoarTextInput v-model="priceValue" label="Price" placeholder="0.00" suffix="EUR" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codePrefixSuffix" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Clear Button</h3>
          <p class="example-description">Optional clear button appears when input has a value and is focused/hovered.</p>
          <div class="example-demo example-demo--form">
            <CoarTextInput v-model="searchValue" label="Search" placeholder="Type to search..." :clearable="true" />
          </div>
          <p class="demo-value">Value: {{ searchValue || 'empty' }}</p>
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Sizes</h3>
          <p class="example-description">Four size variants for different contexts.</p>
          <div class="example-demo sizes-grid">
            <CoarTextInput size="xs" label="Extra Small" placeholder="27px" />
            <CoarTextInput size="s" label="Small" placeholder="32px" />
            <CoarTextInput size="m" label="Medium" placeholder="40px" />
            <CoarTextInput size="l" label="Large" placeholder="48px" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeSizes" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>
      </div>

      <h2 class="component-section-title">Multiline (Textarea)</h2>
      <p class="component-section-description">Set the <code>rows</code> property to enable multiline mode.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Multiline</h3>
          <p class="example-description">Enable multiline mode for longer text content like bios or descriptions.</p>
          <div class="example-demo example-demo--form">
            <CoarTextInput v-model="bioValue" label="Bio" placeholder="Tell us about yourself..." :rows="4" hint="Max 500 characters" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeMultiline" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Row Heights</h3>
          <p class="example-description">Control initial height with the rows property.</p>
          <div class="example-demo example-demo--form">
            <CoarTextInput label="3 Rows" :rows="3" placeholder="Default height..." />
            <CoarTextInput label="6 Rows" :rows="6" placeholder="Taller..." />
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Text Input API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>string</code></td><td><code>''</code></td><td>Current input value (two-way binding)</td></tr>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>''</code></td><td>Label text above the input</td></tr>
              <tr><td><code>placeholder</code></td><td><code>string</code></td><td><code>''</code></td><td>Placeholder text when empty</td></tr>
              <tr><td><code>hint</code></td><td><code>string</code></td><td><code>''</code></td><td>Hint text below the input</td></tr>
              <tr><td><code>error</code></td><td><code>string</code></td><td><code>''</code></td><td>Error message to display</td></tr>
              <tr><td><code>prefix</code></td><td><code>string</code></td><td><code>''</code></td><td>Prefix text before the input</td></tr>
              <tr><td><code>suffix</code></td><td><code>string</code></td><td><code>''</code></td><td>Suffix text after the input</td></tr>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Input size</td></tr>
              <tr><td><code>rows</code></td><td><code>number</code></td><td><code>1</code></td><td>Rows ≥ 2 = textarea mode</td></tr>
              <tr><td><code>clearable</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show clear button when input has value</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the input</td></tr>
              <tr><td><code>readonly</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Make read-only</td></tr>
              <tr><td><code>required</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Mark as required (shows asterisk)</td></tr>
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

.sizes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--coar-spacing-m);
}
</style>
