<template>
  <div style="display: flex; flex-direction: column; gap: 8px">
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
      <CoarButton
        size="s"
        :variant="orientation === 'horizontal' ? 'primary' : 'secondary'"
        @click="orientation = 'horizontal'"
      >
        Days as rows
      </CoarButton>
      <CoarButton
        size="s"
        :variant="orientation === 'vertical' ? 'primary' : 'secondary'"
        @click="orientation = 'vertical'"
      >
        Days as columns
      </CoarButton>
      <CoarButton size="s" variant="secondary" :disabled="!draft" @click="draft = null">
        Clear draft
      </CoarButton>
      <span style="font-size: 12px; color: var(--coar-text-neutral-secondary)">{{ last }}</span>
    </div>
    <div
      style="
        height: 420px;
        border: 1px solid var(--coar-border-neutral-tertiary);
        border-radius: var(--coar-radius-xs);
        overflow: hidden;
      "
    >
      <CoarWeekView :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarWeekView,
  useWeekView,
  gapOrDurationPolicy,
  Temporal,
  type CalendarBand,
  type CalendarDraft,
  type CalendarEvent,
  type CalendarTimeGridOrientation,
} from '@cocoar/vue-calendar';

const zone = 'Europe/Vienna';
const at = (date: string, time: string) => Temporal.ZonedDateTime.from(`${date}T${time}[${zone}]`);
const hhmm = (z: Temporal.ZonedDateTime) => z.toPlainTime().toString().slice(0, 5);
const block = (id: string, date: string, from: string, to: string, title: string, color: string) =>
  ({ id, start: at(date, from), end: at(date, to), meta: { title, color } }) as CalendarEvent;

const events = ref<CalendarEvent[]>([
  block('mo-1', '2026-04-13', '07:30', '09:30', 'Development', '#93c5fd'),
  block('mo-2', '2026-04-13', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('mo-3', '2026-04-13', '09:45', '12:00', 'Development', '#93c5fd'),
  block('tu-1', '2026-04-14', '08:00', '09:30', 'Development', '#93c5fd'),
  block('tu-2', '2026-04-14', '10:00', '12:00', 'Review', '#a78bfa'),
  block('tu-3', '2026-04-14', '13:00', '15:00', 'Backlog', '#f87171'),
  block('we-1', '2026-04-15', '08:30', '10:00', 'Meeting', '#38bdf8'),
]);

const T = (s: string) => Temporal.PlainTime.from(s);
// Working-time rules as bands: core time (shorter on Friday), outside the frame, a limit.
function workRules(date: Temporal.PlainDate): CalendarBand[] {
  if (date.dayOfWeek >= 6) {
    return [{ kind: 'outside', start: T('06:00'), end: T('19:00'), appearance: 'hatch' }];
  }
  return [
    { kind: 'outside', start: T('06:00'), end: T('07:00'), appearance: 'hatch' },
    { kind: 'core', start: T('09:00'), end: date.dayOfWeek === 5 ? T('12:00') : T('15:00') },
    { kind: 'max', at: T('17:30'), label: 'max. 10:30 h' },
  ];
}

const orientation = ref<CalendarTimeGridOrientation>('horizontal');
const draft = ref<CalendarDraft | null>(null);
const last = ref('Drag on free space, click a gap, or hover to see what a click selects.');

const { builder } = useWeekView();
builder
  .events(events)
  .date(Temporal.PlainDate.from('2026-04-15'))
  .timezone(zone)
  .firstDayOfWeek(1)
  .timeGridOrientation(orientation)
  .timeRange({ startMinutes: 6 * 60, endMinutes: 19 * 60 })
  .pixelsPerHour(80)
  .slotDuration(15)
  .timeRangeSelect(true)
  .hoverIndicator(true)
  .selectionPolicy(gapOrDurationPolicy({ minutes: 60 }))
  .backgrounds(workRules)
  .draft(draft)
  .onTimeRangeSelect(({ date, start, end, source }) => {
    last.value = `onTimeRangeSelect (${source}): ${date} ${hhmm(start)}–${hhmm(end)}`;
    draft.value = { start, end };
  });
</script>
