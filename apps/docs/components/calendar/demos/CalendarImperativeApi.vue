<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <CoarButton variant="secondary" size="s" @click="api.prev()">
        prev
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="api.goToToday()">
        today
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="api.next()">
        next
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="api.setView('month')">
        Switch to Month
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="api.scrollToTime(8)">
        Scroll to 8 AM
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="logVisible">
        Log visible range
      </CoarButton>
    </div>
    <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
    <pre v-if="logLine" class="log">{{ logLine }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref(Temporal.PlainDate.from('2026-04-15'));
const logLine = ref('');

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-04-15T09:30:00[Europe/Vienna]'),
    meta: { title: 'Standup', color: '#10b981' },
  },
]);

const { builder, api } = useCalendar();
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

function logVisible() {
  const r = api.getVisibleRange();
  if (r) logLine.value = `${r.view}: ${r.start} → ${r.end}`;
}
</script>

<style scoped>
.log {
  margin: 0;
  padding: 8px 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xs);
  font-size: 12px;
  font-family: var(--coar-mono-base-family, monospace);
}
</style>
