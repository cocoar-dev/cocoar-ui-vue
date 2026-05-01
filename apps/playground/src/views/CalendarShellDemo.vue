<script setup lang="ts">
/**
 * Phase 2.5 — Top-level <CoarCalendar> shell demo.
 *
 * Single component, all four views, full navigation. The same
 * event set drives every view; switching views via the segmented
 * control or the imperative API both work.
 */

import { computed, ref } from 'vue';
import {
  CoarCalendar,
  type CalendarEvent,
  type CalendarView,
  type ViewWindow,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref('2026-04-15');
const locale = ref('en-US');
const density = ref<'comfortable' | 'compact'>('comfortable');

// Time-range demo toggle: full 24h vs. 8 AM – 6 PM working hours.
const workingHoursOnly = ref(false);
const timeRange = computed<[number, number]>(() =>
  workingHoursOnly.value ? [8, 18] : [0, 24],
);

// Sample event set across April 2026: timed, all-day, multi-day,
// daily standups Mon-Fri.
// Mutable ref so DnD drops can replace start/end in place.
const events = ref<CalendarEvent[]>(buildInitialEvents());

function buildInitialEvents(): CalendarEvent[] {
  const out: CalendarEvent[] = [];

  // Daily standups Mon-Fri across April.
  const apr1 = new Date('2026-04-01T00:00:00Z');
  for (let day = 0; day < 30; day++) {
    const d = new Date(apr1.getTime() + day * 86400_000);
    const dow = d.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      const iso = d.toISOString().slice(0, 10);
      out.push({
        id: `standup-${iso}`,
        start: `${iso}T09:00:00Z`,
        end: `${iso}T09:30:00Z`,
        meta: { title: 'Daily standup', color: '#10b981' },
      });
    }
  }

  // Multi-day all-day
  out.push({
    id: 'devconf',
    start: '2026-04-13',
    end: '2026-04-16',
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  });
  out.push({
    id: 'sven-ooo',
    start: '2026-04-15',
    end: '2026-04-18',
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  });

  // Timed events
  const samples: Array<[string, string, string, string, string]> = [
    ['2026-04-15T11:00:00Z', '2026-04-15T12:30:00Z', 'Design review', '#8b5cf6', 'design'],
    ['2026-04-15T12:00:00Z', '2026-04-15T13:00:00Z', 'Lunch with Anna', '#ef4444', 'lunch-anna'],
    ['2026-04-15T15:00:00Z', '2026-04-15T15:45:00Z', '1:1 with Bernhard', '#3b82f6', '1on1-bw'],
    ['2026-04-16T09:00:00Z', '2026-04-16T13:00:00Z', 'Deep work — Calendar', '#2563eb', 'deepwork-cal'],
    ['2026-04-17T15:00:00Z', '2026-04-17T16:30:00Z', 'Client demo', '#dc2626', 'client-demo-1'],
    ['2026-04-22T10:00:00Z', '2026-04-22T11:00:00Z', 'Architecture sync', '#f59e0b', 'arch-sync'],
    ['2026-04-23T14:00:00Z', '2026-04-23T15:00:00Z', 'Customer call', '#0891b2', 'cust-call-1'],
    ['2026-04-29T09:00:00Z', '2026-04-29T10:30:00Z', 'Quarterly review', '#2563eb', 'qr-review'],
  ];
  for (const [start, end, title, color, id] of samples) {
    out.push({ id, start, end, meta: { title, color } });
  }

  return out;
}

