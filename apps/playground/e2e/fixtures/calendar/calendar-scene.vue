<script setup lang="ts">
/**
 * One parameterised scene for the calendar states that have no compact scene yet.
 * Query: scene, profile (compact|legacy), w, h (px of the host box).
 * Fixed data (clock 2026-04-15T08:30:00Z = Wed 15 Apr 2026, 10:30 Vienna), no randomness.
 * Observable state: window.__cal = { drops, selects, rangeChanges, timeClicks, dateClicks, eventClicks }.
 */
import { computed, ref } from 'vue';
import {
  CoarCalendar,
  CoarContinuousMonthView,
  Temporal,
  useCalendar,
  useMonthView,
  type CalendarBand,
  type CalendarDraft,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';
import { displayZone, today, selectedDay } from '../../../src/visual/stories/calendar-events';
import { compactBands, compactEvents } from '../../../src/visual/stories/compact-calendar-data';

const q = new URLSearchParams(location.search);
const scene = q.get('scene') ?? 'work-week';
const profile = q.get('profile') ?? 'compact';
const w = q.get('w');
const hgt = q.get('h') ?? '760';

const cal: Record<string, unknown[]> = {
  drops: [], selects: [], rangeChanges: [], timeClicks: [], dateClicks: [], eventClicks: [],
};
(window as unknown as { __cal: typeof cal }).__cal = cal;

const at = (iso: string) => Temporal.ZonedDateTime.from(`${iso}[${displayZone}]`);
const day = (iso: string) => Temporal.PlainDate.from(iso);
const ev = (id: string, from: string, to: string, title: string, color?: string): CalendarEvent => ({
  id, start: at(from), end: at(to), meta: { title, ...(color ? { color } : {}) },
});

/** A small deterministic week for pointer work: nothing overlaps, every title is readable. */
const dndEvents = ref<CalendarEvent[]>([
  ev('drag-me', '2026-04-15T11:00:00', '2026-04-15T12:00:00', 'Drag me', '#2563eb'),
  ev('resize-me', '2026-04-16T13:00:00', '2026-04-16T14:30:00', 'Resize me', '#0f766e'),
  ev('neighbour', '2026-04-14T09:00:00', '2026-04-14T10:00:00', 'Neighbour', '#b45309'),
  ev('plain', '2026-04-17T15:00:00', '2026-04-17T16:00:00', 'No colour'),
]);

/** Five all-day events on Wed 15 Apr, so a band capped at two lanes folds three. */
const allDayEvents: CalendarEvent[] = [
  ['ad1', 'Conference', '#7c3aed'], ['ad2', 'Holiday cover', '#0891b2'], ['ad3', 'Audit window', '#b45309'],
  ['ad4', 'Release freeze'], ['ad5', 'Company trip', '#be185d'],
].map(([id, title, color]) => ({
  id, start: day('2026-04-15'), end: day('2026-04-16'), meta: { title, ...(color ? { color } : {}) },
}));

const viewByScene: Record<string, CalendarView> = {
  'work-week': 'workWeek', 'week-dnd': 'week', 'week-allday': 'week', 'week-draft-clipped': 'week',
  'work-week-dnd': 'workWeek', 'day-swipe': 'day', 'agenda-empty': 'agenda', 'agenda-empty-slot': 'agenda',
  month: 'month', 'month-list': 'monthList', agenda: 'agenda', timeline: 'timeline', year: 'year',
  'day-agenda': 'dayAgenda', week: 'week', day: 'day',
};
const draftKind = q.get('draft') ?? 'bottom';
const draft = ref<CalendarDraft | null>(
  scene === 'week-draft-clipped'
    ? draftKind === 'top'
      ? { start: at('2026-04-15T06:00:00'), end: at('2026-04-15T08:00:00') }
      : { start: at('2026-04-15T17:30:00'), end: at('2026-04-15T21:00:00') }
    : null,
);

const { builder } = useCalendar();
builder.timezone(displayZone).locale('en-US').date(ref(today)).view(viewByScene[scene] ?? 'week');

const timeRange = { startMinutes: 7 * 60, endMinutes: 19 * 60 };
if (scene === 'agenda-empty' || scene === 'agenda-empty-slot') {
  builder.events([]);
} else if (scene === 'week-dnd' || scene === 'work-week-dnd') {
  builder
    .events(dndEvents)
    .timeRange(timeRange)
    .pixelsPerHour(54)
    .timeRangeSelect(true)
    .hoverIndicator(true)
    .draft(draft)
    .canDrop((_e, t) => {
      const d = Temporal.PlainDate.from(t.date);
      return d.dayOfWeek <= 5 && (t.minutes === null || t.minutes >= 8 * 60);
    })
    .onEventDrop((p) => {
      cal.drops.push({
        id: p.event.id, start: String(p.next.start), end: p.next.end ? String(p.next.end) : null,
        from: String(p.original.start),
      });
      dndEvents.value = dndEvents.value.map((e) =>
        e.id === p.event.id ? { ...e, start: p.next.start, end: p.next.end } : e,
      );
    })
    .onTimeRangeSelect((p) => {
      cal.selects.push({ date: String(p.date), start: String(p.start), end: String(p.end), source: p.source });
      draft.value = { start: p.start, end: p.end };
    })
    .onTimeClick((p) => cal.timeClicks.push(`${p.date} ${p.time}`));
} else if (scene === 'week-allday') {
  builder.events([...allDayEvents, ...compactEvents.filter((e) => e.id.startsWith('standup'))])
    .timeRange(timeRange).pixelsPerHour(54).allDayMaxVisibleLanes(2);
} else if (scene === 'week-draft-clipped') {
  builder
    .events([ev('late', '2026-04-15T18:00:00', '2026-04-15T20:30:00', 'Late deployment', '#2563eb'),
             ev('early', '2026-04-15T06:00:00', '2026-04-15T07:30:00', 'Early shift', '#0f766e')])
    .timeRange(timeRange).pixelsPerHour(54).draft(draft).backgrounds(compactBands);
} else if (scene === 'work-week') {
  builder.events(compactEvents).timeRange(timeRange).pixelsPerHour(54).backgrounds(compactBands);
} else {
  builder.events(compactEvents).timeRange(timeRange).pixelsPerHour(54).selectedDate(selectedDay);
}
builder.onDateClick((p) => cal.dateClicks.push(String(p.date)));
builder.onEventClick((p: { event: CalendarEvent }) => cal.eventClicks.push(p.event.id));
builder.onRangeChange((r: unknown) => cal.rangeChanges.push(JSON.parse(JSON.stringify(r))));

const continuous = useMonthView().builder;
continuous.events(compactEvents).date(ref(today)).timezone(displayZone).locale('en-US').shadeWeekends(true).selectedDate(selectedDay);

const boxStyle = computed(() => ({ height: `${hgt}px`, width: w ? `${w}px` : undefined }));
</script>

<template>
  <div :class="profile === 'compact' ? 'coar-compact' : undefined" :style="boxStyle" data-scene-root>
    <CoarContinuousMonthView v-if="scene === 'month-continuous'" :builder="continuous" />
    <CoarCalendar v-else :builder="builder">
      <template v-if="scene === 'agenda-empty-slot'" #agendaEmpty>
        <p data-empty-note>Nothing planned in this range.</p>
      </template>
    </CoarCalendar>
  </div>
</template>
