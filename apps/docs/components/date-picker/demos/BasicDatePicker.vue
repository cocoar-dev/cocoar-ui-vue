<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Select date">
      <CoarPlainDatePicker
        v-model="date"
        placeholder="DD.MM.YYYY"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Selected: {{ date?.toString() ?? 'none' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
import type { Temporal } from '@js-temporal/polyfill';

const date = ref<Temporal.PlainDate | null>(null);
</script>
