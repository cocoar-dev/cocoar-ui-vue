<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;">
    <CoarZonedDateTimePicker
      v-model="value"
      label="Meeting Time"
      placeholder="DD.MM.YYYY HH:mm"
    />
    <span style="font-size: 13px; color: #64748b;">
      ZonedDateTime: {{ value?.toString() ?? 'none' }}
    </span>
    <span v-if="value" style="font-size: 13px; color: #64748b;">
      UTC Instant: {{ value.toInstant().toString() }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const value = ref<Temporal.ZonedDateTime | null>(null);
</script>
