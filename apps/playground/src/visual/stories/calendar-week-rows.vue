<script setup lang="ts">
/**
 * The week with days as rows (`timeGridOrientation('horizontal')`): one horizontal time axis, the sticky day column with all-day chips.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarWeekView, useWeekView } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone, today } from './calendar-events';

const { builder } = useWeekView();
builder
  .events(calendarEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  .timeGridOrientation('horizontal');
</script>

<template>
  <!-- 836px: the most a 900px viewport leaves without the page scrolling. -->
  <div style="height: 836px">
    <CoarWeekView :builder="builder" />
  </div>
</template>
