<script setup lang="ts">
/**
 * The work week (`<CoarWorkWeekView>`, Mon–Fri) without the shell: time axis, all-day band, now-line, overlapping meetings.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarWorkWeekView, useWorkWeekView, Temporal } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone } from './calendar-events';

const { builder } = useWorkWeekView();
builder
  .events(calendarEvents)
  // The cursor on Friday: today (Wednesday) is not the active day.
  .date(ref(Temporal.PlainDate.from('2026-04-17')))
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
    <CoarWorkWeekView :builder="builder" />
  </div>
</template>
