<template>
  <div style="height: 640px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarMonthView :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarMonthView,
  useMonthView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-15'));

const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  // Multi-day bars across week boundaries.
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
  {
    id: 'team-offsite',
    start: pd('2026-04-22'),
    end: pd('2026-04-28'),
    meta: { title: 'Team offsite', color: '#0891b2' },
  },
  {
    id: 'easter',
    start: pd('2026-04-03'),
    end: pd('2026-04-07'),
    meta: { title: 'Easter break', color: '#84cc16' },
  },
  // Daily standups Mon–Fri.
  ...['2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: zdt(`${d}T09:00:00`),
      end: zdt(`${d}T09:30:00`),
      meta: { title: 'Standup', color: '#10b981' },
    }),
  ),
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17'].map(
    (d): CalendarEvent => ({
      id: `standup-w2-${d}`,
      start: zdt(`${d}T09:00:00`),
      end: zdt(`${d}T09:30:00`),
      meta: { title: 'Standup', color: '#06b6d4' },
    }),
  ),
  // Wed busy day — extra pills to trigger the per-cell scroll + kebab.
  {
    id: 'wed-design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'wed-pair',
    start: zdt('2026-04-15T11:30:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Pair: calendar', color: '#f59e0b' },
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
  // Quarterly review crossing into May.
  {
    id: 'quarter-review',
    start: pd('2026-04-29'),
    end: pd('2026-05-02'),
    meta: { title: 'Quarterly review', color: '#2563eb' },
  },
]);

const { builder } = useMonthView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
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
