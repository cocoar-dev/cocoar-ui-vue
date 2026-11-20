<template>
  <div style="display: grid; gap: 12px; max-width: 520px;">
    <p style="margin: 0; line-height: 2.4;">
      The call starts
      <CoarZonedDateTimePicker v-model="call" appearance="inline" width="content" />
      for everyone.
    </p>
    <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center;">
      <span>Starts</span>
      <CoarZonedDateTimePicker v-model="starts" appearance="inline" />
    </div>
    <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center;">
      <span>Ends</span>
      <CoarZonedDateTimePicker v-model="ends" appearance="inline" placeholder="not set" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';

const starts = ref<Temporal.ZonedDateTime | null>(Temporal.ZonedDateTime.from('2026-12-01T09:30[Europe/Vienna]'));
const call = ref<Temporal.ZonedDateTime | null>(Temporal.ZonedDateTime.from('2026-12-01T16:00[America/Argentina/Buenos_Aires]'));
const ends = ref<Temporal.ZonedDateTime | null>(null);
</script>
