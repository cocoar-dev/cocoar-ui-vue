<script setup lang="ts">
/**
 * Compact profile: the timeline — corner, date axis with today and weekends, label
 * column with counts, bars. Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarTimelineView, Temporal, useTimelineView } from '@cocoar/vue-calendar';
import { displayZone } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

const { builder } = useTimelineView();
builder
  .events(compactEvents)
  .date(ref(Temporal.PlainDate.from('2026-04-13')))
  .timezone(displayZone)
  .locale('en-US');
</script>

<template>
  <div class="coar-compact" style="height: 836px">
    <CoarTimelineView :builder="builder" />
  </div>
</template>
