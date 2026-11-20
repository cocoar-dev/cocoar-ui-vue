<script setup lang="ts">
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarMultiSelect,
  CoarNumberInput,
  CoarPasswordInput,
  CoarPlainDatePicker,
  CoarPlainDateTimePicker,
  CoarSelect,
  CoarTagSelect,
  CoarTextInput,
} from '@cocoar/vue-ui';

// appearance="inline" (no border or surface at rest) and width="content" (as wide as
// the value) of the input family. The focus images show the fill while editing.
const options = [
  { value: 'vie', label: 'Vienna' },
  { value: 'ber', label: 'Berlin' },
];
const date = Temporal.PlainDate.from('2026-12-01');
const dateTime = Temporal.PlainDateTime.from('2026-12-01T09:30');
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">In a sentence: content width</h2>
    <div class="vs-row">
      <span>The</span>
      <CoarTextInput appearance="inline" width="content" model-value="Cocoar Desk Lamp" />
      <span>costs</span>
      <CoarNumberInput appearance="inline" width="content" :model-value="49.9" :decimals="2" suffix="EUR" />
      <span>in</span>
      <CoarSelect appearance="inline" width="content" :options="options" model-value="vie" />
      <span>from</span>
      <CoarPlainDatePicker appearance="inline" width="content" :model-value="date" />
    </div>
    <div class="vs-row">
      <span>Empty:</span>
      <CoarTextInput appearance="inline" width="content" placeholder="name" />
      <CoarNumberInput appearance="inline" width="content" placeholder="0" stepper-buttons="both" />
      <CoarSelect appearance="inline" width="content" :options="options" :model-value="null" placeholder="city" />
      <CoarPlainDateTimePicker appearance="inline" width="content" :model-value="dateTime" />
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Full width: value, error, disabled, readonly</h2>
    <div class="vs-grid">
      <span class="vs-label">value</span>
      <CoarTextInput appearance="inline" model-value="Desk lamp" clearable />
      <CoarPasswordInput appearance="inline" model-value="secret" />
      <CoarPlainDatePicker appearance="inline" :model-value="date" />

      <span class="vs-label">error</span>
      <CoarTextInput appearance="inline" model-value="LAMP 01" error />
      <CoarNumberInput appearance="inline" :model-value="-1" error />
      <CoarSelect appearance="inline" :options="options" :model-value="null" placeholder="Choose a city" error />

      <span class="vs-label">disabled</span>
      <CoarTextInput appearance="inline" model-value="Desk lamp" disabled />
      <CoarNumberInput appearance="inline" :model-value="12" disabled />
      <CoarSelect appearance="inline" :options="options" model-value="vie" disabled />

      <span class="vs-label">readonly</span>
      <CoarTextInput appearance="inline" model-value="Desk lamp" readonly />
      <CoarNumberInput appearance="inline" :model-value="12" readonly />
      <CoarPlainDatePicker appearance="inline" :model-value="date" readonly />

      <span class="vs-label">multi</span>
      <CoarTextInput appearance="inline" :rows="2" model-value="Dimmable LED lamp with a warm white setting." />
      <CoarMultiSelect appearance="inline" :options="options" :model-value="['vie', 'ber']" />
      <CoarTagSelect appearance="inline" :options="options" :model-value="['vie']" />
    </div>
  </section>
</template>
