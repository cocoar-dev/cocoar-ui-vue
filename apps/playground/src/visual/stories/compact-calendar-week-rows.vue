<script setup lang="ts">
/**
 * Compact profile: the week as rows (horizontal time grid) — hour header, day labels,
 * all-day chips, events with times, the point event, bands, the draft and its markers.
 * Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarWeekView, useWeekView } from '@cocoar/vue-calendar';
import { displayZone, today } from './calendar-events';
import { compactBands, compactDraft, compactEvents } from './compact-calendar-data';

const { builder } = useWeekView();
builder
  .events(compactEvents)
  .date(ref(today))
  .timezone(displayZone)
  .locale('en-US')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  .timeGridOrientation('horizontal')
  .backgrounds(compactBands)
  .draft(ref(compactDraft));
</script>

<template>
  <div class="coar-compact" style="height: 836px">
    <CoarWeekView :builder="builder" />
  </div>
</template>
