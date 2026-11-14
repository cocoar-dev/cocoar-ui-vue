<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDatePicker } from '@cocoar/vue-ui';

// The clock is fixed to 2026-03-10 (stories.json): "today" is in the visible month.
const value = ref(Temporal.PlainDate.from('2026-03-14'));
const min = Temporal.PlainDate.from('2026-03-04');
const dateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Open: selected day, today, days before min disabled</h2>
    <div style="width: 280px" data-visual-open>
      <CoarPlainDatePicker v-model="value" :min="min" :date-format="dateFormat" locale="en-US" />
    </div>
  </section>
</template>
