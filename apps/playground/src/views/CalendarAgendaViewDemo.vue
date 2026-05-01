<script setup lang="ts">
/**
 * Phase 2.4 — Agenda view demo.
 *
 * Live `<CoarAgendaView>` showing 60+ events across a 60-day
 * window:
 *   - Daily standups (Mon-Fri)
 *   - All-day events (holidays, OOO)
 *   - Multi-day events (conferences, vacations) — appear on every
 *     day they touch with `(cont.)` tag
 *   - Weekly recurring style mockup (we don't expand RRULE here;
 *     just literally repeated events to validate the list)
 *   - Events with descriptive titles + colors
 *
 * Sticky day headers stay pinned as you scroll.
 */

import { computed, ref, useTemplateRef } from 'vue';
import {
  CoarAgendaView,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const today = new Date('2026-04-01T00:00:00Z');

function dateNDaysAfter(n: number): string {
  const d = new Date(today.getTime() + n * 86400_000);
  return d.toISOString().slice(0, 10);
}

const rangeStart = ref(dateNDaysAfter(0));
const rangeEnd = ref(dateNDaysAfter(60));
const showEmptyDays = ref(false);
const density = ref<'comfortable' | 'compact'>('comfortable');
const locale = ref('en-US');

// Build a synthetic month+ of events.
const events = computed<CalendarEvent[]>(() => {
  const out: CalendarEvent[] = [];

  // Daily standups Mon-Fri across 60 days.
  for (let day = 0; day < 60; day++) {
    const d = new Date(today.getTime() + day * 86400_000);
    const dow = d.getUTCDay(); // 0=Sun..6=Sat
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

  // Multi-day all-day: DevConf Apr 13-15
  out.push({
    id: 'devconf',
    start: '2026-04-13',
    end: '2026-04-16',
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  });

  // Single-day all-day: holiday
  out.push({
    id: 'easter-mon',
    start: '2026-04-13',
    meta: { title: 'Easter Monday (PT branch)', color: '#10b981' },
  });

  // Multi-day OOO
  out.push({
    id: 'sven-ooo',
    start: '2026-04-15',
    end: '2026-04-18',
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  });

  // Vacation week
  out.push({
    id: 'vacation',
    start: '2026-05-04',
    end: '2026-05-11',
    meta: { title: 'Maria — vacation', color: '#06b6d4' },
  });

  // Sample timed events scattered across the range
  const samples: Array<[string, string, string, string, string]> = [
    ['2026-04-15T11:00:00Z', '2026-04-15T12:30:00Z', 'Design review', '#8b5cf6', 'design'],
    ['2026-04-15T12:00:00Z', '2026-04-15T13:00:00Z', 'Lunch with Anna', '#ef4444', 'lunch-anna'],
    ['2026-04-15T15:00:00Z', '2026-04-15T15:45:00Z', '1:1 with Bernhard', '#3b82f6', '1on1-bw'],
    ['2026-04-16T09:00:00Z', '2026-04-16T13:00:00Z', 'Deep work — Calendar', '#2563eb', 'deepwork-cal'],
    ['2026-04-17T15:00:00Z', '2026-04-17T16:30:00Z', 'Client demo', '#dc2626', 'client-demo-1'],
    ['2026-04-22T10:00:00Z', '2026-04-22T11:00:00Z', 'Architecture sync', '#f59e0b', 'arch-sync'],
    ['2026-04-23T14:00:00Z', '2026-04-23T15:00:00Z', 'Customer call', '#0891b2', 'cust-call-1'],
    ['2026-04-29T09:00:00Z', '2026-04-29T10:30:00Z', 'Quarterly review', '#2563eb', 'qr-review'],
    ['2026-05-13T13:00:00Z', '2026-05-13T14:00:00Z', 'Team lunch', '#10b981', 'team-lunch-may'],
    ['2026-05-15T15:00:00Z', '2026-05-15T16:30:00Z', 'Client demo 2', '#dc2626', 'client-demo-2'],
    ['2026-05-20T11:00:00Z', '2026-05-20T12:00:00Z', 'Hiring panel', '#7c3aed', 'hiring-1'],
    ['2026-05-25T09:00:00Z', '2026-05-25T17:00:00Z', 'Workshop day', '#0891b2', 'workshop-1'],
  ];
  for (const [start, end, title, color, id] of samples) {
    out.push({ id, start, end, meta: { title, color } });
  }

  return out;
});

const surfaceRef = useTemplateRef<InstanceType<typeof CoarAgendaView>>('agenda');

const clicks = ref<{ kind: string; label: string; when: string }[]>([]);
function pushClick(kind: string, label: string) {
  clicks.value.unshift({ kind, label, when: new Date().toLocaleTimeString() });
  if (clicks.value.length > 8) clicks.value.length = 8;
}
function onEventClick(p: { event: CalendarEvent }) {
  const title = (p.event.meta as { title?: string } | undefined)?.title ?? p.event.id;
  pushClick('event', title);
}
function onDateClick(p: { date: { toString(): string } }) {
  pushClick('date', p.date.toString());
}

function jumpToToday() {
  const todayIso = new Date().toISOString().slice(0, 10);
  surfaceRef.value?.scrollToDate(todayIso);
}
function jumpToSpecific(iso: string) {
  surfaceRef.value?.scrollToDate(iso);
}
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 2.4 — Agenda View</h1>
      <p>
        Virtualized chronological list. Multi-day events appear on
        every day they touch (with <code>(cont.)</code> tag from
        day 2). Sticky headers stay pinned as you scroll. Built on
        <code>VirtualizedSurface1DY</code> from Spike A.
      </p>
    </header>

    <div class="controls">
      <label>
        Range start:
        <input v-model="rangeStart" type="date" />
      </label>
      <label>
        Range end:
        <input v-model="rangeEnd" type="date" />
      </label>
      <label>
        <input v-model="showEmptyDays" type="checkbox" />
        Show empty days
      </label>
      <span class="divider" />
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
      <span class="divider" />
      <button class="btn" @click="jumpToToday">Scroll to today</button>
      <button class="btn" @click="jumpToSpecific('2026-04-15')">→ Apr 15</button>
      <button class="btn" @click="jumpToSpecific('2026-05-04')">→ May 4</button>
    </div>

    <div class="agenda-host">
      <CoarAgendaView
        ref="agenda"
        :range-start="rangeStart"
        :range-end="rangeEnd"
        :events="events"
        :show-empty-days="showEmptyDays"
        :density="density"
        :locale="locale"
        timezone="UTC"
        @event-click="onEventClick"
        @date-click="onDateClick"
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
        Click any header or event to log here.
      </p>
    </div>
  </div>
</template>

<style scoped>
.view {
  max-width: 900px;
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
  background: #f3f4f6; padding: 1px 4px; border-radius: 3px;
}

.controls {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  font-size: 13px; color: #4b5563;
}
.controls label { display: flex; align-items: center; gap: 4px; }
.controls select, .controls input[type='date'] {
  padding: 2px 6px; font-size: 13px;
  border: 1px solid #d1d5db; border-radius: 4px; background: #fff;
}
.btn {
  padding: 4px 10px; font-size: 13px;
  background: #fff; border: 1px solid #d1d5db; border-radius: 4px;
  cursor: pointer;
}
.btn:hover { background: #f3f4f6; }
.divider { width: 1px; height: 20px; background: #e3e5e9; margin: 0 4px; }

.agenda-host {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  height: 600px;
  overflow: hidden;
}

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
.click-log__label { flex: 1; color: #1a1c1f; }
.click-log__time { color: #6c7280; font-size: 12px; }
.click-log__empty { font-size: 13px; color: #9ca3af; margin: 0; }
</style>
