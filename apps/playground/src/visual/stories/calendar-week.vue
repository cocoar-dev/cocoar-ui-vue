<script setup lang="ts">
/**
 * The shell with its header (title, navigation, view switcher) on the week: the time axis 07:00–19:00 with its labels, the all-day band, today's column with the now-line at 10:30 and three overlapping meetings, a vacation running into the next week.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarCalendar, useCalendar } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone, today } from './calendar-events';

const { builder } = useCalendar();
builder
  .events(calendarEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .view('week')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  // 12 hours and two all-day lanes fit under the header without the grid scrolling.
  .pixelsPerHour(54);
</script>

<template>
  <!-- 836px: the most a 900px viewport leaves without the page scrolling. -->
  <div style="height: 836px">
    <CoarCalendar :builder="builder" />
  </div>
</template>
