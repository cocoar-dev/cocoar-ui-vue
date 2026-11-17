<script setup lang="ts">
/**
 * Compact profile: the agenda Tue–Fri — day headers, today's badge, continuation rows,
 * avatars, zone decorations, default-coloured events. Data: ./compact-calendar-data.ts.
 */
import { ref } from 'vue';
import { CoarAgendaView, Temporal, useAgendaView } from '@cocoar/vue-calendar';
import { displayZone } from './calendar-events';
import { compactEvents } from './compact-calendar-data';

const { builder } = useAgendaView();
builder
  .events(compactEvents)
  .date(ref(Temporal.PlainDate.from('2026-04-14')))
  .timezone(displayZone)
  .locale('en-US')
  .agendaLengthDays(4);
</script>

<template>
  <div class="coar-compact" style="height: 836px">
    <CoarAgendaView :builder="builder" />
  </div>
</template>
