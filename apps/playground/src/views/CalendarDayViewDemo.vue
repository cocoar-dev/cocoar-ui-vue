<script setup lang="ts">
/**
 * Phase 2.1 — first user-visible end-to-end calendar view.
 *
 * `<CoarDayView>` rendering a day's worth of synthetic events
 * including the cases the time grid is supposed to handle:
 *
 *   - Simple non-overlapping events
 *   - Two-deep overlaps (two events claim the same time)
 *   - Three-deep overlaps (lunch meeting cluster)
 *   - Events touching at a shared boundary (NOT overlapping)
 *   - Event clipped at the top (started before `timeRange[0]`)
 *   - Event clipped at the bottom (ends after `timeRange[1]`)
 *   - Event spanning across midnight (rendered up to 24:00)
 *   - Default 30-min duration when end is missing
 *   - Custom event meta with title + color
 *
 * Plus controls for the consumer to play with: cursor (date),
 * time range, slot duration, density, locale.
 */

import { computed, ref } from 'vue';
import { CoarDayView, type CalendarEvent } from '@cocoar/vue-calendar';

const today = ref('2026-04-15');
const timeRangeStart = ref(6);
const timeRangeEnd = ref(22);
const slotDuration = ref<5 | 10 | 15 | 30 | 60>(30);
const density = ref<'comfortable' | 'compact'>('comfortable');
const locale = ref('en-US');

const timeRange = computed<[number, number]>(() => [
  timeRangeStart.value,
  timeRangeEnd.value,
]);

// Synthetic event set covering the corner cases.
const events = computed<CalendarEvent[]>(() => {
  const date = today.value;
  return [
    // Simple non-overlapping
    {
      id: 'standup',
      start: `${date}T09:00:00Z`,
      end: `${date}T09:30:00Z`,
      meta: { title: 'Daily standup', color: '#10b981' },
    },
    // Default 30-min duration (no end)
    {
      id: 'check-in',
      start: `${date}T10:00:00Z`,
      meta: { title: 'Quick check-in (default 30min)', color: '#06b6d4' },
    },
    // Two-deep overlap
    {
      id: 'design-review',
      start: `${date}T11:00:00Z`,
      end: `${date}T12:30:00Z`,
      meta: { title: 'Design review', color: '#8b5cf6' },
    },
    {
      id: 'pairing',
      start: `${date}T11:30:00Z`,
      end: `${date}T13:00:00Z`,
      meta: { title: 'Pair programming', color: '#f59e0b' },
    },
    // Three-deep overlap (lunch cluster)
    {
      id: 'lunch',
      start: `${date}T12:00:00Z`,
      end: `${date}T13:00:00Z`,
      meta: { title: 'Lunch with Anna', color: '#ef4444' },
    },
    // Touching at a shared boundary (not overlapping with the above)
    {
      id: 'one-on-one',
      start: `${date}T13:00:00Z`,
      end: `${date}T13:30:00Z`,
      meta: { title: '1:1 with manager', color: '#3b82f6' },
    },
    // Long focused block
    {
      id: 'deep-work',
      start: `${date}T14:00:00Z`,
      end: `${date}T17:00:00Z`,
      meta: { title: 'Deep work — Calendar Phase 2', color: '#2563eb' },
    },
    // Two-deep overlap inside the long block
    {
      id: 'interrupt',
      start: `${date}T15:30:00Z`,
      end: `${date}T16:00:00Z`,
      meta: { title: 'Quick chat (interrupt)', color: '#ec4899' },
    },
    // Clipped at the bottom — runs past 22:00
    {
      id: 'late-call',
      start: `${date}T20:30:00Z`,
      end: `${date}T23:30:00Z`,
      meta: { title: 'Late client call (overruns)', color: '#dc2626' },
    },
    // Clipped at the top — started before timeRange[0]
    {
      id: 'red-eye',
      start: `${date}T05:00:00Z`,
      end: `${date}T07:30:00Z`,
      meta: { title: 'Early flight (overruns top)', color: '#84cc16' },
    },
    // All-day (should NOT appear in the time grid)
    {
      id: 'sprint',
      start: date,
      end: '2026-04-16',
      meta: { title: 'Sprint planning week (all-day, hidden)' },
    },
    // Spanning midnight — should appear in today's column up to 24:00
    {
      id: 'overnight',
      start: `${date}T23:00:00Z`,
      end: `2026-04-16T02:00:00Z`,
      meta: { title: 'Overnight on-call', color: '#7c3aed' },
    },
  ];
});

