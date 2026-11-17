<script setup lang="ts">
/**
 * Compact profile: the day agenda with its week strip — today unselected, Thursday
 * selected. Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarAgendaView, Temporal, useCalendar } from '@cocoar/vue-calendar';
import { displayZone } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

const { builder } = useCalendar();
builder
  .events(compactEvents)
  .timezone(displayZone)
  .locale('en-US')
  .view('dayAgenda')
  .date(ref(Temporal.PlainDate.from('2026-04-16')));
</script>

<template>
  <div class="coar-compact" style="height: 836px">
    <CoarAgendaView :builder="builder" view="dayAgenda" />
  </div>
</template>
