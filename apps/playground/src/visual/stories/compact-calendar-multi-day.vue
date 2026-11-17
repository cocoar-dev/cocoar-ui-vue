<script setup lang="ts">
/**
 * Compact profile: the multi-day display around Thursday — the point event, the
 * assignee avatars (two and "+2"), the cross-zone meeting with its globe and dot,
 * default-coloured events. Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarDayView, Temporal, useDayView } from '@cocoar/vue-calendar';
import { displayZone } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

const { builder } = useDayView();
builder
  .events(compactEvents)
  .timezone(displayZone)
  .locale('en-US')
  .dayMode('multiDay')
  .timeRange({ startMinutes: 7 * 60, endMinutes: 19 * 60 })
  .pixelsPerHour(54)
  .date(ref(Temporal.PlainDate.from('2026-04-16')));
</script>

<template>
  <div class="coar-compact" style="height: 836px; overflow-y: auto">
    <CoarDayView :builder="builder" />
  </div>
</template>
