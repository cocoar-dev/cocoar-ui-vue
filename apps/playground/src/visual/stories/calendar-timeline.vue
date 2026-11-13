<script setup lang="ts">
/**
 * The timeline (`<CoarTimelineView>`): one row per event, bars on a day axis, today marked.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarTimelineView, useTimelineView, Temporal } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone } from './calendar-events';

const { builder } = useTimelineView();
builder
  .events(calendarEvents)
  // From Monday: today is the third column, not the first.
  .date(ref(Temporal.PlainDate.from('2026-04-13')))
  .timezone(displayZone)
  .locale('en-US');
</script>

<template>
  <!-- 836px: the most a 900px viewport leaves without the page scrolling. -->
  <div style="height: 836px">
    <CoarTimelineView :builder="builder" />
  </div>
</template>
