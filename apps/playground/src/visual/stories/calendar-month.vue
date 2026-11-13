<script setup lang="ts">
/**
 * The fixed 6×7 month grid (`<CoarMonthView>`, Details): today's number and background, the selected day, weekends, days of March and May, all-day bars across a week row, the offsite as a timed bar with its inset, and "+N" on Tue Apr 14.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarMonthView, useMonthView } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone, selectedDay, today } from './calendar-events';

const { builder } = useMonthView();
builder
  .events(calendarEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .selectedDate(selectedDay);
</script>

<template>
  <!-- 836px: the most a 900px viewport leaves without the page scrolling. -->
  <div style="height: 836px">
    <CoarMonthView :builder="builder" />
  </div>
</template>
