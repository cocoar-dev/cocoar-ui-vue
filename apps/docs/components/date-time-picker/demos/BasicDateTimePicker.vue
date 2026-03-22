<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarPlainDateTimePicker
      v-model="dateTime"
      label="Appointment"
      placeholder="DD.MM.YYYY HH:mm"
    />
    <span style="font-size: 13px; color: #64748b;">Selected: {{ dateTime?.toString() ?? 'none' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const dateTime = ref<Temporal.PlainDateTime | null>(null);
</script>
