<script setup lang="ts">
/**
 * Performance baseline — 1000 events.
 *
 * Generates a dense fixture and loads it into <CoarCalendar>. Use it
 * to eyeball wheel-scroll smoothness, view-switch latency, and
 * drag-frame stability against the targets below. The numbers here
 * are for manual verification; nothing is asserted automatically
 * (CI's perf gate measures Long Animation Frame entries on the
 * narrower drag path).
 *
 * Targets (Tier A laptop / desktop, Chromium):
 *   - mount + first paint           ≤ 250 ms
 *   - view switch (week ↔ month)    ≤ 150 ms
 *   - drag of one event             ≥ 50 fps (no ≥ 50 ms LoAF)
 *   - wheel scroll over the surface ≥ 50 fps
 *   - filtering 1 000 → 100 events  ≤ 100 ms re-layout
 *
 * The "regenerate" button rebuilds the fixture so you can probe
 * cold-mount cost without a full reload.
 */

import { computed, ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';
import { CoarSegmentedControl } from '@cocoar/vue-ui';

const COUNT_OPTIONS = [
  { value: 100, label: '100' },
  { value: 500, label: '500' },
  { value: 1000, label: '1 000' },
  { value: 2500, label: '2 500' },
];

const eventCount = ref<number>(1000);
const generatedAt = ref<number>(0);
const generationMs = ref<number>(0);

function makeEvents(count: number): CalendarEvent[] {
  const TZ = 'Europe/Vienna';
  const SEED_DAY = Temporal.PlainDate.from('2026-06-01');
  const out: CalendarEvent[] = [];
  for (let i = 0; i < count; i++) {
    // Spread across ~60 days, multiple events per day.
    const dayOffset = i % 60;
    const day = SEED_DAY.add({ days: dayOffset });
    // ~10 % all-day, rest timed.
    if (i % 10 === 0) {
      const span = 1 + (i % 4);
      out.push({
        id: `evt-${i}`,
        start: day,
        end: day.add({ days: span }),
        meta: { title: `All-day #${i}`, color: '#10b981' },
      });
      continue;
    }
    const hour = (i * 17) % 22;       // 0..21 — coarse hash for variety
    const minute = (i % 4) * 15;
    const durationMin = 15 + ((i * 7) % 90); // 15..104 min
    const start = day.toZonedDateTime({
      timeZone: TZ,
      plainTime: Temporal.PlainTime.from({ hour, minute }),
    });
    out.push({
      id: `evt-${i}`,
      start,
      end: start.add({ minutes: durationMin }),
      meta: {
        title: `Event #${i}`,
        color: ['#2563eb', '#ef4444', '#a855f7', '#f59e0b'][i % 4],
      },
    });
  }
  return out;
}

const events = ref<CalendarEvent[]>([]);
const view = ref<CalendarView>('week');
const date = ref(Temporal.PlainDate.from('2026-06-15'));

function regenerate() {
  const t0 = performance.now();
  events.value = makeEvents(eventCount.value);
  generationMs.value = performance.now() - t0;
  generatedAt.value = Date.now();
}
regenerate();

const { builder, api } = useCalendar();
builder
  .events(events)
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .timeRange({ startMinutes: 6 * 60, endMinutes: 22 * 60 })
  .slotDuration(15);

const visibleEventsCount = computed(() => api.getVisibleEvents().length);

// Optional filter pinch — exercises eventRenderer & layout reflow on
// a synthetic data change without remounting the calendar.
const filtered = ref<boolean>(false);
function toggleFilter() {
  filtered.value = !filtered.value;
  if (filtered.value) {
    events.value = events.value.filter((_, i) => i % 10 === 0);
  } else {
    regenerate();
  }
}
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — performance bench</h1>
      <p>
        Manual smoke test for the calendar's hot paths. Pick a count, regenerate, then
        scroll, switch view, drag an event. Targets are in the source
        comment at the top of this file.
      </p>
    </header>
    <div class="page__controls">
      <label>
        Events
        <CoarSegmentedControl
          v-model="eventCount"
          :options="COUNT_OPTIONS"
          size="s"
          @change="regenerate"
        />
      </label>
      <button class="btn" @click="regenerate">Regenerate</button>
      <button class="btn" @click="toggleFilter">
        {{ filtered ? 'Restore all' : 'Filter to ~10 %' }}
      </button>
      <span class="stat">
        Generation: <strong>{{ generationMs.toFixed(1) }} ms</strong>
      </span>
      <span class="stat">
        In data: <strong>{{ events.length }}</strong>
      </span>
      <span class="stat">
        Visible window: <strong>{{ visibleEventsCount }}</strong>
      </span>
    </div>
    <div class="page__calendar">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 12px; height: 100%; }
.page__header h1 { margin: 0 0 4px; }
.page__header p { margin: 0; color: #555; }
.page__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  background: #f6f7f9;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
}
.page__controls label { display: inline-flex; align-items: center; gap: 8px; }
.btn {
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.btn:hover { background: #f3f4f6; }
.stat { color: #555; font-size: 12px; }
.stat strong { color: #111; font-variant-numeric: tabular-nums; }
.page__calendar {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  min-height: 600px;
}
</style>
