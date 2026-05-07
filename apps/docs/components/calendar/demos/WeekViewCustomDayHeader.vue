<template>
  <div>
    <p class="hint">
      Custom <code>#dayHeader</code> slot — day-of-week + day-of-month
      stacked, today highlighted with a blue dot, weekends muted.
    </p>
    <div style="height: 540px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarWeekView :builder="builder">
        <template #dayHeader="{ date: d, isToday, isWeekend }">
          <div class="hdr" :class="{ 'hdr--today': isToday, 'hdr--weekend': isWeekend }">
            <span class="hdr__dow">{{ formatDow(d) }}</span>
            <span class="hdr__day">
              {{ d.day }}
              <span v-if="isToday" class="hdr__dot" />
            </span>
          </div>
        </template>
      </CoarWeekView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarWeekView,
  useWeekView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-15'));

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: zdt(`${d}T09:00:00`),
      end: zdt(`${d}T09:30:00`),
      meta: { title: 'Standup', color: '#10b981' },
    }),
  ),
  {
    id: 'review',
    start: zdt('2026-04-15T14:00:00'),
    end: zdt('2026-04-15T15:00:00'),
    meta: { title: 'Sprint review', color: '#8b5cf6' },
  },
]);

const { builder } = useWeekView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .firstDayOfWeek(1)
  .timeRange({ startMinutes: 8 * 60, endMinutes: 18 * 60 })
  .onEventDrop(({ event, next }) => {
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });

const dowFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
function formatDow(d: Temporal.PlainDate): string {
  return dowFmt
    .format(new Date(Date.UTC(d.year, d.month - 1, d.day)))
    .toUpperCase();
}
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
.hdr {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 4px 8px;
}
.hdr__dow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--coar-text-subtle, #6b7280);
}
.hdr__day {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
}
.hdr__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--coar-color-accent, #2563eb);
}
.hdr--today .hdr__day {
  color: var(--coar-color-accent, #2563eb);
}
.hdr--weekend .hdr__day,
.hdr--weekend .hdr__dow {
  color: var(--coar-text-subtle, #9ca3af);
}
</style>
