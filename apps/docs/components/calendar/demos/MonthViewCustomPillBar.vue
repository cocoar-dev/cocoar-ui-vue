<template>
  <div>
    <p class="hint">
      Custom <code>#pill</code> + <code>#multiDayBar</code> slots —
      pills get a leading time chip; bars get a trailing day-count chip.
    </p>
    <div style="height: 600px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarMonthView :builder="builder">
        <template #pill="{ event }">
          <span class="pill">
            <span class="pill__time">{{ formatTime(event) }}</span>
            <span class="pill__title">{{ title(event) }}</span>
          </span>
        </template>
        <template #multiDayBar="{ event, bar }">
          <span class="bar">
            <span class="bar__title">{{ title(event) }}</span>
            <span class="bar__chip">{{ bar.endCol - bar.startCol + 1 }}d</span>
          </span>
        </template>
      </CoarMonthView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarMonthView,
  useMonthView,
  Temporal,
  isTimedEvent,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-15'));

const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  {
    id: 'sven-ooo',
    start: pd('2026-04-15'),
    end: pd('2026-04-18'),
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  },
  {
    id: 'team-offsite',
    start: pd('2026-04-22'),
    end: pd('2026-04-28'),
    meta: { title: 'Team offsite', color: '#0891b2' },
  },
  {
    id: 'standup-mon',
    start: zdt('2026-04-13T09:00:00'),
    end: zdt('2026-04-13T09:30:00'),
    meta: { title: 'Standup', color: '#10b981' },
  },
  {
    id: 'review',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:00:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch', color: '#ef4444' },
  },
  {
    id: 'demo',
    start: zdt('2026-04-17T15:00:00'),
    end: zdt('2026-04-17T16:30:00'),
    meta: { title: 'Client demo', color: '#dc2626' },
  },
]);

const { builder } = useMonthView();
builder
  .events(events)
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

function title(event: CalendarEvent): string {
  return (event.meta as { title?: string } | undefined)?.title ?? event.id;
}

const timeFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Europe/Vienna',
});
function formatTime(event: CalendarEvent): string {
  // All-day events (PlainDate start) have no clock time to show.
  if (!isTimedEvent(event)) return '';
  // ZonedDateTime → epoch ms via toInstant() so we can hand it to Intl.
  return timeFmt
    .format(new Date(event.start.toInstant().epochMilliseconds))
    .replace(' ', ' ');
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
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  overflow: hidden;
}
.pill__time {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--coar-text-base, #1a1c1f);
  white-space: nowrap;
}
.pill__title {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--coar-text-base, #1a1c1f);
}
.bar {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 6px;
}
.bar__title {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
}
.bar__chip {
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 700;
  color: var(--coar-text-base, #1a1c1f);
  background: rgba(0, 0, 0, 0.12);
  padding: 0 6px;
  border-radius: 999px;
}
</style>
