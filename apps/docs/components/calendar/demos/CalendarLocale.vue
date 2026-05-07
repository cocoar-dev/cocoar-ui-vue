<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; gap: 16px; align-items: center; font-size: 13px;">
      <label style="display: flex; gap: 6px; align-items: center;">
        Locale:
        <select v-model="locale">
          <option value="en-US">en-US</option>
          <option value="de-AT">de-AT</option>
          <option value="ja-JP">ja-JP</option>
          <option value="fr-FR">fr-FR</option>
        </select>
      </label>
      <span style="color: var(--coar-text-neutral-secondary);">
        First-day-of-week is detected from the locale (en-US → Sun, de-AT → Mon, …).
      </span>
    </div>
    <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
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

const view = ref<CalendarView>('month');
const date = ref(Temporal.PlainDate.from('2026-04-15'));
const locale = ref('en-US');

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-04-15T09:30:00[Europe/Vienna]'),
    meta: { title: 'Standup', color: '#10b981' },
  },
]);

const { builder } = useCalendar();
builder
  .events(events)
  .view(view)
  .date(date)
  .locale(locale)
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
</script>
