<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDateTimePicker, CoarCard, CoarNote, CoarCodeBlock } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const dateTime = ref<Temporal.PlainDateTime | null>(null);

const codeBasic = `<CoarPlainDateTimePicker
  v-model="dateTime"
  label="Date & Time"
  placeholder="DD.MM.YYYY HH:mm"
/>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">DateTime Picker</h1>
      <p class="page-description">
        A strongly-typed datetime picker that returns <code>Temporal.PlainDateTime</code> — a date+time without timezone.
        For timezone-aware values, use <code>CoarZonedDateTimePicker</code>.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">A datetime picker with combined date and time input.</p>
          <div class="example-demo example-demo--form">
            <CoarPlainDateTimePicker v-model="dateTime" label="Appointment" placeholder="DD.MM.YYYY HH:mm" />
          </div>
          <p class="demo-value">Selected: {{ dateTime?.toString() ?? 'none' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>States</h3>
          <p class="example-description">Required, error, disabled, and readonly states.</p>
          <div class="example-demo example-demo--form">
            <CoarPlainDateTimePicker label="Required" placeholder="DD.MM.YYYY HH:mm" :required="true" />
            <CoarPlainDateTimePicker label="With Error" placeholder="DD.MM.YYYY HH:mm" error="Invalid date/time" />
            <CoarPlainDateTimePicker label="Disabled" placeholder="DD.MM.YYYY HH:mm" :disabled="true" />
            <CoarPlainDateTimePicker label="Readonly" placeholder="DD.MM.YYYY HH:mm" :readonly="true" />
          </div>
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Sizes</h3>
          <p class="example-description">Four size variants matching other form inputs.</p>
          <div class="example-demo sizes-grid">
            <CoarPlainDateTimePicker size="xs" label="Extra Small" placeholder="DD.MM.YYYY HH:mm" />
            <CoarPlainDateTimePicker size="s" label="Small" placeholder="DD.MM.YYYY HH:mm" />
            <CoarPlainDateTimePicker size="m" label="Medium" placeholder="DD.MM.YYYY HH:mm" />
            <CoarPlainDateTimePicker size="l" label="Large" placeholder="DD.MM.YYYY HH:mm" />
          </div>
        </CoarCard>
      </div>

      <CoarNote variant="info" style="max-width: 700px">
        <strong>When to use PlainDateTime vs ZonedDateTime:</strong>
        Use <code>PlainDateTime</code> when the timezone is implicit (e.g. the user's local time is always assumed) or irrelevant (e.g. an alarm time).
        Use <code>ZonedDateTime</code> when you need to store or share a specific instant in time that can be derived to UTC.
      </CoarNote>

      <details class="api-section" style="margin-top: var(--coar-spacing-l)">
        <summary>DateTime Picker API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>Temporal.PlainDateTime | null</code></td><td><code>null</code></td><td>Selected date+time</td></tr>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>''</code></td><td>Label text</td></tr>
              <tr><td><code>placeholder</code></td><td><code>string</code></td><td><code>''</code></td><td>Placeholder text</td></tr>
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--coar-spacing-m);
}
</style>
