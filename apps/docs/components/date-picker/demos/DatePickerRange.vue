<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarPlainDatePicker v-model="start" label="Start date" placeholder="From" />
    <CoarPlainDatePicker v-model="end" label="End date" placeholder="To" :min="start ?? undefined" />
    <span style="font-size: 13px; color: #64748b;">
      Range: {{ start?.toString() ?? '?' }} &rarr; {{ end?.toString() ?? '?' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const start = ref<Temporal.PlainDate | null>(null);
const end = ref<Temporal.PlainDate | null>(null);
</script>
