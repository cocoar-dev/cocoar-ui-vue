<script setup lang="ts">
/**
 * Phase 2.3 — Month view demo.
 *
 * Live `<CoarMonthView>` showing a realistic month with:
 *   - Multi-day all-day events (conferences, OOO, holidays)
 *   - Multi-day events spanning across week boundaries
 *   - Single-day all-day events
 *   - Timed events as cell pills (no time, just title)
 *   - Heavy day with "+N more" overflow link
 *   - Today highlighted, leading/trailing days greyed, weekends shaded
 *   - Locale + firstDayOfWeek switcher
 */

import { computed, ref } from 'vue';
import {
  CoarMonthView,
  type CalendarEvent,
  type DayOfWeek,
} from '@cocoar/vue-calendar';

const cursor = ref('2026-04-15');
const firstDayOfWeek = ref<DayOfWeek>(1);
const maxEventsPerCell = ref(3);
const density = ref<'comfortable' | 'compact'>('comfortable');
const locale = ref('en-US');

const events = computed<CalendarEvent[]>(() => [
  // Multi-day all-day events
  {
    id: 'devconf',
    start: '2026-04-13',
    end: '2026-04-16', // exclusive → Mon-Wed
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  {
    id: 'easter-monday',
    start: '2026-04-13',
    meta: { title: 'Easter Monday', color: '#10b981' },
  },
  {
    id: 'sven-ooo',
    start: '2026-04-15',
    end: '2026-04-18',
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  },
  // Multi-day spanning across two week rows
  {
    id: 'team-offsite',
    start: '2026-04-22',
    end: '2026-04-28', // Wed-Mon, crosses Sun→Mon
    meta: { title: 'Team offsite', color: '#0891b2' },
  },
  // Daily standups Mon-Fri (4 weeks)
  ...['2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: `${d}T09:00:00Z`,
      end: `${d}T09:30:00Z`,
      meta: { title: 'Standup', color: '#10b981' },
    }),
  ),
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: `${d}T09:00:00Z`,
      end: `${d}T09:30:00Z`,
      meta: { title: 'Standup', color: '#06b6d4' },
    }),
  ),
  ...['2026-04-20', '2026-04-21'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: `${d}T09:00:00Z`,
      end: `${d}T09:30:00Z`,
      meta: { title: 'Standup', color: '#8b5cf6' },
    }),
  ),
  ...['2026-04-29', '2026-04-30'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: `${d}T09:00:00Z`,
      end: `${d}T09:30:00Z`,
      meta: { title: 'Standup', color: '#ec4899' },
    }),
  ),
  // Wed Apr 15: heavy day to trigger "+N more"
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
    meta: { title: 'Pair: calendar', color: '#f59e0b' },
  },
  {
    id: 'wed-lunch',
    start: '2026-04-15T12:00:00Z',
    end: '2026-04-15T13:00:00Z',
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
  {
    id: 'wed-1on1',
    start: '2026-04-15T15:00:00Z',
    end: '2026-04-15T15:45:00Z',
    meta: { title: '1:1 with Bernhard', color: '#3b82f6' },
  },
  {
    id: 'wed-retro',
    start: '2026-04-15T16:30:00Z',
    end: '2026-04-15T17:30:00Z',
    meta: { title: 'Retro', color: '#dc2626' },
  },
  // Fri client demo
  {
    id: 'fri-demo',
    start: '2026-04-17T15:00:00Z',
    end: '2026-04-17T16:30:00Z',
    meta: { title: 'Client demo', color: '#dc2626' },
  },
  // Quarter review (multi-day, weekend overlap)
  {
    id: 'quarter-review',
    start: '2026-04-29',
    end: '2026-05-02',
    meta: { title: 'Quarterly review', color: '#2563eb' },
  },
  // Cross-month event from late March → early April (testing
  // leading-days clipping)
  {
    id: 'easter',
    start: '2026-04-03',
    end: '2026-04-07', // Fri-Mon
    meta: { title: 'Easter break', color: '#84cc16' },
  },
]);

const clicks = ref<{ kind: string; label: string; when: string }[]>([]);
function pushClick(kind: string, label: string) {
  clicks.value.unshift({ kind, label, when: new Date().toLocaleTimeString() });
  if (clicks.value.length > 8) clicks.value.length = 8;
}

function onDateClick(p: { date: { toString(): string } }) {
  pushClick('date', p.date.toString());
}
function onEventClick(p: { event: CalendarEvent }) {
  const title = (p.event.meta as { title?: string } | undefined)?.title ?? p.event.id;
  pushClick('event', title);
}
function onMoreClick(p: { date: { toString(): string }; events: CalendarEvent[] }) {
  pushClick(
    'more',
    `${p.date.toString()} → ${p.events.length} more events`,
  );
}

function nudge(direction: -1 | 1) {
  const d = new Date(cursor.value + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + direction);
  cursor.value = d.toISOString().slice(0, 10);
}
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 2.3 — Month View</h1>
      <p>
        6 × 7 grid with multi-day bars per week row and "+N more"
        overflow on busy cells. Multi-day events spanning across
        week boundaries are split into one bar per row, each
        clipped to its row.
      </p>
    </header>

    <div class="controls">
      <button class="btn" @click="nudge(-1)">← prev month</button>
      <input v-model="cursor" type="date" />
      <button class="btn" @click="nudge(1)">next month →</button>
      <span class="divider" />
      <label>
        Week starts:
        <select v-model.number="firstDayOfWeek">
          <option :value="0">Sun</option>
          <option :value="1">Mon (ISO)</option>
          <option :value="6">Sat</option>
        </select>
      </label>
      <label>
        Max events / cell:
        <select v-model.number="maxEventsPerCell">
          <option :value="2">2</option>
          <option :value="3">3</option>
          <option :value="4">4</option>
          <option :value="5">5</option>
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

    <CoarMonthView
      :cursor="cursor"
      :events="events"
      :first-day-of-week="firstDayOfWeek"
      :max-events-per-cell="maxEventsPerCell"
      :density="density"
      :locale="locale"
      timezone="UTC"
      @date-click="onDateClick"
      @event-click="onEventClick"
      @more-click="onMoreClick"
    />

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
        Click anywhere on the grid to log here. "+N more" link is
        shown when a cell has more events than the limit; we don't
        render the popover yet (Phase 2.3e), but the click is
        captured.
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
.divider { width: 1px; height: 20px; background: #e3e5e9; margin: 0 4px; }

.click-log h2 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6c7280;
  margin: 0 0 8px 0;
}
.click-log ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.click-log li { display: flex; gap: 12px; font-size: 13px; font-variant-numeric: tabular-nums; }
.click-log strong {
  text-transform: uppercase; font-size: 11px; color: #6c7280; min-width: 50px;
}
.click-log__label { flex: 1; color: #1a1c1f; }
.click-log__time { color: #6c7280; font-size: 12px; }
.click-log__empty { font-size: 13px; color: #9ca3af; margin: 0; }
</style>
