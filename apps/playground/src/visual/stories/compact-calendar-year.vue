<script setup lang="ts">
/**
 * Compact profile: the year — month titles, weekday captions, day numbers, today.
 * Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarYearView, useCalendar } from '@cocoar/vue-calendar';
import { displayZone, today } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

const { builder } = useCalendar();
builder.events(compactEvents).date(ref(today)).timezone(displayZone).locale('en-US').view('year');
</script>

<template>
  <div class="coar-compact" style="height: 1016px">
    <CoarYearView :builder="builder" />
  </div>
</template>
