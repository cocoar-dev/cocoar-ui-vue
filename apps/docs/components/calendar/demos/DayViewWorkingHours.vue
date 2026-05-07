<template>
  <div>
    <p class="hint">
      Visible hour range constrained to <code>[8, 18]</code>; slot
      subdivision tightened to 15 min for finer drag-snap. The early
      flight (5–7&nbsp;AM) is still in <code>events</code> but lives off
      the visible window.
    </p>
    <div style="height: 520px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarDayView :builder="builder" />
    </div>
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

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  // Off-window early — invisible at timeRange [8, 18].
  {
    id: 'red-eye',
    start: zdt('2026-04-15T05:00:00'),
    end: zdt('2026-04-15T07:30:00'),
    meta: { title: 'Early flight', color: '#84cc16' },
  },
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:15:00'),
    meta: { title: 'Daily standup', color: '#10b981' },
  },
  {
    id: 'review',
    start: zdt('2026-04-15T10:30:00'),
    end: zdt('2026-04-15T11:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch', color: '#ef4444' },
  },
  {
    id: 'deep-work',
    start: zdt('2026-04-15T13:15:00'),
    end: zdt('2026-04-15T16:45:00'),
    meta: { title: 'Deep work', color: '#2563eb' },
  },
]);

const { builder } = useDayView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .timeRange({ startMinutes: 8 * 60, endMinutes: 18 * 60 })
  .slotDuration(15)
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

<style scoped>
.hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--coar-text-subtle, #6b7280);
}
.hint code {
  font-family: var(--coar-font-family-mono, monospace);
  font-size: 12px;
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  padding: 1px 5px;
  border-radius: 3px;
}
</style>
