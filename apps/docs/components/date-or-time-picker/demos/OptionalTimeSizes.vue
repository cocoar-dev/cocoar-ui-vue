<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 460px;">
    <div v-for="s in sizes" :key="s" style="display: flex; align-items: center; gap: 12px;">
      <code style="width: 24px; font-size: 12px; color: #64748b;">{{ s }}</code>
      <CoarZonedDateTimeOrDatePicker v-model="value" v-model:with-time="withTime" :size="s" />
    </div>
    <span style="font-size: 13px; color: #64748b;">Toggle position: <code>start</code> (default) — use <code>toggle-position="end"</code> to put the clock on the right.</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarZonedDateTimeOrDatePicker, type CoarZonedDateTimeOrDatePickerSize } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const sizes: CoarZonedDateTimeOrDatePickerSize[] = ['xs', 's', 'm', 'l'];
const value = ref<Temporal.ZonedDateTime | Temporal.PlainDate | null>(null);
const withTime = ref(false);
</script>
