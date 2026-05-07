<template>
  <div style="height: 520px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarAgendaView :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarAgendaView,
  useAgendaView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-13'));

// Local helpers — keep event construction terse while still using the
// article-4 typed shape (PlainDate for all-day, ZonedDateTime for timed).
const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  // Multi-day all-day event — appears on every day it touches with
  // a localized "(cont.)" tag from day 2 onwards.
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  // Single-day all-day.
  {
    id: 'easter-monday',
    start: pd('2026-04-13'),
    meta: { title: 'Easter Monday (PT branch)', color: '#10b981' },
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
  // Wed busy day.
  {
    id: 'design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:00:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
  // Fri client demo.
  {
    id: 'fri-demo',
    start: zdt('2026-04-17T15:00:00'),
    end: zdt('2026-04-17T16:30:00'),
    meta: { title: 'Client demo', color: '#dc2626' },
  },
  // Quarterly review crossing the month boundary.
  {
    id: 'qr',
    start: pd('2026-04-29'),
    end: pd('2026-05-02'),
    meta: { title: 'Quarterly review', color: '#2563eb' },
  },
]);

const { builder } = useAgendaView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .agendaLengthDays(30)
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
