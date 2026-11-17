<script setup lang="ts">
/**
 * Compact profile (`.coar-compact`): the shell (header, navigation, view switcher) on the week,
 * with all-day lanes capped at two ("+N" overflow), today's overlapping meetings and the
 * now-line, a point event, assignee avatars, a cross-zone and a global event, and the
 * working-day bands. Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarCalendar, useCalendar } from '@cocoar/vue-calendar';
import { displayZone, today } from './calendar-events';
import { compactBands, compactEvents } from './compact-calendar-data';

const { builder } = useCalendar();
builder
  .events(compactEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .view('week')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  .pixelsPerHour(54)
  .allDayMaxVisibleLanes(2)
  .backgrounds(compactBands);
</script>

<template>
  <div class="coar-compact" style="height: 836px">
    <CoarCalendar :builder="builder" />
  </div>
</template>
