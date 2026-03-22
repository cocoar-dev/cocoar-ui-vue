<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Start date">
      <CoarPlainDatePicker v-model="start" placeholder="From" />
    </CoarFormField>
    <CoarFormField label="End date">
      <CoarPlainDatePicker v-model="end" placeholder="To" :min="start ?? undefined" />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">
      Range: {{ start?.toString() ?? '?' }} &rarr; {{ end?.toString() ?? '?' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const start = ref<Temporal.PlainDate | null>(null);
const end = ref<Temporal.PlainDate | null>(null);
</script>
