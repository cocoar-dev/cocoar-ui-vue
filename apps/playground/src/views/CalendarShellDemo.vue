<script setup lang="ts">
/**
 * Top-level <CoarCalendar> shell demo.
 *
 * Full-feature demo of the calendar shell: prev/today/next nav, view
 * switcher, click log, edit modal on dblclick, canDrop weekend-veto for
 * standups, density toggle, working-hours toggle, locale toggle.
 *
 * Drives @cocoar/vue-calendar via the flat builder and Temporal-typed
 * events (C1).
 */

import { computed, ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type CalendarView,
  type EventDropPayload,
  type ViewWindow,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref<Temporal.PlainDate>(Temporal.PlainDate.from('2026-04-15'));
const locale = ref('en-US');
const density = ref<'comfortable' | 'compact'>('comfortable');

// Time-range demo toggle: full 24h vs. 8 AM – 6 PM working hours.
const workingHoursOnly = ref(false);
const timeRange = computed(() =>
  workingHoursOnly.value
    ? { startMinutes: 8 * 60, endMinutes: 18 * 60 }
    : { startMinutes: 0, endMinutes: 24 * 60 },
);

// Sample event set, Temporal-typed (C1). Mutable ref so DnD drops can
// replace start/end in place.
const events = ref<CalendarEvent[]>(buildInitialEvents());

function buildInitialEvents(): CalendarEvent[] {
  const out: CalendarEvent[] = [];

  // Daily standups Mon-Fri across April. Source zone = UTC.
  let cursor = Temporal.PlainDate.from('2026-04-01');
  const aprEnd = Temporal.PlainDate.from('2026-04-30');
  while (Temporal.PlainDate.compare(cursor, aprEnd) <= 0) {
    const dow = cursor.dayOfWeek; // 1=Mon … 7=Sun
    if (dow >= 1 && dow <= 5) {
      out.push({
        id: `standup-${cursor.toString()}`,
        start: cursor.toZonedDateTime({ timeZone: 'UTC', plainTime: '09:00' }),
        end: cursor.toZonedDateTime({ timeZone: 'UTC', plainTime: '09:30' }),
        meta: { title: 'Daily standup', color: '#10b981' },
      });
    }
    cursor = cursor.add({ days: 1 });
  }

  // Multi-day all-day
  out.push({
    id: 'devconf',
    start: Temporal.PlainDate.from('2026-04-13'),
    end: Temporal.PlainDate.from('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  });
  out.push({
    id: 'sven-ooo',
    start: Temporal.PlainDate.from('2026-04-15'),
    end: Temporal.PlainDate.from('2026-04-18'),
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  });

  // Timed events
  const samples: Array<[string, string, string, string, string]> = [
    ['2026-04-15T11:00:00', '2026-04-15T12:30:00', 'Design review', '#8b5cf6', 'design'],
    ['2026-04-15T12:00:00', '2026-04-15T13:00:00', 'Lunch with Anna', '#ef4444', 'lunch-anna'],
    ['2026-04-15T15:00:00', '2026-04-15T15:45:00', '1:1 with Bernhard', '#3b82f6', '1on1-bw'],
    ['2026-04-16T09:00:00', '2026-04-16T13:00:00', 'Deep work — Calendar', '#2563eb', 'deepwork-cal'],
    ['2026-04-17T15:00:00', '2026-04-17T16:30:00', 'Client demo', '#dc2626', 'client-demo-1'],
    ['2026-04-22T10:00:00', '2026-04-22T11:00:00', 'Architecture sync', '#f59e0b', 'arch-sync'],
    ['2026-04-23T14:00:00', '2026-04-23T15:00:00', 'Customer call', '#0891b2', 'cust-call-1'],
    ['2026-04-29T09:00:00', '2026-04-29T10:30:00', 'Quarterly review', '#2563eb', 'qr-review'],
  ];
  for (const [start, end, title, color, id] of samples) {
    out.push({
      id,
      start: Temporal.PlainDateTime.from(start).toZonedDateTime('UTC'),
      end: Temporal.PlainDateTime.from(end).toZonedDateTime('UTC'),
      meta: { title, color },
    });
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

// Edit dialog state — opened by double-clicking an event. Bound
// to `editing` so changes flow through `events.value` after Save.
const editing = ref<CalendarEvent | null>(null);
const editTitle = ref('');
function onEventDoubleClick(p: { event: CalendarEvent }) {
  const t = (p.event.meta as { title?: string } | undefined)?.title ?? p.event.id;
  pushLog('dblclick', t);
  editing.value = p.event;
  editTitle.value = t;
}
function saveEdit() {
  const original = editing.value;
  if (!original) return;
  const idx = events.value.findIndex((e) => e.id === original.id);
  if (idx < 0) {
    editing.value = null;
    return;
  }
  const meta = { ...(original.meta ?? {}), title: editTitle.value };
  events.value = [
    ...events.value.slice(0, idx),
    { ...original, meta },
    ...events.value.slice(idx + 1),
  ];
  editing.value = null;
}
function cancelEdit() {
  editing.value = null;
}
function onDateClick(p: { date: Temporal.PlainDate }) {
  pushLog('date', p.date.toString());
}
function onTimeClick(p: { date: Temporal.PlainDate; time: Temporal.PlainTime }) {
  pushLog('time', `${p.date.toString()} ${p.time.toString()}`);
}

// Business-rule example: a "Daily standup" can't move to a weekend.
// Wired via `.canDrop(...)` — the ghost renders red while the user
// hovers an invalid slot, and the drop is silently dropped on release.
function canDrop(
  event: CalendarEvent,
  target: { date: string; minutes: number | null },
): boolean {
  const title = (event.meta as { title?: string } | undefined)?.title ?? '';
  if (!title.toLowerCase().includes('standup')) return true;
  // Use Temporal so dayOfWeek matches the calendar's internal reads.
  // 1=Mon … 6=Sat … 7=Sun.
  const dow = Temporal.PlainDate.from(target.date).dayOfWeek;
  return dow !== 6 && dow !== 7;
}

function onEventDrop(p: EventDropPayload) {
  const idx = events.value.findIndex((e) => e.id === p.event.id);
  if (idx < 0) return;
  // Replace the event's start/end in place with the C3-correct
  // Temporal values from `next` (per-endpoint source zones preserved).
  const updated: CalendarEvent = {
    ...p.event,
    start: p.next.start,
    ...(p.next.end !== undefined ? { end: p.next.end } : {}),
  };
  events.value = [
    ...events.value.slice(0, idx),
    updated,
    ...events.value.slice(idx + 1),
  ];
  const title = (p.event.meta as { title?: string } | undefined)?.title ?? p.event.id;
  const hhmm = p.target.minutes === null
    ? 'all-day'
    : `${String(Math.floor(p.target.minutes / 60)).padStart(2, '0')}:${String(p.target.minutes % 60).padStart(2, '0')}`;
  const dis = p.target.disambiguation ? ` [${p.target.disambiguation}]` : '';
  pushLog('drop', `${title} → ${p.target.date} ${hhmm}${dis}`);
}

const visibleRange = ref<ViewWindow | null>(null);
function onRangeChange(w: ViewWindow) {
  visibleRange.value = w;
}

// ─── Builder wiring ──────────────────────────────────────────────
// Single chainable builder — no sub-builder factories. Every setter
// (`.timeRange`, `.slotDuration`, …) lives on the same `CalendarBuilder`.
// Events are Temporal-typed (C1).

const { builder } = useCalendar();
builder
  .events(events)
  .view(view)
  .date(date)
  .locale(locale)
  .density(density)
  .timezone('UTC')
  .canDrop(canDrop)
  .timeRange(timeRange)
  .onEventClick(onEventClick)
  .onEventDoubleClick(onEventDoubleClick)
  .onDateClick(onDateClick)
  .onTimeClick(onTimeClick)
  .onEventDrop(onEventDrop)
  .onRangeChange(onRangeChange);
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Calendar — &lt;CoarCalendar&gt; shell demo</h1>
      <p>
        Full-feature shell demo: prev/today/next, view switcher, click
        log, edit modal on dblclick, weekend-veto for standups. Drives
        <code>@cocoar/vue-calendar</code> via the flat builder and
        Temporal-typed events.
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
      <CoarCalendar :builder="builder" />
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

    <!-- Edit dialog opened by double-clicking any event. -->
    <div v-if="editing" class="edit-modal" role="dialog" aria-modal="true">
      <div class="edit-modal__backdrop" @click="cancelEdit" />
      <div class="edit-modal__panel">
        <h2>Edit event</h2>
        <label>
          Title
          <input v-model="editTitle" type="text" autofocus />
        </label>
        <div class="edit-modal__actions">
          <button type="button" @click="cancelEdit">Cancel</button>
          <button type="button" @click="saveEdit">Save</button>
        </div>
      </div>
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

.edit-modal {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
}
.edit-modal__backdrop {
  position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4);
}
.edit-modal__panel {
  position: relative; background: #fff;
  border-radius: 8px; padding: 20px; min-width: 320px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  display: flex; flex-direction: column; gap: 12px;
}
.edit-modal__panel h2 { margin: 0; font-size: 16px; }
.edit-modal__panel label {
  display: flex; flex-direction: column; gap: 4px;
  font-size: 13px; color: #4b5563;
}
.edit-modal__panel input {
  padding: 6px 8px; font-size: 14px;
  border: 1px solid #d1d5db; border-radius: 4px;
}
.edit-modal__actions {
  display: flex; gap: 8px; justify-content: flex-end;
}
.edit-modal__actions button {
  padding: 6px 12px; font-size: 13px;
  border: 1px solid #d1d5db; border-radius: 4px;
  background: #fff; cursor: pointer;
}
.edit-modal__actions button:last-child {
  background: #2563eb; color: #fff; border-color: #2563eb;
}
</style>
