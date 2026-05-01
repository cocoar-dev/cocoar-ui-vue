<template>
  <div style="height: 600px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarCalendar
      v-model:view="view"
      v-model:date="date"
      :events="events"
      timezone="UTC"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarCalendar,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref('2026-04-15');

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: '2026-04-15T09:00:00Z',
    end: '2026-04-15T09:30:00Z',
    meta: { title: 'Daily standup', color: '#10b981' },
  },
  {
    id: 'design',
    start: '2026-04-15T11:00:00Z',
    end: '2026-04-15T12:30:00Z',
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'devconf',
    start: '2026-04-13',
    end: '2026-04-16',
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  {
    id: 'lunch',
    start: '2026-04-16T12:00:00Z',
    end: '2026-04-16T13:00:00Z',
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
]);
</script>