// Click log to demonstrate event forwarding.
const log = ref<{ kind: string; label: string; when: string }[]>([]);
function pushLog(kind: string, label: string) {
  log.value.unshift({ kind, label, when: new Date().toLocaleTimeString() });
  if (log.value.length > 8) log.value.length = 8;
}
function onEventClick(p: { event: CalendarEvent }) {
  const t = (p.event.meta as { title?: string } | undefined)?.title ?? p.event.id;
  pushLog('event', t);
}
function onDateClick(p: { date: { toString(): string } }) {
  pushLog('date', p.date.toString());
}
function onTimeClick(p: { date: { toString(): string }; time: { toString(): string } }) {
  pushLog('time', `${p.date.toString()} ${p.time.toString()}`);
}
function onEventDrop(p: {
  event: CalendarEvent;
  next: { start: string; end?: string };
  target: { date: string; minutes: number };
}) {
  const idx = events.value.findIndex((e) => e.id === p.event.id);
  if (idx < 0) return;
  // Replace the event's start/end in place. Cloning the array
  // makes Vue's reactivity emit a fresh reference for downstream
  // computeds (event index, layout, etc.).
  const updated: CalendarEvent = {
    ...p.event,
    start: p.next.start,
    end: p.next.end,
  };
  events.value = [
    ...events.value.slice(0, idx),
    updated,
    ...events.value.slice(idx + 1),
  ];
  const title = (p.event.meta as { title?: string } | undefined)?.title ?? p.event.id;
  pushLog('drop', `${title} → ${p.target.date} ${String(Math.floor(p.target.minutes / 60)).padStart(2, '0')}:${String(p.target.minutes % 60).padStart(2, '0')}`);
}
const visibleRange = ref<ViewWindow | null>(null);
function onRangeChange(w: ViewWindow) {
  visibleRange.value = w;
}
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 2.5 — &lt;CoarCalendar&gt; shell</h1>
      <p>
        Top-level component wiring all four views (Day / Week / Month /
        Agenda) with prev / today / next navigation and a v-model:view +
        v-model:date pair. The same <code>events</code> array drives
        every view; switch via the segmented control or the imperative
        API.
      </p>
    </header>

    <div class="extra-controls">
      <label>
        Locale:
        <select v-model="locale">
          <option value="en-US">en-US</option>
          <option value="de-AT">de-AT</option>
          <option value="ja-JP">ja-JP</option>
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
        <input v-model="workingHoursOnly" type="checkbox" />
        Working hours only (8 AM – 6 PM)
      </label>
      <span class="muted" v-if="visibleRange">
        Visible: <code>{{ visibleRange.start }}</code> →
        <code>{{ visibleRange.end }}</code>
      </span>
    </div>

    <div class="calendar-host">
      <CoarCalendar
        v-model:view="view"
        v-model:date="date"
        :events="events"
        :locale="locale"
        :density="density"
        :time-range="timeRange"
        timezone="UTC"
        @event-click="onEventClick"
        @date-click="onDateClick"
        @time-click="onTimeClick"
        @event-drop="onEventDrop"
        @range-change="onRangeChange"
      />
    </div>

    <div class="click-log">
      <h2>Recent interactions</h2>
      <ul v-if="log.length > 0">
        <li v-for="(c, i) in log" :key="i">
          <strong>{{ c.kind }}</strong>
          <span>{{ c.label }}</span>
          <span class="when">{{ c.when }}</span>
        </li>
      </ul>
      <p v-else class="muted">Click any cell, time slot, or event to log here.</p>
    </div>
  </div>
</template>

<style scoped>
.view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
}
.view__header h1 { margin: 0 0 4px 0; font-size: 22px; }
.view__header p {
  margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;
}
.view__header code {
  background: #f3f4f6; padding: 1px 4px; border-radius: 3px;
}

.extra-controls {
  display: flex; gap: 16px; align-items: center;
  font-size: 13px; color: #4b5563;
}
.extra-controls select {
  padding: 2px 6px; font-size: 13px;
  border: 1px solid #d1d5db; border-radius: 4px; background: #fff;
}

.calendar-host {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  height: 700px;
}

.muted { color: #9ca3af; }
.muted code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }

.click-log h2 {
  font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em;
  color: #6c7280; margin: 0 0 8px 0;
}
.click-log ul {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.click-log li {
  display: flex; gap: 12px; font-size: 13px; font-variant-numeric: tabular-nums;
}
.click-log strong {
  text-transform: uppercase; font-size: 11px; color: #6c7280; min-width: 50px;
}
.click-log .when { color: #6c7280; font-size: 12px; }
</style>
