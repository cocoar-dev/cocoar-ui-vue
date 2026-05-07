<template>
  <div style="height: 600px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarDayView :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarDayView,
  useDayView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-15'));

const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  // All-day band: a multi-day OOO that touches today.
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  // Three timed events with a 3-deep overlap cluster.
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:30:00'),
    meta: { title: 'Daily standup', color: '#10b981' },
  },
  {
    id: 'design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'pair',
    start: zdt('2026-04-15T11:30:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Pair: calendar', color: '#f59e0b' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
  {
    id: 'one-on-one',
    start: zdt('2026-04-15T15:00:00'),
    end: zdt('2026-04-15T15:45:00'),
    meta: { title: '1:1 with Bernhard', color: '#3b82f6' },
  },
]);

const { builder } = useDayView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  // Apply drag/keyboard moves in place so the demo is interactive.
  .onEventDrop(({ event, next }) => {
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });
</script>
