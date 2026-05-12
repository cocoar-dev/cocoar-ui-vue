<script setup lang="ts">
/**
 * Performance bench — timeline view with 1000+ tasks.
 *
 * Mirrors `CalendarPerfBenchDemo.vue` but anchored on the timeline
 * view, which is what a TimeTodo-style "1000 active todos" workload
 * actually renders. The timeline's row-virtualization keeps DOM
 * cost ~constant regardless of count; this page lets you eyeball
 * scroll/pan smoothness against real volumes.
 *
 * Fixture mix:
 *   - Mostly one-off tasks (TimeTodo's typical shape — single
 *     deliverable with a due date).
 *   - A handful of recurring series (sprint reviews, weekly
 *     check-ins) to exercise the group-into-one-row path at scale.
 *
 * Targets (Tier A laptop):
 *   - mount + first paint with 1000 tasks ≤ 250 ms
 *   - wheel scroll over the timeline       ≥ 50 fps
 *   - pan drag                             ≥ 50 fps
 *   - regenerate 100 → 2500                ≤ 200 ms
 */

import { computed, ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type CalendarView,
  type RecurringSeries,
} from '@cocoar/vue-calendar';
import { CoarSegmentedControl } from '@cocoar/vue-ui';

const COUNT_OPTIONS = [
  { value: 100, label: '100' },
  { value: 500, label: '500' },
  { value: 1000, label: '1 000' },
  { value: 2500, label: '2 500' },
];

const taskCount = ref<number>(1000);
const generationMs = ref<number>(0);

const COLORS = ['#2563eb', '#ef4444', '#a855f7', '#f59e0b', '#10b981', '#06b6d4', '#ec4899'];

function makeOneOffs(count: number): CalendarEvent[] {
  const SEED_DAY = Temporal.PlainDate.from('2026-06-01');
  const out: CalendarEvent[] = [];
  for (let i = 0; i < count; i++) {
    // Spread across ~90 days so each day holds ~count/90 tasks.
    const dayOffset = i % 90;
    const day = SEED_DAY.add({ days: dayOffset });
    // Mostly all-day "tasks", random 1–5 day spans.
    const spanDays = 1 + ((i * 13) % 5);
    out.push({
      id: `task-${i}`,
      start: day,
      end: day.add({ days: spanDays }),
      meta: {
        title: `Task #${i}`,
        color: COLORS[i % COLORS.length],
      },
    });
  }
  return out;
}

/** A handful of recurring series to exercise the group-into-one-row
 *  path at scale. Six series, each with different RRULE shapes. */
function makeSeries(): RecurringSeries[] {
  return [
    {
      id: 'standup',
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      dtstart: Temporal.ZonedDateTime.from('2026-06-01T09:00:00[Europe/Vienna]'),
      duration: { minutes: 30 },
      meta: { title: 'Daily standup', color: '#4f46e5' },
    },
    {
      id: 'sprint-review',
      rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR',
      dtstart: Temporal.ZonedDateTime.from('2026-06-05T15:00:00[Europe/Vienna]'),
      duration: { hours: 1 },
      meta: { title: 'Sprint review', color: '#06b6d4' },
    },
    {
      id: 'one-on-one',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      dtstart: Temporal.ZonedDateTime.from('2026-06-02T11:00:00[Europe/Vienna]'),
      duration: { minutes: 45 },
      meta: { title: '1:1 with manager', color: '#f59e0b' },
    },
    {
      id: 'release-cadence',
      rrule: 'FREQ=MONTHLY;BYDAY=2TH',
      dtstart: Temporal.ZonedDateTime.from('2026-06-11T14:00:00[Europe/Vienna]'),
      duration: { hours: 2 },
      meta: { title: 'Release window', color: '#ef4444' },
    },
    {
      id: 'retro',
      rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR',
      dtstart: Temporal.ZonedDateTime.from('2026-06-12T16:00:00[Europe/Vienna]'),
      duration: { hours: 1 },
      meta: { title: 'Sprint retro', color: '#a855f7' },
    },
    {
      id: 'office-day',
      rrule: 'FREQ=WEEKLY;BYDAY=TU,TH',
      dtstart: Temporal.PlainDate.from('2026-06-02'),
      duration: { days: 1 },
      meta: { title: 'Office day', color: '#ec4899' },
    },
  ];
}

const events = ref<CalendarEvent[]>([]);
const series = ref<RecurringSeries[]>([]);
const view = ref<CalendarView>('timeline');
const date = ref(Temporal.PlainDate.from('2026-06-01'));

function regenerate(): void {
  const t0 = performance.now();
  // Subtract ~6 (number of series) from the one-off budget so the
  // total visible "lines" matches the selected count better — the
  // 6 recurring series contribute 6 rows that hold many bars each.
  const oneOffCount = Math.max(0, taskCount.value - 6);
  events.value = makeOneOffs(oneOffCount);
  series.value = makeSeries();
  generationMs.value = performance.now() - t0;
}
regenerate();

const { builder, api } = useCalendar();
builder
  .events(events)
  .series(series)
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .timelineRangeDays(90)
  .timelinePixelsPerDay(48);

const visibleCount = computed(() => api.getVisibleEvents().length);

function jumpToToday(): void {
  api.goToToday();
}
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — timeline performance bench</h1>
      <p>
        Manual smoke test for the timeline view at TimeTodo-style volumes.
        Pick a count, regenerate, then scroll/pan the timeline. With row
        virtualization, DOM cost should stay ~constant regardless of
        total task count.
      </p>
    </header>
    <div class="page__controls">
      <label>
        Tasks
        <CoarSegmentedControl
          v-model="taskCount"
          :options="COUNT_OPTIONS"
          size="s"
          @change="regenerate"
        />
      </label>
      <button class="btn" @click="regenerate">Regenerate</button>
      <button class="btn" @click="jumpToToday">Today</button>
      <span class="stat">
        Generation: <strong>{{ generationMs.toFixed(1) }} ms</strong>
      </span>
      <span class="stat">
        Tasks: <strong>{{ events.length }}</strong>
      </span>
      <span class="stat">
        Series: <strong>{{ series.length }}</strong>
      </span>
      <span class="stat">
        Visible: <strong>{{ visibleCount }}</strong>
      </span>
    </div>
    <div class="page__calendar">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}
.page__header h1 {
  margin: 0 0 4px;
}
.page__header p {
  margin: 0;
  color: #555;
}
.page__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 13px;
}
.page__controls label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn {
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}
.btn:hover {
  background: #f9fafb;
}
.stat {
  color: #555;
}
.stat strong {
  color: #111;
  font-variant-numeric: tabular-nums;
}
.page__calendar {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  min-height: 600px;
}
</style>
