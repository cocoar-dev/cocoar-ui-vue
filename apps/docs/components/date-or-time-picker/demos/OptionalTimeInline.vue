<template>
  <div style="display: grid; gap: 4px; max-width: 480px;">
    <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center;">
      <span>Due</span>
      <CoarZonedDateTimeOrDatePicker v-model="due" v-model:with-time="withTime" appearance="inline" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimeOrDatePicker } from '@cocoar/vue-ui';

const due = ref<Temporal.ZonedDateTime | Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-12-01'));
const withTime = ref(false);
</script>
