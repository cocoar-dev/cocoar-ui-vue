<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; gap: 12px; align-items: center; font-size: 13px;">
      <span :style="{ color: 'var(--coar-text-neutral-secondary)' }">
        Rows: <strong>{{ events.length + series.length }}</strong>
        ({{ events.length }} one-off + {{ series.length }} series)
      </span>
    </div>
    <div style="height: 520px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Timeline-view showcase — mixes a few one-off project milestones
 * with a recurring standup series. The recurring occurrences
 * collapse into one row with N bars (one per occurrence) — labelled
 * "Daily Standup ×N" in the left pane. The one-off milestones get
 * one row per event.
 *
 * Drag empty space horizontally to pan. Bars are coloured rectangles
 * only; the row label on the left is the title source of truth.
 */

import { ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type CalendarView,
  type RecurringSeries,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  {
    id: 'design',
    start: Temporal.PlainDate.from('2026-06-01'),
    end: Temporal.PlainDate.from('2026-06-08'),
    meta: { title: 'Design phase', color: '#4f46e5' },
  },
  {
    id: 'build',
    start: Temporal.PlainDate.from('2026-06-08'),
    end: Temporal.PlainDate.from('2026-06-22'),
    meta: { title: 'Build phase', color: '#06b6d4' },
  },
  {
    id: 'qa',
    start: Temporal.PlainDate.from('2026-06-22'),
    end: Temporal.PlainDate.from('2026-06-29'),
    meta: { title: 'QA + bug bash', color: '#f59e0b' },
  },
  {
    id: 'launch',
    start: Temporal.PlainDate.from('2026-06-29'),
    end: Temporal.PlainDate.from('2026-06-30'),
    meta: { title: 'Launch day', color: '#ef4444' },
  },
  {
    id: 'retro',
    start: Temporal.ZonedDateTime.from('2026-07-02T14:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-07-02T15:00:00[Europe/Vienna]'),
    meta: { title: 'Retrospective', color: '#a855f7' },
  },
]);

const series = ref<RecurringSeries[]>([
  {
    id: 'standup',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    dtstart: Temporal.ZonedDateTime.from('2026-06-01T09:00:00[Europe/Vienna]'),
    duration: { minutes: 30 },
    meta: { title: 'Daily standup', color: '#10b981' },
  },
]);

const view = ref<CalendarView>('timeline');
const cursor = ref(Temporal.PlainDate.from('2026-06-01'));

const { builder } = useCalendar();
builder
  .events(events)
  .series(series)
  .view(view)
  .date(cursor)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .timelineRangeDays(45)
  .timelinePixelsPerDay(48);
</script>
