<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 420px;">
    <CoarFormField label="Due">
      <CoarZonedDateTimeOrDatePicker v-model="value" v-model:with-time="withTime" clearable />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">
      {{ withTime ? 'with time' : 'date only' }} →
      <code>{{ value ? `${value.constructor.name}: ${value.toString()}` : 'null' }}</code>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarZonedDateTimeOrDatePicker, CoarFormField } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

// One value, two shapes: a PlainDate while the clock is off, a ZonedDateTime when on.
const value = ref<Temporal.ZonedDateTime | Temporal.PlainDate | null>(null);
const withTime = ref(false);
</script>
