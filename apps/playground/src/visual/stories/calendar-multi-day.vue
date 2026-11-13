<script setup lang="ts">
/**
 * Day in multi-day mode (`dayMode('multiDay')`, as many complete columns as the width allows) from Tuesday: today is a column beside the active day, not the active day.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarDayView, Temporal, useDayView } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone } from './calendar-events';

const { builder } = useDayView();
builder
  .events(calendarEvents)
  .timezone(displayZone)
  .locale('en-US')
  .dayMode('multiDay')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  // 12 hours and two all-day lanes fit the box without scrolling.
  .pixelsPerHour(54)
  // The active day is Tuesday; today (Wednesday) is the next column.
  .date(ref(Temporal.PlainDate.from('2026-04-14')));
</script>

<template>
  <!-- 836px: the most a 900px viewport leaves without the page scrolling. A
       standalone time grid is content for its host's scroller, as in an app. -->
  <div style="height: 836px; overflow-y: auto">
    <CoarDayView :builder="builder" />
  </div>
</template>
