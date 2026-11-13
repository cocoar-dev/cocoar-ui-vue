<script setup lang="ts">
/**
 * The continuously scrolling month of the shell (`<CoarContinuousMonthView>`, Details): month sections with blank leading and trailing days instead of neighbour dates.
 * Events, today and the display zone: ./calendar-events.ts.
 */
import { ref } from 'vue';
import { CoarContinuousMonthView, useMonthView } from '@cocoar/vue-calendar';
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
    <CoarContinuousMonthView :builder="builder" />
  </div>
</template>
