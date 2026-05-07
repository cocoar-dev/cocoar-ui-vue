<template>
  <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarCalendar :builder="builder">
      <template #event="{ event }">
        <div class="custom-event">
          <span class="custom-event__icon">{{ iconFor(event) }}</span>
          <span class="custom-event__title">{{ titleOf(event) }}</span>
        </div>
      </template>
    </CoarCalendar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

interface MyMeta extends Record<string, unknown> {
  title: string;
  kind: 'meeting' | 'deepwork' | 'meal';
  color: string;
}

const view = ref<CalendarView>('day');
const date = ref(Temporal.PlainDate.from('2026-04-15'));

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent<MyMeta>[]>([
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:30:00'),
    meta: { title: 'Standup', kind: 'meeting', color: '#10b981' },
  },
  {
    id: 'deepwork',
    start: zdt('2026-04-15T10:00:00'),
    end: zdt('2026-04-15T12:00:00'),
    meta: { title: 'Deep work', kind: 'deepwork', color: '#2563eb' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch', kind: 'meal', color: '#ef4444' },
  },
]);

const { builder } = useCalendar<MyMeta>();
builder
  .events(events)
  .view(view)
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

const ICONS: Record<MyMeta['kind'], string> = {
  meeting: '👥',
  deepwork: '🧠',
  meal: '🥗',
};
function titleOf(e: CalendarEvent): string {
  return (e.meta as MyMeta | undefined)?.title ?? e.id;
}
function iconFor(e: CalendarEvent): string {
  const meta = e.meta as MyMeta | undefined;
  return meta ? ICONS[meta.kind] : '•';
}
</script>

<style scoped>
.custom-event {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  height: 100%;
  font-size: 12px;
}
.custom-event__icon {
  font-size: 14px;
  line-height: 1;
}
.custom-event__title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
