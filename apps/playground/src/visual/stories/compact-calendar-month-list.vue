<script setup lang="ts">
/**
 * Compact profile: the month list — title, weekday captions, day buttons with markers,
 * today unselected, the selected day's agenda rows. Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarMonthListView, Temporal, useCalendar } from '@cocoar/vue-calendar';
import { displayZone } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

const { builder } = useCalendar();
builder
  .events(compactEvents)
  // Thursday: the point event, the avatars and the cross-zone meeting in the list.
  .date(ref(Temporal.PlainDate.from('2026-04-16')))
  .timezone(displayZone)
  .locale('en-US')
  .view('monthList');
</script>

<template>
  <div class="coar-compact" style="height: 836px">
    <CoarMonthListView :builder="builder" />
  </div>
</template>
