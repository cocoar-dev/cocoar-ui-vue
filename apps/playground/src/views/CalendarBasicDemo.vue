<script setup lang="ts">
/**
 * Basic CoarCalendar demo.
 *
 * Smallest possible setup: useCalendar() returns
 * { builder, api }; chain a few setters; render <CoarCalendar :builder>.
 * Events are Temporal-typed (C1 — no ISO strings on the public surface).
 */

import { ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const log = ref<string[]>([]);
function pushLog(line: string): void {
  log.value.unshift(`${new Date().toLocaleTimeString()}  ${line}`);
  if (log.value.length > 8) log.value.length = 8;
}

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-06-15T09:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-15T09:30:00[Europe/Vienna]'),
    meta: { title: 'Daily Standup' },
  },
  {
    id: 'design-review',
    start: Temporal.ZonedDateTime.from('2026-06-16T14:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-16T15:30:00[Europe/Vienna]'),
    meta: { title: 'Design Review' },
  },
  {
    id: 'vacation',
    start: Temporal.PlainDate.from('2026-06-22'),
    end: Temporal.PlainDate.from('2026-06-27'),
    meta: { title: 'Vacation' },
  },
]);

const { builder } = useCalendar();
builder
  .events(events)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .view('week')
  .date(Temporal.PlainDate.from('2026-06-15'))
  .onEventClick(({ event }) => {
    const title = (event.meta as { title?: string } | undefined)?.title ?? event.id;
    pushLog(`click: ${title}`);
  })
  .onEventDrop(({ event, next, target }) => {
    const title = (event.meta as { title?: string } | undefined)?.title ?? event.id;
    pushLog(
      `drop: ${title} → ${target.date} ${target.minutes ?? ''} (${target.displayZone}${target.disambiguation ? `, ${target.disambiguation}` : ''})`,
    );
    // Apply the drop to the event source — C3-correct: per-endpoint
    // source zones preserved in next.start / next.end.
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      events.value = [
        ...events.value.slice(0, idx),
        { ...events.value[idx], start: next.start, end: next.end },
        ...events.value.slice(idx + 1),
      ];
    }
  })
  .onRangeChange((window) => {
    pushLog(`range: ${window.view} ${window.start}..${window.end} (${window.timezone})`);
  });
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — Basic</h1>
      <p>
        Smallest possible setup. Events are <code>Temporal.ZonedDateTime</code>
        or <code>Temporal.PlainDate</code> only (C1). Drag any event to fire
        <code>onEventDrop</code>; the payload's <code>next.start</code> keeps
        its source zone (C3).
      </p>
    </header>
    <div class="page__layout">
      <div class="page__calendar">
        <CoarCalendar :builder="builder" />
      </div>
      <aside class="page__log">
        <h3>Event log</h3>
        <ul>
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 16px; height: 100%; }
.page__header h1 { margin: 0 0 4px; }
.page__layout { display: flex; gap: 16px; flex: 1; min-height: 600px; }
.page__calendar { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
.page__log { width: 320px; padding: 12px; background: #fafafa; border-radius: 6px; }
.page__log h3 { margin: 0 0 8px; font-size: 13px; }
.page__log ul { list-style: none; padding: 0; margin: 0; font-family: monospace; font-size: 11px; line-height: 1.4; }
.page__log li { padding: 4px 0; border-bottom: 1px solid #e5e7eb; }
</style>
