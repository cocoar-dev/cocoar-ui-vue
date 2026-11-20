<template>
  <div style="display: grid; gap: 4px; max-width: 480px;">
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
const ends = ref<Temporal.ZonedDateTime | null>(null);
</script>
