<script setup lang="ts">
/**
 * Compact profile: a standalone day with `density('compact')` (dense header, cards and bars),
 * the working-day bands, a host draft today 14:00–15:00 with its axis markers, the now-line.
 * Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarDayView, useDayView } from '@cocoar/vue-calendar';
import { displayZone, today } from './calendar-events';
import { compactBands, compactDraft, compactEvents } from './compact-calendar-data';

const { builder } = useDayView();
builder
  .events(compactEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .density('compact')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  .pixelsPerHour(54)
  .backgrounds(compactBands)
  .draft(ref(compactDraft));
</script>

<template>
  <div class="coar-compact" style="height: 836px; overflow-y: auto">
    <CoarDayView :builder="builder" />
  </div>
</template>
