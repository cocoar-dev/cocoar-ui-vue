<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const basic = ref<number | null>(null);
const quantity = ref<number | null>(1);
const percentage = ref<number | null>(75);
const price = ref<number | null>(null);

const codeBasic = `<CoarNumberInput v-model="value" label="Quantity" placeholder="Enter a number" />`;
const codeStep = `<CoarNumberInput v-model="value" label="Percentage" :min="0" :max="100" :step="5" suffix="%" />`;
const codeStepper = `<CoarNumberInput v-model="value" label="Amount" stepper-buttons="both" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Number Input</h1>
      <p class="page-description">
        Numeric input with increment/decrement controls, step validation, min/max bounds, and number formatting support.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarNumberInput } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Simple numeric input with label and placeholder.</p>
          <div class="example-demo example-demo--form">
            <CoarNumberInput v-model="basic" label="Count" placeholder="Enter a number" hint="Whole numbers only" />
          </div>
          <p class="demo-value">Value: {{ basic ?? 'empty' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Min / Max / Step</h3>
          <p class="example-description">Constrain the range and increment size.</p>
          <div class="example-demo example-demo--form">
            <CoarNumberInput v-model="percentage" label="Percentage" :min="0" :max="100" :step="5" suffix="%" hint="0–100 in steps of 5" />
          </div>
          <p class="demo-value">Value: {{ percentage ?? 'empty' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeStep" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Stepper Buttons</h3>
          <p class="example-description">Show increment/decrement buttons. Options: <code>'start'</code>, <code>'end'</code>, <code>'both'</code>.</p>
          <div class="example-demo example-demo--form">
            <CoarNumberInput v-model="quantity" label="Quantity" stepper-buttons="both" :min="1" :max="99" />
            <CoarNumberInput v-model="price" label="Price (end)" stepper-buttons="end" :min="0" :step="0.01" suffix="€" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeStepper" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>States</h3>
          <p class="example-description">Disabled, readonly, required, and error states.</p>
          <div class="example-demo example-demo--form">
            <CoarNumberInput :model-value="42" label="Disabled" :disabled="true" />
            <CoarNumberInput :model-value="42" label="Readonly" :readonly="true" />
            <CoarNumberInput label="Required" :required="true" placeholder="Required" />
            <CoarNumberInput label="With Error" error="Value must be between 1 and 100" />
          </div>
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Sizes</h3>
          <p class="example-description">Four size variants matching other form inputs.</p>
          <div class="example-demo sizes-grid">
            <CoarNumberInput size="xs" label="Extra Small" placeholder="xs" />
            <CoarNumberInput size="s" label="Small" placeholder="s" />
            <CoarNumberInput size="m" label="Medium" placeholder="m" />
            <CoarNumberInput size="l" label="Large" placeholder="l" />
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Number Input API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>number | null</code></td><td><code>null</code></td><td>Current numeric value</td></tr>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>''</code></td><td>Label text</td></tr>
              <tr><td><code>placeholder</code></td><td><code>string</code></td><td><code>''</code></td><td>Placeholder text</td></tr>
              <tr><td><code>min</code></td><td><code>number</code></td><td><code>-Infinity</code></td><td>Minimum allowed value</td></tr>
              <tr><td><code>max</code></td><td><code>number</code></td><td><code>Infinity</code></td><td>Maximum allowed value</td></tr>
              <tr><td><code>step</code></td><td><code>number</code></td><td><code>1</code></td><td>Step increment</td></tr>
              <tr><td><code>suffix</code></td><td><code>string</code></td><td><code>''</code></td><td>Suffix text (e.g. '%', '€')</td></tr>
              <tr><td><code>stepperButtons</code></td><td><code>'start' | 'end' | 'both' | 'none'</code></td><td><code>'none'</code></td><td>Show stepper buttons</td></tr>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Input size</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the input</td></tr>
              <tr><td><code>readonly</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Make read-only</td></tr>
              <tr><td><code>required</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Mark as required</td></tr>
              <tr><td><code>error</code></td><td><code>string</code></td><td><code>''</code></td><td>Error message</td></tr>
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