// Click logging
const clicks = ref<{ kind: 'time' | 'event'; label: string; when: string }[]>([]);

function onTimeClick(p: { date: { toString(): string }; time: { toString(): string } }) {
  clicks.value.unshift({
    kind: 'time',
    label: `${p.date.toString()} ${p.time.toString().slice(0, 5)}`,
    when: new Date().toLocaleTimeString(),
  });
  if (clicks.value.length > 5) clicks.value.length = 5;
}
function onEventClick(p: { event: CalendarEvent }) {
  const title = (p.event.meta as { title?: string } | undefined)?.title ?? p.event.id;
  clicks.value.unshift({
    kind: 'event',
    label: title,
    when: new Date().toLocaleTimeString(),
  });
  if (clicks.value.length > 5) clicks.value.length = 5;
}
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 2.1 — Day View (first calendar view!)</h1>
      <p>
        <code>&lt;CoarDayView&gt;</code> rendering a day with overlap
        resolution, hour labels, slot lines, now-marker, and
        clip-at-edge handling. All-day events are not shown in the
        time grid (they belong to a separate all-day band, coming
        with the week view).
      </p>
    </header>

    <div class="controls">
      <label>
        Date:
        <input v-model="today" type="date" />
      </label>
      <label>
        Time range:
        <select v-model.number="timeRangeStart">
          <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ h - 1 }}:00</option>
        </select>
        →
        <select v-model.number="timeRangeEnd">
          <option v-for="h in 24" :key="h" :value="h">{{ h }}:00</option>
        </select>
      </label>
      <label>
        Slot:
        <select v-model.number="slotDuration">
          <option :value="5">5 min</option>
          <option :value="10">10 min</option>
          <option :value="15">15 min</option>
          <option :value="30">30 min</option>
          <option :value="60">60 min</option>
        </select>
      </label>
      <label>
        Density:
        <select v-model="density">
          <option value="comfortable">comfortable</option>
          <option value="compact">compact</option>
        </select>
      </label>
      <label>
        Locale:
        <select v-model="locale">
          <option value="en-US">en-US</option>
          <option value="de-AT">de-AT</option>
          <option value="ja-JP">ja-JP</option>
        </select>
      </label>
    </div>

    <div class="day-host">
      <CoarDayView
        :cursor="today"
        :events="events"
        :time-range="timeRange"
        :slot-duration="slotDuration"
        :density="density"
        :locale="locale"
        timezone="UTC"
        @time-click="onTimeClick"
        @event-click="onEventClick"
      />
    </div>

    <div class="click-log">
      <h2>Recent clicks</h2>
      <ul v-if="clicks.length > 0">
        <li v-for="(c, i) in clicks" :key="i">
          <strong>{{ c.kind }}</strong>
          <span class="click-log__label">{{ c.label }}</span>
          <span class="click-log__time">{{ c.when }}</span>
        </li>
      </ul>
      <p v-else class="click-log__empty">
        Click an empty slot or an event to see entries here.
      </p>
    </div>

    <details class="event-source">
      <summary>Event source ({{ events.length }} events, including 1 all-day)</summary>
      <pre>{{ JSON.stringify(events, null, 2) }}</pre>
    </details>
  </div>
</template>

<style scoped>
.view {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
}
.view__header h1 { margin: 0 0 4px 0; font-size: 22px; }
.view__header p {
  margin: 0;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}
.view__header code {
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: #4b5563;
}
.controls label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.controls select,
.controls input {
  padding: 2px 6px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
}

.day-host {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  max-height: 700px;
  overflow-y: auto;
}

.click-log h2 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6c7280;
  margin: 0 0 8px 0;
}
.click-log ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.click-log li {
  display: flex;
  gap: 12px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.click-log strong {
  text-transform: uppercase;
  font-size: 11px;
  color: #6c7280;
  min-width: 50px;
}
.click-log__label { flex: 1; color: #1a1c1f; }
.click-log__time { color: #6c7280; font-size: 12px; }
.click-log__empty { font-size: 13px; color: #9ca3af; margin: 0; }

.event-source {
  font-size: 12px;
  color: #6c7280;
}
.event-source summary {
  cursor: pointer;
  user-select: none;
}
.event-source pre {
  background: #f6f7f9;
  border: 1px solid #e3e5e9;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
  overflow-x: auto;
  font-size: 11px;
  line-height: 1.5;
  max-height: 300px;
  overflow-y: auto;
}
</style>
