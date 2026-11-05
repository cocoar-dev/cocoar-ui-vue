<script setup lang="ts">
/**
 * Horizontal time grid demo — `builder.timeGridOrientation('horizontal')`:
 * one row per day, time running left → right. Week, Work week and Day
 * from the view switcher; the orientation toggle flips the same data
 * back to columns. Drops are applied to the event list; a click on an
 * event opens a sheet with a backdrop (a backdrop click closes it), the
 * situation the touch tap gate is there for. Used by
 * `e2e/calendar-time-rows.spec.ts`.
 */

import { ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type CalendarTimeGridOrientation,
} from '@cocoar/vue-calendar';

const ZONE = 'Europe/Vienna';
const at = (date: string, time: string) => Temporal.ZonedDateTime.from(`${date}T${time}[${ZONE}]`);
const block = (
  id: string,
  date: string,
  from: string,
  to: string,
  title: string,
  color?: string,
): CalendarEvent => ({
  id,
  start: at(date, from),
  end: at(date, to),
  meta: { title, ...(color ? { color } : {}) },
});

const events = ref<CalendarEvent[]>([
  block('mo-dev', '2026-10-19', '07:30', '09:30', 'Entwicklung'),
  block('mo-daily', '2026-10-19', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('mo-dev2', '2026-10-19', '09:45', '12:00', 'Entwicklung'),
  block('mo-learn', '2026-10-19', '12:30', '13:30', 'Learning', '#10b981'),
  block('di-dev', '2026-10-20', '07:30', '09:30', 'Entwicklung'),
  block('di-daily', '2026-10-20', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('di-dev2', '2026-10-20', '09:45', '12:00', 'Entwicklung'),
  block('di-review', '2026-10-20', '10:30', '11:30', 'Review', '#8b5cf6'),
  block('di-backlog', '2026-10-20', '12:30', '13:30', 'Backlog', '#ef4444'),
  block('mi-meeting', '2026-10-21', '08:00', '09:30', 'Meeting', '#0ea5e9'),
  block('mi-dev', '2026-10-21', '10:30', '13:00', 'Entwicklung'),
  {
    id: 'do-night',
    start: at('2026-10-22', '22:00'),
    end: at('2026-10-23', '01:00'),
    meta: { title: 'Nachtschicht', color: '#64748b' },
  },
  {
    id: 'fr-offsite',
    start: Temporal.PlainDate.from('2026-10-23'),
    end: Temporal.PlainDate.from('2026-10-25'),
    meta: { title: 'Offsite', color: '#ec4899' },
  },
]);

const log = ref<string[]>([]);
function pushLog(line: string): void {
  log.value.unshift(line);
  if (log.value.length > 12) log.value.length = 12;
}

const orientation = ref<CalendarTimeGridOrientation>('horizontal');
const sheet = ref<string | null>(null);

const { builder } = useCalendar();
builder
  .events(events)
  .timezone(ZONE)
  .locale('de-AT')
  .firstDayOfWeek(1)
  .view('week')
  .availableViews(['week', 'workWeek', 'day'])
  .timeGridOrientation(orientation)
  .timeRange({ startMinutes: 6 * 60, endMinutes: 20 * 60 })
  .pixelsPerHour(90)
  .slotDuration(15)
  .date(Temporal.PlainDate.from('2026-10-21'))
  .onEventClick(({ event }) => {
    const title = (event.meta as { title?: string } | undefined)?.title ?? event.id;
    pushLog(`click: ${title}`);
    sheet.value = title;
  })
  .onDateClick(({ date }) => pushLog(`dateClick: ${date}`))
  .onTimeClick(({ date, time }) => pushLog(`timeClick: ${date} ${time.toString().slice(0, 5)}`))
  .onEventDrop(({ event, next, target }) => {
    const title = (event.meta as { title?: string } | undefined)?.title ?? event.id;
    const end =
      next.end instanceof Temporal.ZonedDateTime
        ? next.end.toPlainTime().toString().slice(0, 5)
        : '';
    const start =
      next.start instanceof Temporal.ZonedDateTime
        ? next.start.toPlainTime().toString().slice(0, 5)
        : '';
    pushLog(`drop: ${title} → ${target.date} ${start}–${end}`);
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      events.value = [
        ...events.value.slice(0, idx),
        { ...events.value[idx], start: next.start, end: next.end },
        ...events.value.slice(idx + 1),
      ];
    }
  })
  .onRangeChange((w) => pushLog(`range: ${w.view} ${w.start}..${w.end}`));
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — horizontal time grid</h1>
      <div class="page__toggle" role="group" aria-label="Orientation">
        <button
          data-testid="orientation-horizontal"
          :aria-pressed="orientation === 'horizontal'"
          @click="orientation = 'horizontal'"
        >
          Days as rows
        </button>
        <button
          data-testid="orientation-vertical"
          :aria-pressed="orientation === 'vertical'"
          @click="orientation = 'vertical'"
        >
          Days as columns
        </button>
      </div>
    </header>
    <div class="page__layout">
      <div class="page__calendar">
        <CoarCalendar :builder="builder" />
      </div>
      <aside class="page__log">
        <h3>Event log</h3>
        <ul data-testid="log">
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
        </ul>
      </aside>
    </div>
    <div v-if="sheet" class="page__backdrop" data-testid="backdrop" @click="sheet = null">
      <div class="page__sheet" data-testid="sheet" @click.stop>{{ sheet }}</div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  box-sizing: border-box;
}
.page__header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.page__header h1 {
  margin: 0;
  font-size: 18px;
}
.page__toggle button[aria-pressed='true'] {
  font-weight: 700;
}
.page__layout {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 560px;
}
.page__calendar {
  flex: 1;
  min-width: 0;
  height: 640px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}
.page__log {
  width: 300px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}
.page__log h3 {
  margin: 0 0 8px;
  font-size: 13px;
}
.page__log ul {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
}
.page__log li {
  padding: 4px 0;
  border-bottom: 1px solid #e5e7eb;
}
.page__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
}
.page__sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 30vh;
  background: #fff;
  padding: 16px;
}
</style>
