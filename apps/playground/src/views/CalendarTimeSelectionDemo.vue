<script setup lang="ts">
/**
 * Time-range selection demo — a booking week like TimeBooking's "Tag
 * buchen": `timeRangeSelect` + `hoverIndicator` with
 * `gapOrDurationPolicy`, a draft that follows the booking form, and
 * per-day background bands (core time, outside the frame, a hint above
 * the events, a daily-maximum line). Both orientations. Every hook logs
 * a line into `[data-testid=log]`. Used by
 * `e2e/calendar-time-selection.spec.ts`.
 */

import { computed, ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  gapOrDurationPolicy,
  useCalendar,
  type CalendarBand,
  type CalendarDraft,
  type CalendarEvent,
  type CalendarTimeGridOrientation,
} from '@cocoar/vue-calendar';

const ZONE = 'Europe/Vienna';
const at = (date: string, time: string) => Temporal.ZonedDateTime.from(`${date}T${time}[${ZONE}]`);
const hhmm = (z: Temporal.ZonedDateTime) => z.toPlainTime().toString().slice(0, 5);
const block = (
  id: string,
  date: string,
  from: string,
  to: string,
  title: string,
  color?: string,
): CalendarEvent => ({
  id,
  start: at(date, from),
  end: at(date, to),
  meta: { title, ...(color ? { color } : {}) },
});

