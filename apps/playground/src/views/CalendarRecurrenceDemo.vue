<script setup lang="ts">
/**
 * Recurrence demo (Phase 4).
 *
 * Shows the three integration paths:
 *   1. `builder.series([...])` — reactive in-memory series source.
 *   2. `builder.seriesLoader(window=>...)` — calendar-managed
 *      per-window fetch (cached).
 *   3. Composition with `builder.events([...])` — non-recurring
 *      events merged with expanded occurrences.
 *
 * Plus: DstPolicy effect on a 02:30 daily series across the
 * spring-forward day (2026-03-29 in Europe/Vienna), and
 * `getRecurrenceMeta()` for inspecting provenance.
 */

import { ref, computed } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type DstPolicy,
  type RecurringSeries,
  type CalendarView,
} from '@cocoar/vue-calendar';
import { getRecurrenceMeta } from '@cocoar/vue-calendar/recurrence';

const log = ref<string[]>([]);
function pushLog(line: string): void {
  log.value.unshift(`${new Date().toLocaleTimeString()}  ${line}`);
  if (log.value.length > 12) log.value.length = 12;
}

// ─── Source data ─────────────────────────────────────────────────

const standup: RecurringSeries = {
  id: 'standup',
  rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  dtstart: Temporal.ZonedDateTime.from(
    '2026-06-01T09:00:00[Europe/Vienna]',
  ),
  duration: { minutes: 30 },
  meta: { title: 'Standup', color: '#4f46e5' },
};

const sprintReview: RecurringSeries = {
  id: 'sprint-review',
  rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR',
  dtstart: Temporal.ZonedDateTime.from(
    '2026-06-05T15:00:00[Europe/Vienna]',
  ),
  duration: { hours: 1 },
  meta: { title: 'Sprint Review', color: '#06b6d4' },
};

const allDayHoliday: RecurringSeries = {
  id: 'public-holiday',
  rrule: 'FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=15',
  dtstart: Temporal.PlainDate.from('2026-08-15'),
  meta: { title: 'Mariä Himmelfahrt', color: '#10b981' },
};

const oneOffMeeting: CalendarEvent = {
  id: 'kickoff',
  start: Temporal.ZonedDateTime.from('2026-06-08T11:00:00[Europe/Vienna]'),
  end: Temporal.ZonedDateTime.from('2026-06-08T12:30:00[Europe/Vienna]'),
  meta: { title: 'Project Kickoff', color: '#f59e0b' },
};

// ─── Reactive controls ───────────────────────────────────────────

const seriesSource = ref<RecurringSeries[]>([
  standup,
  sprintReview,
  allDayHoliday,
]);

const dstPolicyValue = ref<DstPolicy>('compatible');
const showOneOff = ref(true);
const currentView = ref<CalendarView>('month');
const cursor = ref<Temporal.PlainDate>(Temporal.PlainDate.from('2026-06-15'));

const events = computed<CalendarEvent[]>(() =>
  showOneOff.value ? [oneOffMeeting] : [],
);

// ─── Builder ─────────────────────────────────────────────────────

const { builder, api } = useCalendar();
builder
  .events(events)
  .series(seriesSource)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .view(currentView)
  .date(cursor)
  .dstPolicy(dstPolicyValue)
  .onEventClick(({ event }) => {
    const title = (event.meta as { title?: string } | undefined)?.title ?? event.id;
    const meta = getRecurrenceMeta(event);
    if (meta) {
      const id =
        meta.recurrenceId instanceof Temporal.ZonedDateTime
          ? meta.recurrenceId.toString()
          : meta.recurrenceId.toString();
      pushLog(
        `click: ${title} (series=${meta.seriesId}, source=${meta.source}, recurrenceId=${id})`,
      );
    } else {
      pushLog(`click: ${title} (one-off)`);
    }
  })
  .onRangeChange((window) => {
    pushLog(
      `range: ${window.view} ${window.start}..${window.end} (${window.timezone})`,
    );
  });

// ─── Action helpers (test the reactive surface) ──────────────────

function addSeries(): void {
  const id = `extra-${seriesSource.value.length}`;
  seriesSource.value = [
    ...seriesSource.value,
    {
      id,
      rrule: 'FREQ=DAILY;COUNT=3',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-10T13:00:00[Europe/Vienna]',
      ),
      duration: { minutes: 45 },
      meta: { title: `Extra ${id}`, color: '#ec4899' },
    },
  ];
  pushLog(`added series '${id}' — reactive watcher should re-expand`);
}

function clearSeries(): void {
  seriesSource.value = [];
  pushLog(`cleared all series`);
}

function resetSeries(): void {
  seriesSource.value = [standup, sprintReview, allDayHoliday];
  pushLog(`reset to default series set`);
}

function jumpToSpringForward(): void {
  cursor.value = Temporal.PlainDate.from('2026-03-29');
  currentView.value = 'week';
  pushLog(`jumped to 2026-03-29 (DST spring-forward day in Vienna)`);
}

const totalVisible = computed(() => api.getVisibleEvents().length);
const recurringCount = computed(
  () =>
    api.getVisibleEvents().filter((e) => getRecurrenceMeta(e) !== null).length,
);
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — Recurrence (Phase 4)</h1>
      <p>
        Recurring series via <code>builder.series([...])</code>. Reactive —
        mutating the source ref re-expands. Composes with
        <code>builder.events([...])</code>. <code>DstPolicy</code> applied
        uniformly via the post-processing layer (<code>dst-resolve.ts</code>).
        Click any event to see its <code>__recurrence</code> provenance.
      </p>
    </header>

    <div class="page__controls">
      <div class="ctrl">
        <label>DST policy:</label>
        <select v-model="dstPolicyValue">
          <option value="compatible">compatible</option>
          <option value="reject">reject</option>
          <option value="earlier">earlier</option>
          <option value="later">later</option>
        </select>
      </div>
      <div class="ctrl">
        <label>
          <input v-model="showOneOff" type="checkbox" />
          Include one-off event
        </label>
      </div>
      <div class="ctrl ctrl--actions">
        <button type="button" @click="addSeries">+ Add series</button>
        <button type="button" @click="clearSeries">Clear all series</button>
        <button type="button" @click="resetSeries">Reset</button>
        <button type="button" @click="jumpToSpringForward">
          Jump to DST day
        </button>
      </div>
    </div>

    <div class="page__layout">
      <div class="page__calendar">
        <CoarCalendar :builder="builder" />
      </div>
      <aside class="page__side">
        <div class="page__stats">
          <div>Visible: <strong>{{ totalVisible }}</strong></div>
          <div>Recurring: <strong>{{ recurringCount }}</strong></div>
          <div>One-off: <strong>{{ totalVisible - recurringCount }}</strong></div>
        </div>
        <h3>Event log</h3>
        <ul>
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}
.page__header h1 {
  margin: 0 0 4px;
}
.page__controls {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 6px;
}
.ctrl {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.ctrl--actions {
  margin-left: auto;
  gap: 8px;
}
.ctrl button {
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}
.ctrl button:hover {
  background: #f9fafb;
}
.page__layout {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 600px;
}
.page__calendar {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}
.page__side {
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.page__stats {
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.page__side h3 {
  margin: 0;
  font-size: 13px;
}
.page__side ul {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.4;
  flex: 1;
  overflow: auto;
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
}
.page__side li {
  padding: 4px 0;
  border-bottom: 1px solid #e5e7eb;
}
</style>
