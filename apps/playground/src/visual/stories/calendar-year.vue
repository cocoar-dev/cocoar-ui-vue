<script setup lang="ts">
/**
 * The year (`<CoarYearView>`): twelve small months with today marked.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarYearView, useCalendar } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone, today } from './calendar-events';

const { builder } = useCalendar();
builder.events(calendarEvents).date(ref(today)).timezone(displayZone).locale('en-US').view('year');
</script>

<template>
  <!-- 1016px: all twelve months; the most a 1080px viewport leaves without the page scrolling. -->
  <div style="height: 1016px">
    <CoarYearView :builder="builder" />
  </div>
</template>
