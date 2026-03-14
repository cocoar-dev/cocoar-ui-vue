<script setup lang="ts">
import { ref } from 'vue';
import { CoarZonedDateTimePicker, CoarCard, CoarNote, CoarCodeBlock } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const zonedValue = ref<Temporal.ZonedDateTime | null>(null);

const codeBasic = `<CoarZonedDateTimePicker
  v-model="value"
  label="Meeting Time"
  placeholder="DD.MM.YYYY HH:mm"
  timezone="Europe/Berlin"
/>`;

const codeUTC = `// Get UTC instant from ZonedDateTime
const utcInstant = value.value?.toInstant().toString();
// → "2024-03-15T14:30:00Z"

// Get ISO string with offset
const isoString = value.value?.toString();
// → "2024-03-15T15:30:00+01:00[Europe/Berlin]"`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Zoned DateTime Picker</h1>
      <p class="page-description">
        A strongly-typed datetime picker that returns <code>Temporal.ZonedDateTime</code> with full timezone support.
        Captures user intent (local time + timezone) and can derive UTC instants.
      </p>
      <CoarNote variant="info" style="margin-top: var(--coar-spacing-m); max-width: 700px">
        <strong>Store Intent, Derive Math:</strong> Store the user's intended local time and timezone.
        Derive the UTC instant when needed — it can be recalculated if DST rules change in the future.
      </CoarNote>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Pick a date and time with an explicit timezone.</p>
          <div class="example-demo example-demo--form">
            <CoarZonedDateTimePicker
              v-model="zonedValue"
              label="Meeting Time"
              placeholder="DD.MM.YYYY HH:mm"
            />
          </div>
          <p class="demo-value">
            ZonedDateTime: {{ zonedValue?.toString() ?? 'none' }}
          </p>
          <p class="demo-value" v-if="zonedValue">
            UTC Instant: {{ zonedValue.toInstant().toString() }}
          </p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Working with UTC</h3>
          <p class="example-description">Convert the selected ZonedDateTime to a UTC instant for storage.</p>
          <CoarCodeBlock :code="codeUTC" language="typescript" :show-line-numbers="false" variant="info" :collapsible="false" />
        </CoarCard>

        <CoarCard elevated>
          <h3>States</h3>
          <p class="example-description">Required, error, disabled, and readonly states.</p>
          <div class="example-demo example-demo--form">
            <CoarZonedDateTimePicker label="Required" placeholder="DD.MM.YYYY HH:mm" :required="true" />
            <CoarZonedDateTimePicker label="With Error" placeholder="DD.MM.YYYY HH:mm" error="Invalid date/time" />
            <CoarZonedDateTimePicker label="Disabled" placeholder="DD.MM.YYYY HH:mm" :disabled="true" />
            <CoarZonedDateTimePicker label="Readonly" placeholder="DD.MM.YYYY HH:mm" :readonly="true" />
          </div>
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Sizes</h3>
          <p class="example-description">Four size variants matching other form inputs.</p>
          <div class="example-demo sizes-grid">
            <CoarZonedDateTimePicker size="xs" label="Extra Small" placeholder="DD.MM.YYYY HH:mm" />
            <CoarZonedDateTimePicker size="s" label="Small" placeholder="DD.MM.YYYY HH:mm" />
            <CoarZonedDateTimePicker size="m" label="Medium" placeholder="DD.MM.YYYY HH:mm" />
            <CoarZonedDateTimePicker size="l" label="Large" placeholder="DD.MM.YYYY HH:mm" />
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Zoned DateTime Picker API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>Temporal.ZonedDateTime | null</code></td><td><code>null</code></td><td>Selected zoned datetime</td></tr>
              <tr><td><code>timezone</code></td><td><code>string</code></td><td><code>user's timezone</code></td><td>IANA timezone ID (e.g. 'Europe/Berlin')</td></tr>
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
.sizes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--coar-spacing-m);
}
</style>
