<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';

// The clock is fixed to 2026-03-10 (stories.json): "today" is in the visible month.
const value = ref(Temporal.PlainDateTime.from('2026-03-14T10:30'));
const min = Temporal.PlainDateTime.from('2026-03-04T00:00');
const dateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Open: selected day and time, today, days before min disabled</h2>
    <div style="width: 280px" data-visual-open>
      <CoarPlainDateTimePicker
        v-model="value"
        :min="min"
        :date-format="dateFormat"
        locale="en-US"
        :use24-hour="true"
      />
    </div>
  </section>
</template>
