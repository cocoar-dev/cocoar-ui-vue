<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';

// The clock is fixed to 2026-03-10 (stories.json): "today" is in the visible month.
const value = ref(Temporal.ZonedDateTime.from('2026-03-14T10:30:00+01:00[Europe/Vienna]'));
const min = Temporal.ZonedDateTime.from('2026-03-04T00:00:00+01:00[Europe/Vienna]');
const dateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">
      Open: Europe/Vienna, selected day and time, today, days before min disabled
    </h2>
    <div style="width: 280px" data-visual-open>
      <CoarZonedDateTimePicker
        v-model="value"
        :min="min"
        :date-format="dateFormat"
        locale="en-US"
        time-zone="Europe/Vienna"
        :use24-hour="true"
      />
    </div>
  </section>
</template>
