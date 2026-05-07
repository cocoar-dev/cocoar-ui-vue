<script setup lang="ts">
/**
 * Wire-helpers demo (D3 + Article 8 in action).
 *
 * Backend ↔ frontend roundtrip via parseScheduledTime /
 * formatScheduledTime. Backend speaks the {local, timeZoneId} JSON
 * shape from Article 8; frontend never has to construct Temporal
 * directly.
 */

import { ref, computed } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  parseScheduledTime,
  formatScheduledTime,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

// Simulated backend payload — exactly what your API would return:
// structured local + timeZoneId, NO offsets, NO UTC instants
// (those are derived per Article 4).
const wirePayload = ref([
  {
    id: 'standup',
    title: 'Daily Standup',
    start: { local: '2026-06-15T09:00:00', timeZoneId: 'Europe/Vienna' },
    end: { local: '2026-06-15T09:30:00', timeZoneId: 'Europe/Vienna' },
  },
  {
    id: 'lunch',
    title: 'Lunch w/ Anna',
    start: { local: '2026-06-15T12:00:00', timeZoneId: 'Europe/Vienna' },
    end: { local: '2026-06-15T13:00:00', timeZoneId: 'Europe/Vienna' },
  },
]);

// Frontend deserialises wire → Temporal via parseScheduledTime.
// Each event keeps its source zone (C3); zone is part of the wire
// shape, not derived from the page's display zone.
const events = computed<CalendarEvent[]>(() =>
  wirePayload.value.map((row) => ({
    id: row.id,
    start: parseScheduledTime(row.start),
    end: parseScheduledTime(row.end),
    meta: { title: row.title },
  })),
);

const lastSerialized = ref<string>('(drag an event to see the wire shape)');

const { builder } = useCalendar();
builder
  .events(events)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .view('day')
  .date(Temporal.PlainDate.from('2026-06-15'))
  .onEventDrop(({ event, next }) => {
    // formatScheduledTime is the C3-correct way to ship the new
    // values back to a backend that expects the {local, timeZoneId}
    // wire shape. Audit Session 5 #F12 — distinguish all-day vs
    // timed via `kind`, not a magic '(all-day)' sentinel.
    const wireFor = (v: Temporal.ZonedDateTime | Temporal.PlainDate | undefined) => {
      if (!v) return null;
      if ('timeZoneId' in (v as object)) {
        return { kind: 'zoned' as const, ...formatScheduledTime(v as Temporal.ZonedDateTime) };
      }
      return { kind: 'plainDate' as const, local: (v as Temporal.PlainDate).toString() };
    };
    lastSerialized.value = JSON.stringify(
      { id: event.id, start: wireFor(next.start), end: wireFor(next.end) },
      null,
      2,
    );
  });
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — Wire helpers</h1>
      <p>
        Article 8: API contracts use structured <code>{local, timeZoneId}</code>
        — never raw ISO offsets, never UTC for human-scheduled times.
        <code>parseScheduledTime</code> turns wire input into
        <code>Temporal.ZonedDateTime</code>; <code>formatScheduledTime</code>
        is the C3-correct round-trip for sending back to the backend.
      </p>
    </header>
    <div class="page__layout">
      <div class="page__calendar">
        <CoarCalendar :builder="builder" />
      </div>
      <aside class="page__pre">
        <h3>Last drop — POST body</h3>
        <pre>{{ lastSerialized }}</pre>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 16px; height: 100%; }
.page__header h1 { margin: 0 0 4px; }
.page__layout { display: flex; gap: 16px; flex: 1; min-height: 600px; }
.page__calendar { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
.page__pre { width: 360px; padding: 12px; background: #f3f4f6; border-radius: 6px; }
.page__pre h3 { margin: 0 0 8px; font-size: 13px; }
.page__pre pre { font-family: monospace; font-size: 11px; line-height: 1.4; margin: 0; white-space: pre-wrap; }
</style>
