<template>
  <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarCalendar
      v-model:view="view"
      v-model:date="date"
      :events="events"
      timezone="UTC"
    >
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
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

interface MyMeta {
  title: string;
  kind: 'meeting' | 'deepwork' | 'meal';
  color: string;
}

const view = ref<CalendarView>('day');
const date = ref('2026-04-15');

const events = ref<CalendarEvent<MyMeta>[]>([
  {
    id: 'standup',
    start: '2026-04-15T09:00:00Z',
    end: '2026-04-15T09:30:00Z',
    meta: { title: 'Standup', kind: 'meeting', color: '#10b981' },
  },
  {
    id: 'deepwork',
    start: '2026-04-15T10:00:00Z',
    end: '2026-04-15T12:00:00Z',
    meta: { title: 'Deep work', kind: 'deepwork', color: '#2563eb' },
  },
  {
    id: 'lunch',
    start: '2026-04-15T12:00:00Z',
    end: '2026-04-15T13:00:00Z',
    meta: { title: 'Lunch', kind: 'meal', color: '#ef4444' },
  },
]);

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
