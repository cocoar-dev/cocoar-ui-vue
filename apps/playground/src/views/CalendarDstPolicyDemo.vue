<script setup lang="ts">
/**
 * DstPolicy demo (C4 in action).
 *
 * Drop an event into a DST gap (02:30 on 2026-03-29 in Vienna doesn't
 * exist) and watch how each policy resolves it. The resulting payload's
 * `target.disambiguation` reports the outcome.
 */

import { ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type DstPolicy,
} from '@cocoar/vue-calendar';

const policy = ref<DstPolicy>('compatible');

const events = ref<CalendarEvent[]>([
  {
    id: 'reminder',
    start: Temporal.ZonedDateTime.from('2026-03-28T10:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-03-28T11:00:00[Europe/Vienna]'),
    meta: { title: 'Drag me onto 02:30 on 2026-03-29 (DST gap)' },
  },
]);

const lastDrop = ref<{ disambiguation: string | null; resolved: string } | null>(null);

const { builder } = useCalendar();
builder
  .events(events)
  .timezone('Europe/Vienna')
  .locale('en-US')
  .view('week')
  .firstDayOfWeek(1)
  .date(Temporal.PlainDate.from('2026-03-29'))
  .timeRange({ startMinutes: 0, endMinutes: 24 * 60 })
  .dstPolicy(policy)
  .onEventDrop(({ next, target }) => {
    const start = next.start as Temporal.ZonedDateTime;
    lastDrop.value = {
      disambiguation: target.disambiguation,
      resolved: start.toString(),
    };
    const idx = events.value.findIndex((e) => e.id === 'reminder');
    if (idx >= 0) {
      events.value = [
        { ...events.value[idx], start: next.start, end: next.end },
      ];
    }
  });
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — DstPolicy</h1>
      <p>
        Article 5: spring-forward gaps and fall-back overlaps need an
        explicit policy. Set the policy below, then drag the event onto
        02:30 on 2026-03-29 (a Vienna DST gap). The payload reports
        <code>target.disambiguation</code> and resolves
        <code>next.start</code> per the policy.
      </p>
      <div class="page__policy-toggle">
        <label>dstPolicy:</label>
        <button
          v-for="p in ['compatible', 'reject', 'earlier', 'later'] as DstPolicy[]"
          :key="p"
          :class="{ active: policy === p }"
          @click="policy = p"
        >
          {{ p }}
        </button>
      </div>
      <div v-if="lastDrop" class="page__last-drop">
        <strong>Last drop:</strong>
        disambiguation = <code>{{ lastDrop.disambiguation ?? 'null' }}</code>,
        resolved = <code>{{ lastDrop.resolved }}</code>
      </div>
    </header>
    <div class="page__calendar">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 16px; height: 100%; }
.page__header h1 { margin: 0 0 4px; }
.page__policy-toggle { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.page__policy-toggle button { padding: 4px 10px; border: 1px solid #e5e7eb; background: white; border-radius: 4px; cursor: pointer; font-family: monospace; }
.page__policy-toggle button.active { background: #3b82f6; color: white; border-color: #3b82f6; }
.page__last-drop { margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 4px; font-family: monospace; font-size: 12px; }
.page__calendar { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; min-height: 500px; }
</style>
