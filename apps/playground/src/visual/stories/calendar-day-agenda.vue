<script setup lang="ts">
/**
 * The day agenda (`<CoarAgendaView view="dayAgenda">`, as the shell renders it): the week strip with today (Wed) unselected and Thursday selected, and Thursday's events.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarAgendaView, Temporal, useCalendar } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone } from './calendar-events';

const { builder } = useCalendar();
builder
  .events(calendarEvents)
  .timezone(displayZone)
  .locale('en-US')
  .view('dayAgenda')
  // Thursday selected: today (Wednesday) shows unselected in the strip.
  .date(ref(Temporal.PlainDate.from('2026-04-16')));
</script>

<template>
  <!-- 836px: the most a 900px viewport leaves without the page scrolling. -->
  <div style="height: 836px">
    <CoarAgendaView :builder="builder" view="dayAgenda" />
  </div>
</template>
