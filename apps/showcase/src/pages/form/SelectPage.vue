<script setup lang="ts">
import { ref } from 'vue';
import { CoarSelect, CoarMultiSelect, CoarTagSelect, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const fruitOptions: CoarSelectOption<string>[] = [
  { value: 'apple',      label: 'Apple' },
  { value: 'banana',     label: 'Banana' },
  { value: 'cherry',     label: 'Cherry' },
  { value: 'date',       label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig',        label: 'Fig' },
];

const countryOptions: CoarSelectOption<string>[] = [
  { value: 'us', label: 'United States' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'br', label: 'Brazil' },
  { value: 'au', label: 'Australia' },
];

const singleValue = ref<string | null>(null);
const multiValue = ref<string[]>([]);
const tagValue = ref<string[]>([]);

const codeBasic = `<CoarSelect
  v-model="value"
  :options="options"
  label="Select a fruit"
  placeholder="Choose..."
/>`;

const codeMulti = `<CoarMultiSelect
  v-model="values"
  :options="options"
  label="Select fruits"
  placeholder="Choose multiple..."
/>`;

const codeTag = `<CoarTagSelect
  v-model="tags"
  :options="options"
  label="Tags"
  placeholder="Add tags..."
/>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Select</h1>
      <p class="page-description">
        Select components for single and multiple value selection. Choose between Single Select, Multi Select,
        or Tag Select variants.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarSelect, CoarMultiSelect, CoarTagSelect } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <h2 class="component-section-title">Single Select</h2>
      <p class="component-section-description">Select a single option from a dropdown list.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Select</h3>
          <p class="example-description">Select a single option from a dropdown list.</p>
          <div class="example-demo example-demo--form">
            <CoarSelect
              v-model="singleValue"
              :options="fruitOptions"
              label="Favorite fruit"
              placeholder="Choose a fruit..."
            />
          </div>
          <p class="demo-value">Selected: {{ singleValue || 'none' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>States</h3>
          <p class="example-description">Disabled, required, and error states.</p>
          <div class="example-demo example-demo--form">
            <CoarSelect :options="fruitOptions" label="Required" placeholder="Required field" :required="true" />
            <CoarSelect :options="fruitOptions" label="With Error" placeholder="Error state" error="Please select an option" />
            <CoarSelect :options="fruitOptions" label="Disabled" placeholder="Disabled" :disabled="true" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Four size variants matching other form inputs.</p>
          <div class="example-demo example-demo--form">
            <CoarSelect size="xs" :options="fruitOptions" label="Extra Small" placeholder="xs" />
            <CoarSelect size="s" :options="fruitOptions" label="Small" placeholder="s" />
            <CoarSelect size="m" :options="fruitOptions" label="Medium" placeholder="m" />
            <CoarSelect size="l" :options="fruitOptions" label="Large" placeholder="l" />
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Multi Select</h2>
      <p class="component-section-description">Select multiple values from a dropdown. Selected items show as tags in the input.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Multi Select</h3>
          <p class="example-description">Allow selection of multiple items. Click items to toggle selection.</p>
          <div class="example-demo example-demo--form">
            <CoarMultiSelect
              v-model="multiValue"
              :options="fruitOptions"
              label="Favorite fruits"
              placeholder="Choose multiple..."
            />
          </div>
          <p class="demo-value">Selected: {{ multiValue.join(', ') || 'none' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeMulti" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>
      </div>

      <h2 class="component-section-title">Tag Select</h2>
      <p class="component-section-description">Inline tag-based selection. Selected values appear as removable tags directly in the input field.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Tag Select</h3>
          <p class="example-description">Tags appear inline in the input. Remove tags with the × button or backspace.</p>
          <div class="example-demo example-demo--form">
            <CoarTagSelect
              v-model="tagValue"
              :options="countryOptions"
              label="Countries"
              placeholder="Add countries..."
            />
          </div>
          <p class="demo-value">Selected: {{ tagValue.join(', ') || 'none' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeTag" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Select API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>T | null</code></td><td><code>null</code></td><td>Selected value (the option's <code>value</code> field)</td></tr>
              <tr><td><code>options</code></td><td><code>CoarSelectOption&lt;T&gt;[]</code></td><td><code>[]</code></td><td>Array of <code>&#123; value, label &#125;</code> option objects</td></tr>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>''</code></td><td>Field label</td></tr>
              <tr><td><code>placeholder</code></td><td><code>string</code></td><td><code>''</code></td><td>Placeholder when empty</td></tr>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Input size</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the select</td></tr>
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
</style>
