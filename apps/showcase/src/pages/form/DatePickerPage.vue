<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDatePicker, CoarCard, CoarNote, CoarCodeBlock } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const basicDate = ref<Temporal.PlainDate | null>(null);
const rangeStart = ref<Temporal.PlainDate | null>(null);
const rangeEnd = ref<Temporal.PlainDate | null>(null);

const codeBasic = `<CoarPlainDatePicker
  v-model="date"
  label="Date"
  placeholder="DD.MM.YYYY"
/>`;

const codeRange = `<CoarPlainDatePicker v-model="start" label="Start date" />
<CoarPlainDatePicker v-model="end" label="End date" :min="start" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Date Picker</h1>
      <p class="page-description">
        A strongly-typed date picker that returns <code>Temporal.PlainDate</code> exclusively.
        Calendar-zone agnostic — no timezone conversion needed for date-only values.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarPlainDatePicker } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">A simple date picker with label and placeholder.</p>
          <div class="example-demo example-demo--form">
            <CoarPlainDatePicker v-model="basicDate" label="Select date" placeholder="DD.MM.YYYY" />
          </div>
          <p class="demo-value">Selected: {{ basicDate?.toString() ?? 'none' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Required & Error States</h3>
          <p class="example-description">Validation states with required indicator and error message.</p>
          <div class="example-demo example-demo--form">
            <CoarPlainDatePicker label="Birth date" placeholder="DD.MM.YYYY" :required="true" hint="Enter your date of birth" />
            <CoarPlainDatePicker label="Expiry date" placeholder="DD.MM.YYYY" error="Date is in the past" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Disabled & Readonly</h3>
          <p class="example-description">Non-interactive states for locked or display fields.</p>
          <div class="example-demo example-demo--form">
            <CoarPlainDatePicker label="Disabled" placeholder="DD.MM.YYYY" :disabled="true" />
            <CoarPlainDatePicker label="Readonly" placeholder="DD.MM.YYYY" :readonly="true" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Date Range (Manual)</h3>
          <p class="example-description">Two date pickers for range selection. Use <code>:min</code> to constrain the end date.</p>
          <div class="example-demo example-demo--form">
            <CoarPlainDatePicker v-model="rangeStart" label="Start date" placeholder="From" />
            <CoarPlainDatePicker v-model="rangeEnd" label="End date" placeholder="To" :min="rangeStart ?? undefined" />
          </div>
          <p class="demo-value">
            Range: {{ rangeStart?.toString() ?? '?' }} → {{ rangeEnd?.toString() ?? '?' }}
          </p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeRange" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Sizes</h3>
          <p class="example-description">Four size variants matching other form inputs.</p>
          <div class="example-demo sizes-grid">
            <CoarPlainDatePicker size="xs" label="Extra Small" placeholder="DD.MM.YYYY" />
            <CoarPlainDatePicker size="s" label="Small" placeholder="DD.MM.YYYY" />
            <CoarPlainDatePicker size="m" label="Medium" placeholder="DD.MM.YYYY" />
            <CoarPlainDatePicker size="l" label="Large" placeholder="DD.MM.YYYY" />
          </div>
        </CoarCard>
      </div>

      <CoarNote variant="info" style="max-width: 700px">
        <strong>Temporal.PlainDate:</strong> This component uses the TC39 Temporal API (<code>@js-temporal/polyfill</code>).
        PlainDate represents a calendar date without time or timezone — ideal for birthdays, deadlines, and scheduling.
      </CoarNote>

      <details class="api-section" style="margin-top: var(--coar-spacing-l)">
        <summary>Date Picker API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>Temporal.PlainDate | null</code></td><td><code>null</code></td><td>Selected date</td></tr>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>''</code></td><td>Label text</td></tr>
              <tr><td><code>placeholder</code></td><td><code>string</code></td><td><code>''</code></td><td>Placeholder text</td></tr>
              <tr><td><code>min</code></td><td><code>Temporal.PlainDate</code></td><td><code>undefined</code></td><td>Minimum selectable date</td></tr>
              <tr><td><code>max</code></td><td><code>Temporal.PlainDate</code></td><td><code>undefined</code></td><td>Maximum selectable date</td></tr>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Input size</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the picker</td></tr>
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
