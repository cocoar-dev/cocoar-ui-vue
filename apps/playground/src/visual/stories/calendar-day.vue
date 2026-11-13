<script setup lang="ts">
/**
 * Today alone (`<CoarDayView>`): wide cards with location and time rows, the all-day band, the now-line.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarDayView, useDayView } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone, today } from './calendar-events';

const { builder } = useDayView();
builder
  .events(calendarEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  // 12 hours and two all-day lanes fit the box without scrolling.
  .pixelsPerHour(54);
</script>

<template>
  <!-- 836px: the most a 900px viewport leaves without the page scrolling. A
       standalone time grid is content for its host's scroller, as in an app. -->
  <div style="height: 836px; overflow-y: auto">
    <CoarDayView :builder="builder" />
  </div>
</template>
