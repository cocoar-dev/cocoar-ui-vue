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
      <CoarCalendar
        v-model:view="view"
        v-model:date="date"
        :events="events"
        :locale="locale"
        timezone="UTC"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarCalendar,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('month');
const date = ref('2026-04-15');
const locale = ref('en-US');

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: '2026-04-15T09:00:00Z',
    end: '2026-04-15T09:30:00Z',
    meta: { title: 'Standup', color: '#10b981' },
  },
]);
</script>
