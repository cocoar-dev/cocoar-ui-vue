<script setup lang="ts">
/**
 * The agenda (`<CoarAgendaView>`) from Tuesday Apr 14 to Thursday: day headers with today's chip, all-day and timed rows.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarAgendaView, useAgendaView, Temporal } from '@cocoar/vue-calendar';
import { calendarEvents, displayZone } from './calendar-events';

const { builder } = useAgendaView();
builder
  .events(calendarEvents)
  // From Tuesday: today is the second day of the list, not its first.
  .date(ref(Temporal.PlainDate.from('2026-04-14')))
  .timezone(displayZone)
  .locale('en-US')
  // Tue–Thu: the list ends inside the picture.
  .agendaLengthDays(3);
</script>

<template>
  <!-- 836px: the most a 900px viewport leaves without the page scrolling. -->
  <div style="height: 836px">
    <CoarAgendaView :builder="builder" />
  </div>
</template>
