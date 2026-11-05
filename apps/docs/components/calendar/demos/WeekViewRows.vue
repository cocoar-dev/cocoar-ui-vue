<template>
  <div style="display: flex; flex-direction: column; gap: 8px">
    <div style="display: flex; gap: 8px; align-items: center">
      <CoarButton
        size="s"
        :variant="orientation === 'horizontal' ? 'primary' : 'secondary'"
        @click="orientation = 'horizontal'"
      >
        Days as rows
      </CoarButton>
      <CoarButton
        size="s"
        :variant="orientation === 'vertical' ? 'primary' : 'secondary'"
        @click="orientation = 'vertical'"
      >
        Days as columns
      </CoarButton>
      <span style="font-size: 12px; color: var(--coar-text-neutral-secondary)">{{ last }}</span>
    </div>
    <div
      style="
        height: 420px;
        border: 1px solid var(--coar-border-neutral-tertiary);
        border-radius: var(--coar-radius-xs);
        overflow: hidden;
      "
    >
      <CoarWeekView :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarWeekView,
  useWeekView,
  Temporal,
  type CalendarEvent,
  type CalendarTimeGridOrientation,
} from '@cocoar/vue-calendar';

const zone = 'Europe/Vienna';
const at = (date: string, time: string) => Temporal.ZonedDateTime.from(`${date}T${time}[${zone}]`);
const block = (
  id: string,
  date: string,
  from: string,
  to: string,
  title: string,
  color: string,
): CalendarEvent => ({
  id,
  start: at(date, from),
  end: at(date, to),
  meta: { title, color },
});

// A time-tracking week: start, end and gaps of every day at a glance.
const events = ref<CalendarEvent[]>([
  block('mo-1', '2026-04-13', '07:30', '09:30', 'Development', '#93c5fd'),
  block('mo-2', '2026-04-13', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('mo-3', '2026-04-13', '09:45', '12:00', 'Development', '#93c5fd'),
  block('mo-4', '2026-04-13', '12:30', '16:00', 'Learning', '#10b981'),
  block('tu-1', '2026-04-14', '08:00', '09:30', 'Development', '#93c5fd'),
  block('tu-2', '2026-04-14', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('tu-3', '2026-04-14', '09:45', '12:00', 'Development', '#93c5fd'),
  block('tu-4', '2026-04-14', '10:30', '11:30', 'Review', '#a78bfa'),
  block('tu-5', '2026-04-14', '13:00', '17:00', 'Backlog', '#f87171'),
  block('we-1', '2026-04-15', '08:30', '10:00', 'Meeting', '#38bdf8'),
  block('we-2', '2026-04-15', '10:30', '15:30', 'Development', '#93c5fd'),
  block('th-1', '2026-04-16', '07:00', '12:00', 'Support', '#fbbf24'),
  block('fr-1', '2026-04-17', '08:00', '12:30', 'Development', '#93c5fd'),
  {
    id: 'sat-off',
    start: Temporal.PlainDate.from('2026-04-18'),
    end: Temporal.PlainDate.from('2026-04-20'),
    meta: { title: 'Weekend trip', color: '#ec4899' },
  },
]);

const orientation = ref<CalendarTimeGridOrientation>('horizontal');
const last = ref('Drag a block onto another day, or its right edge to make it longer.');

const { builder } = useWeekView();
builder
  .events(events)
  .date(Temporal.PlainDate.from('2026-04-15'))
  .timezone(zone)
  .firstDayOfWeek(1)
  .timeGridOrientation(orientation)
  .timeRange({ startMinutes: 6 * 60, endMinutes: 19 * 60 })
  .pixelsPerHour(80)
  .slotDuration(15)
  .onTimeClick(({ date, time }) => {
    last.value = `onTimeClick: ${date} ${time.toString().slice(0, 5)}`;
  })
  .onEventDrop(({ event, next, target }) => {
    last.value = `onEventDrop: ${(event.meta as { title?: string }).title} → ${target.date}`;
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });
</script>
