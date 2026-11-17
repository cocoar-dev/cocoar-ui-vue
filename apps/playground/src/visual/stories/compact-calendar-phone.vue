<script setup lang="ts">
/**
 * Compact profile on a phone (mobile mode only): the shell's header wrapping at its own
 * width (navigation, title, view switcher, day display switcher) over the day.
 * Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarCalendar, useCalendar } from '@cocoar/vue-calendar';
import { displayZone, today } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

const { builder } = useCalendar();
builder
  .events(compactEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .view('day')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  .pixelsPerHour(54);
</script>

<template>
  <div class="coar-compact" style="height: 780px">
    <CoarCalendar :builder="builder" />
  </div>
</template>
