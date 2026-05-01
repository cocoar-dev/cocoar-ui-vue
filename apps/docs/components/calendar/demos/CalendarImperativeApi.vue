<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <CoarButton variant="secondary" size="s" @click="cal?.prev()">
        prev
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="cal?.goToToday()">
        today
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="cal?.next()">
        next
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="cal?.setView('month')">
        Switch to Month
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="cal?.scrollToTime(8)">
        Scroll to 8 AM
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="logVisible">
        Log visible range
      </CoarButton>
    </div>
    <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar
        ref="cal"
        v-model:view="view"
        v-model:date="date"
        :events="events"
        timezone="UTC"
      />
    </div>
    <pre v-if="logLine" class="log">{{ logLine }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const cal = useTemplateRef<InstanceType<typeof CoarCalendar>>('cal');

const view = ref<CalendarView>('week');
const date = ref('2026-04-15');
const logLine = ref('');

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: '2026-04-15T09:00:00Z',
    end: '2026-04-15T09:30:00Z',
    meta: { title: 'Standup', color: '#10b981' },
  },
]);

function logVisible() {
  const r = cal.value?.getVisibleRange();
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
