<script setup lang="ts">
/**
 * Phase 2.2 — Week view demo.
 *
 * Live `<CoarWeekView>` rendering a realistic calendar week with:
 *   - Recurring-style daily standup
 *   - Multi-day all-day events (Mon-Wed conference)
 *   - Single all-day events (holidays, OOO)
 *   - 3-deep overlap on a busy day
 *   - Touching-at-boundary events (no conflict)
 *   - Events spanning across midnight
 *   - Weekend highlighting
 *
 * Locale switcher and firstDayOfWeek toggle so the user sees the
 * column re-orders correctly.
 */

import { computed, ref } from 'vue';
import {
  CoarWeekView,
  type CalendarEvent,
  type DayOfWeek,
} from '@cocoar/vue-calendar';

const cursor = ref('2026-04-15');
const firstDayOfWeek = ref<DayOfWeek>(1);
const timeRangeStart = ref(7);
const timeRangeEnd = ref(20);
const slotDuration = ref<5 | 10 | 15 | 30 | 60>(30);
const density = ref<'comfortable' | 'compact'>('comfortable');
const locale = ref('en-US');

const timeRange = computed<[number, number]>(() => [
  timeRangeStart.value,
  timeRangeEnd.value,
]);

const events = computed<CalendarEvent[]>(() => [
  // Multi-day all-day: Mon–Wed conference
  {
    id: 'devconf',
    start: '2026-04-13',
    end: '2026-04-16', // exclusive → Mon, Tue, Wed inclusive
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  // Single-day all-day: Mon holiday
  {
    id: 'easter-monday',
    start: '2026-04-13',
    meta: { title: 'Easter Monday (PT branch)', color: '#10b981' },
  },
  // Multi-day all-day: Wed–Fri OOO
  {
    id: 'sven-ooo',
    start: '2026-04-15',
    end: '2026-04-18',
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  },
  // Daily standup Mon-Fri
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17'].map(
    (d, i): CalendarEvent => ({
      id: `standup-${d}`,
      start: `${d}T09:00:00Z`,
      end: `${d}T09:30:00Z`,
      meta: { title: 'Daily standup', color: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899'][i] },
    }),
  ),
  // Wed busy day — 3-deep overlap
  {
    id: 'wed-design',
    start: '2026-04-15T11:00:00Z',
    end: '2026-04-15T12:30:00Z',
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'wed-pair',
    start: '2026-04-15T11:30:00Z',
    end: '2026-04-15T13:00:00Z',
    meta: { title: 'Pair: Calendar week view', color: '#f59e0b' },
  },
  {
    id: 'wed-lunch',
    start: '2026-04-15T12:00:00Z',
    end: '2026-04-15T13:00:00Z',
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
  // Tue 1:1
  {
    id: 'tue-1-1',
    start: '2026-04-14T14:00:00Z',
    end: '2026-04-14T14:45:00Z',
    meta: { title: '1:1 with Bernhard', color: '#3b82f6' },
  },
  // Thu deep work block
  {
    id: 'thu-deep',
    start: '2026-04-16T09:00:00Z',
    end: '2026-04-16T13:00:00Z',
    meta: { title: 'Deep work — Calendar', color: '#2563eb' },
  },
  // Fri client demo
  {
    id: 'fri-demo',
    start: '2026-04-17T15:00:00Z',
    end: '2026-04-17T16:30:00Z',
    meta: { title: 'Client demo', color: '#dc2626' },
  },
  // Sat overnight on-call (spans midnight into Sun)
  {
    id: 'sat-oncall',
    start: '2026-04-18T22:00:00Z',
    end: '2026-04-19T03:00:00Z',
    meta: { title: 'On-call shift', color: '#0891b2' },
  },
  // Sun late workshop (clipped at bottom)
  {
    id: 'sun-workshop',
    start: '2026-04-19T18:00:00Z',
    end: '2026-04-19T22:30:00Z',
    meta: { title: 'Community workshop', color: '#84cc16' },
  },
]);

// Click logging
const clicks = ref<{ kind: 'time' | 'date' | 'event'; label: string; when: string }[]>([]);

function pushClick(kind: 'time' | 'date' | 'event', label: string) {
  clicks.value.unshift({ kind, label, when: new Date().toLocaleTimeString() });
  if (clicks.value.length > 8) clicks.value.length = 8;
}

function onTimeClick(p: { date: { toString(): string }; time: { toString(): string } }) {
  pushClick('time', `${p.date.toString()} ${p.time.toString().slice(0, 5)}`);
}
function onDateClick(p: { date: { toString(): string } }) {
  pushClick('date', `${p.date.toString()} (all-day)`);
}
function onEventClick(p: { event: CalendarEvent }) {
  const title = (p.event.meta as { title?: string } | undefined)?.title ?? p.event.id;
  pushClick('event', title);
}

function nudge(direction: -1 | 1) {
  const d = new Date(cursor.value + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 7 * direction);
  cursor.value = d.toISOString().slice(0, 10);
}
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 2.2 — Week View</h1>
      <p>
        7-day grid with all-day band on top. Reuses
        <code>&lt;CoarTimeGrid&gt;</code> from Phase 2.1 — a thin
        wrapper supplying <code>days = weekDates(cursor, fdow)</code>.
      </p>
    </header>

    <div class="controls">
      <button class="btn" @click="nudge(-1)">← prev</button>
      <input v-model="cursor" type="date" />
      <button class="btn" @click="nudge(1)">next →</button>
      <span class="divider" />
      <label>
        Week starts:
        <select v-model.number="firstDayOfWeek">
          <option :value="0">Sunday</option>
          <option :value="1">Monday (ISO)</option>
          <option :value="6">Saturday</option>
        </select>
      </label>
      <span class="divider" />
      <label>
        Time:
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

    <div class="week-host">
      <CoarWeekView
        :cursor="cursor"
        :events="events"
        :first-day-of-week="firstDayOfWeek"
        :time-range="timeRange"
        :slot-duration="slotDuration"
        :density="density"
        :locale="locale"
        timezone="UTC"
        @time-click="onTimeClick"
        @date-click="onDateClick"
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
        Click anywhere on the grid (slot, day cell, or event) to see entries.
      </p>
    </div>
  </div>
</template>

<style scoped>
.view {
  max-width: 1300px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
}
.view__header h1 { margin: 0 0 4px 0; font-size: 22px; }
.view__header p { margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5; }
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
.controls label { display: flex; align-items: center; gap: 4px; }
.controls select,
.controls input {
  padding: 2px 6px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
}
.btn {
  padding: 4px 10px;
  font-size: 13px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
}
.btn:hover { background: #f3f4f6; }
.divider {
  width: 1px; height: 20px; background: #e3e5e9; margin: 0 4px;
}

.week-host {
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
.click-log ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.click-log li {
  display: flex; gap: 12px; font-size: 13px; font-variant-numeric: tabular-nums;
}
.click-log strong {
  text-transform: uppercase; font-size: 11px; color: #6c7280; min-width: 50px;
}
.click-log__label { flex: 1; color: #1a1c1f; }
.click-log__time { color: #6c7280; font-size: 12px; }
.click-log__empty { font-size: 13px; color: #9ca3af; margin: 0; }
</style>