const events = ref<CalendarEvent[]>([
  block('mo-dev', '2026-10-19', '07:30', '09:30', 'Entwicklung'),
  block('mo-daily', '2026-10-19', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('mo-dev2', '2026-10-19', '09:45', '12:00', 'Entwicklung'),
  block('di-dev', '2026-10-20', '07:30', '09:30', 'Entwicklung'),
  block('di-daily', '2026-10-20', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('di-dev2', '2026-10-20', '09:45', '12:00', 'Entwicklung'),
  block('di-backlog', '2026-10-20', '12:30', '13:30', 'Backlog', '#ef4444'),
  block('mi-meeting', '2026-10-21', '08:00', '09:30', 'Meeting', '#0ea5e9'),
  block('mi-dev', '2026-10-21', '10:30', '13:00', 'Entwicklung'),
]);

const log = ref<string[]>([]);
function pushLog(line: string): void {
  log.value.unshift(line);
  if (log.value.length > 14) log.value.length = 14;
}

const orientation = ref<CalendarTimeGridOrientation>('horizontal');
const allowOverlap = ref(false);
const policy = computed(() => gapOrDurationPolicy({ minutes: 60, overlap: allowOverlap.value }));

// ─── Booking form + draft ────────────────────────────────────────────
const form = ref<{ date: string; start: string; end: string } | null>(null);
const draft = computed<CalendarDraft | null>(() => {
  const f = form.value;
  if (!f || !/^\d\d:\d\d$/.test(f.start) || !/^\d\d:\d\d$/.test(f.end)) return null;
  const start = at(f.date, f.start);
  const end = f.end === '00:00' ? at(f.date, '00:00').add({ days: 1 }) : at(f.date, f.end);
  return Temporal.ZonedDateTime.compare(end, start) > 0 ? { start, end } : null;
});
let nextId = 1;
function save(): void {
  const d = draft.value;
  if (!d || !form.value) return;
  events.value = [
    ...events.value,
    {
      id: `new-${nextId++}`,
      start: d.start,
      end: d.end,
      meta: { title: 'Buchung', color: '#22c55e' },
    },
  ];
  pushLog(`saved: ${form.value.date} ${hhmm(d.start)}–${hhmm(d.end)}`);
  form.value = null;
}

// ─── Work rules as bands ─────────────────────────────────────────────
const T = (s: string) => Temporal.PlainTime.from(s);
function workRuleBands(date: Temporal.PlainDate): CalendarBand[] {
  if (date.dayOfWeek >= 6)
    return [{ kind: 'outside', start: T('06:00'), end: T('20:00'), appearance: 'hatch' }];
  const bands: CalendarBand[] = [
    { kind: 'outside', start: T('06:00'), end: T('07:00'), appearance: 'hatch' },
    { kind: 'outside', start: T('19:00'), end: T('20:00'), appearance: 'hatch' },
    // Core time; Friday shorter.
    {
      kind: 'core',
      start: T('09:00'),
      end: date.dayOfWeek === 5 ? T('12:00') : T('15:00'),
      label: 'Kernzeit',
    },
  ];
  if (date.dayOfWeek === 1) {
    bands.push({
      kind: 'hint',
      start: T('07:00'),
      end: T('07:30'),
      appearance: 'outline',
      layer: 'above',
      label: 'vor Rahmen?',
    });
  }
  if (date.dayOfWeek === 2) bands.push({ kind: 'max', at: T('17:30'), label: 'max. 10:30 h' });
  return bands;
}

const { builder } = useCalendar();
builder
  .events(events)
  .timezone(ZONE)
  .locale('de-AT')
  .firstDayOfWeek(1)
  .view('week')
  .availableViews(['week', 'workWeek', 'day'])
  .timeGridOrientation(orientation)
  .timeRange({ startMinutes: 6 * 60, endMinutes: 20 * 60 })
  .pixelsPerHour(90)
  .slotDuration(15)
  .date(Temporal.PlainDate.from('2026-10-21'))
  .timeRangeSelect(true)
  .hoverIndicator(true)
  .selectionPolicy((ctx) => policy.value(ctx))
  .backgrounds(workRuleBands)
  .draft(draft)
  .onTimeClick(({ date, time }) => pushLog(`timeClick: ${date} ${time.toString().slice(0, 5)}`))
  .onTimeRangeSelect(({ date, start, end, source }) => {
    pushLog(`range ${source}: ${date} ${hhmm(start)}–${hhmm(end)}`);
    form.value = { date: date.toString(), start: hhmm(start), end: hhmm(end) };
  })
  .onEventClick(({ event }) =>
    pushLog(`click: ${(event.meta as { title?: string } | undefined)?.title ?? event.id}`),
  )
  .onEventDrop(({ event, next, target }) => {
    const title = (event.meta as { title?: string } | undefined)?.title ?? event.id;
    pushLog(`drop: ${title} → ${target.date}`);
    events.value = events.value.map((e) =>
      e.id === event.id ? { ...e, start: next.start, end: next.end } : e,
    );
  })
  .onRangeChange((w) => pushLog(`range: ${w.view} ${w.start}..${w.end}`));
</script>

<template>
  <div class="page">
    <header class="page__header">
      <h1>Calendar — time selection, draft, bands</h1>
      <div class="page__toggle" role="group" aria-label="Orientation">
        <button
          data-testid="orientation-horizontal"
          :aria-pressed="orientation === 'horizontal'"
          @click="orientation = 'horizontal'"
        >
          Days as rows
        </button>
        <button
          data-testid="orientation-vertical"
          :aria-pressed="orientation === 'vertical'"
          @click="orientation = 'vertical'"
        >
          Days as columns
        </button>
      </div>
      <label><input v-model="allowOverlap" type="checkbox" data-testid="overlap" /> Overlap</label>
    </header>
    <div class="page__layout">
      <div class="page__calendar">
        <CoarCalendar :builder="builder" />
      </div>
      <aside class="page__side">
        <form v-if="form" class="page__form" data-testid="form" @submit.prevent="save">
          <h3>Buchung {{ form.date }}</h3>
          <label>Beginn <input v-model="form.start" data-testid="form-start" /></label>
          <label>Ende <input v-model="form.end" data-testid="form-end" /></label>
          <div class="page__form-actions">
            <button type="submit" data-testid="form-save">Speichern</button>
            <button type="button" data-testid="form-cancel" @click="form = null">Abbrechen</button>
          </div>
        </form>
        <h3>Event log</h3>
        <ul data-testid="log">
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
  gap: 12px;
  height: 100%;
  box-sizing: border-box;
}
.page__header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.page__header h1 {
  margin: 0;
  font-size: 18px;
}
.page__toggle button[aria-pressed='true'] {
  font-weight: 700;
}
.page__layout {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 560px;
}
.page__calendar {
  flex: 1;
  min-width: 0;
  height: 640px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}
.page__side {
  width: 300px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}
.page__side h3 {
  margin: 0 0 8px;
  font-size: 13px;
}
.page__side ul {
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.page__form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  padding: 10px;
  border: 2px solid #2563eb;
  border-radius: 6px;
  background: #fff;
}
.page__form input {
  width: 70px;
}
.page__form-actions {
  display: flex;
  gap: 8px;
}
/* Host styling of band kinds: colours through the band token. */
:deep(.coar-calendar-band--core) {
  --coar-calendar-band-color: #16a34a;
}
</style>
