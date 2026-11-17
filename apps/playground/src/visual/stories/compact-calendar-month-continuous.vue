<script setup lang="ts">
/**
 * Compact profile: the continuous month with its section title, the today marker,
 * the selected day and shaded weekends. Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarContinuousMonthView, useMonthView } from '@cocoar/vue-calendar';
import { displayZone, selectedDay, today } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

const { builder } = useMonthView();
builder
  .events(compactEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .shadeWeekends(true)
  .selectedDate(selectedDay);
</script>

<template>
  <div class="coar-compact" style="height: 836px">
    <CoarContinuousMonthView :builder="builder" />
  </div>
</template>
