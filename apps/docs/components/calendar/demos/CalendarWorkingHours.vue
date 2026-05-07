<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <label style="font-size: 13px; display: flex; gap: 8px; align-items: center;">
      <input v-model="workingHoursOnly" type="checkbox" />
      Working hours only (8 AM – 6 PM)
    </label>
    <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref(Temporal.PlainDate.from('2026-04-15'));
const workingHoursOnly = ref(true);
const timeRange = computed(() =>
  workingHoursOnly.value
    ? { startMinutes: 8 * 60, endMinutes: 18 * 60 }
    : { startMinutes: 0, endMinutes: 24 * 60 },
);

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:30:00'),
    meta: { title: 'Standup', color: '#10b981' },
  },
  {
    id: 'design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'demo',
    start: zdt('2026-04-17T15:00:00'),
    end: zdt('2026-04-17T16:30:00'),
    meta: { title: 'Client demo', color: '#dc2626' },
  },
]);

const { builder } = useCalendar();
builder
  .events(events)
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  .timeRange(timeRange)
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
