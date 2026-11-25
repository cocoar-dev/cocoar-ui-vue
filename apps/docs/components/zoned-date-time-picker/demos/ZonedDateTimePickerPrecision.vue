<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;">
    <CoarSegmentedControl v-model="precision" :options="options" size="s" aria-label="Precision" />
    <CoarFormField label="Measured at">
      <CoarZonedDateTimePicker v-model="value" :precision="precision" />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">
      ZonedDateTime: {{ value?.toString() ?? 'none' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFormField, CoarSegmentedControl, CoarZonedDateTimePicker, type CoarTimePrecision } from '@cocoar/vue-ui';
import { Temporal } from '@js-temporal/polyfill';

const precision = ref<CoarTimePrecision>('minute');
const options = [
  { value: 'minute', label: 'minute' },
  { value: 'second', label: 'second' },
  { value: 'millisecond', label: 'millisecond' },
];
const value = ref<Temporal.ZonedDateTime | null>(
  Temporal.ZonedDateTime.from('2026-07-01T15:46:56.123+02:00[Europe/Berlin]'),
);
</script>
