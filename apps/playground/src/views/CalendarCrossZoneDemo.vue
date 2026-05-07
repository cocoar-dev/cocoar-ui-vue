<script setup lang="ts">
/**
 * Cross-zone events demo (C3 + C5 in action).
 *
 * A Tokyo → Vienna flight is a CalendarEvent whose start.timeZoneId
 * is 'Asia/Tokyo' and end.timeZoneId is 'Europe/Vienna'. Toggle
 * between display zones — the calendar always renders in the chosen
 * display zone, but the event's source zones are preserved across
 * any drag.
 */

import { ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  // Tokyo → Vienna flight: depart 22:00 Tokyo, arrive 06:00 Vienna next day.
  {
    id: 'flight-NRT-VIE',
    start: Temporal.ZonedDateTime.from('2026-06-15T22:00:00[Asia/Tokyo]'),
    end: Temporal.ZonedDateTime.from('2026-06-16T06:00:00[Europe/Vienna]'),
    meta: { title: 'NRT → VIE' },
  },
  // Vienna meeting after arrival.
  {
    id: 'mtg-vie',
    start: Temporal.ZonedDateTime.from('2026-06-16T10:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-16T11:00:00[Europe/Vienna]'),
    meta: { title: 'Vienna meeting' },
  },
  // Tokyo standup (back home).
  {
    id: 'tokyo-standup',
    start: Temporal.ZonedDateTime.from('2026-06-19T09:00:00[Asia/Tokyo]'),
    end: Temporal.ZonedDateTime.from('2026-06-19T09:30:00[Asia/Tokyo]'),
    meta: { title: 'Tokyo standup' },
  },
]);

const displayZone = ref('Europe/Vienna');

const { builder } = useCalendar();
builder
  .events(events)
  .timezone(displayZone)
  .locale('en-GB')
  .firstDayOfWeek(1)
  .view('week')
  .date(Temporal.PlainDate.from('2026-06-15'))
  .onEventDrop(({ event, original, next, target }) => {
    // C3 verification — log per-endpoint zones before/after.
    console.log('Drop:', {
      id: event.id,
      original: {
        startZone: (original.start as Temporal.ZonedDateTime).timeZoneId,
        endZone: (original.end as Temporal.ZonedDateTime | undefined)?.timeZoneId,
        displayZone: original.displayZone,
      },
      next: {
        startZone: (next.start as Temporal.ZonedDateTime).timeZoneId,
        endZone: (next.end as Temporal.ZonedDateTime | undefined)?.timeZoneId,
      },
      target: { date: target.date, displayZone: target.displayZone },
    });
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      events.value = [
        ...events.value.slice(0, idx),
        { ...events.value[idx], start: next.start, end: next.end },
        ...events.value.slice(idx + 1),
      ];
    }
  });
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — Cross-zone events</h1>
      <p>
        A flight Tokyo → Vienna has <code>start.timeZoneId = 'Asia/Tokyo'</code>
        and <code>end.timeZoneId = 'Europe/Vienna'</code>. Toggle the display
        zone below — both endpoints keep their source zones across any drag
        (C3). Console logs the per-endpoint zones on drop.
      </p>
      <div class="page__zone-toggle">
        <label>Display zone:</label>
        <button
          v-for="z in ['Europe/Vienna', 'Asia/Tokyo', 'America/Los_Angeles', 'UTC']"
          :key="z"
          :class="{ active: displayZone === z }"
          @click="displayZone = z"
        >
          {{ z }}
        </button>
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
.page__zone-toggle { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.page__zone-toggle button { padding: 4px 10px; border: 1px solid #e5e7eb; background: white; border-radius: 4px; cursor: pointer; }
.page__zone-toggle button.active { background: #3b82f6; color: white; border-color: #3b82f6; }
.page__calendar { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; min-height: 500px; }
</style>
