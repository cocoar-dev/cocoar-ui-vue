<template>
  <div style="height: 600px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarWeekView :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarWeekView,
  useWeekView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-15'));

const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  // Multi-day all-day band entries.
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  {
    id: 'sven-ooo',
    start: pd('2026-04-15'),
    end: pd('2026-04-18'),
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  },
  // Daily standups Mon–Fri.
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: zdt(`${d}T09:00:00`),
      end: zdt(`${d}T09:30:00`),
      meta: { title: 'Daily standup', color: '#10b981' },
    }),
  ),
  // Wed busy-day cluster.
  {
    id: 'wed-design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'wed-lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
  {
    id: 'wed-1on1',
    start: zdt('2026-04-15T15:00:00'),
    end: zdt('2026-04-15T15:45:00'),
    meta: { title: '1:1 with Bernhard', color: '#3b82f6' },
  },
  // Thu deep-work block.
  {
    id: 'thu-deep',
    start: zdt('2026-04-16T09:00:00'),
    end: zdt('2026-04-16T13:00:00'),
    meta: { title: 'Deep work — Calendar', color: '#2563eb' },
  },
  // Fri client demo.
  {
    id: 'fri-demo',
    start: zdt('2026-04-17T15:00:00'),
    end: zdt('2026-04-17T16:30:00'),
    meta: { title: 'Client demo', color: '#dc2626' },
  },
]);

const { builder } = useWeekView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .firstDayOfWeek(1) // Monday — overrides the locale default
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
