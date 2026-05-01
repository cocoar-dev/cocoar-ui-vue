<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <label style="font-size: 13px; display: flex; gap: 8px; align-items: center;">
      <input v-model="workingHoursOnly" type="checkbox" />
      Working hours only (8 AM – 6 PM)
    </label>
    <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar
        v-model:view="view"
        v-model:date="date"
        :events="events"
        :time-range="timeRange"
        timezone="UTC"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CoarCalendar,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref('2026-04-15');
const workingHoursOnly = ref(true);
const timeRange = computed<[number, number]>(() =>
  workingHoursOnly.value ? [8, 18] : [0, 24],
);

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: '2026-04-15T09:00:00Z',
    end: '2026-04-15T09:30:00Z',
    meta: { title: 'Standup', color: '#10b981' },
  },
  {
    id: 'design',
    start: '2026-04-15T11:00:00Z',
    end: '2026-04-15T12:30:00Z',
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'demo',
    start: '2026-04-17T15:00:00Z',
    end: '2026-04-17T16:30:00Z',
    meta: { title: 'Client demo', color: '#dc2626' },
  },
]);
</script>
