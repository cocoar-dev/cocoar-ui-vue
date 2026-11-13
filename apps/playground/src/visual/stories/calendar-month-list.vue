<script setup lang="ts">
/**
 * The Month List (`<CoarMonthListView>`): the small month selector (today unselected, Apr 22 selected) beside the selected day's events, side by side as from 720px.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarMonthListView, useCalendar } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone, selectedDay } from './calendar-events';

const { builder } = useCalendar();
builder
  .events(calendarEvents)
  // The selected day is the cursor: Apr 22, so today (Apr 15) shows unselected.
  .date(ref(selectedDay))
  .timezone(displayZone)
  .locale('en-US')
  .view('monthList');
</script>

<template>
  <!-- 836px: the most a 900px viewport leaves without the page scrolling. -->
  <div style="height: 836px">
    <CoarMonthListView :builder="builder" />
  </div>
</template>
