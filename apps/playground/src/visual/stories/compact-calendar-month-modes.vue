<script setup lang="ts">
/**
 * Compact profile: the two dense month displays one above the other — `compact`
 * (colour capsules) and `stacked` (thin bars). Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarMonthView, useMonthView } from '@cocoar/vue-calendar';
import { displayZone, selectedDay, today } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

function month(density: 'compact' | 'stacked') {
  const { builder } = useMonthView();
  builder
    .events(compactEvents)
    .date(ref(today))
    .timezone(displayZone)
    .locale('en-US')
    .monthDensity(density)
    .selectedDate(selectedDay);
  return builder;
}
const compact = month('compact');
const stacked = month('stacked');
</script>

<template>
  <div class="coar-compact" style="display: grid; grid-template-rows: 1fr 1fr; gap: 8px; height: 836px">
    <div style="min-height: 0; overflow: hidden"><CoarMonthView :builder="compact" /></div>
    <div style="min-height: 0; overflow: hidden"><CoarMonthView :builder="stacked" /></div>
  </div>
</template>
