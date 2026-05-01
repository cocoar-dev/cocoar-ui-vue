<script setup lang="ts">
/**
 * `<CoarCalendar>` — top-level shell.
 *
 * Wires the four v1 views (Day, Week, Month, Agenda) behind a
 * single component with view-state (`view`, `date`) as v-models, a
 * navigation header (prev / today / next + range label + view
 * switcher), and a slot-based extension surface so consumers can
 * customise the header or replace the event renderer without
 * forking the whole shell.
 *
 * Per design doc §4 — this is the public face of the package.
 * Sub-views are accessible directly for consumers who want to
 * compose their own shell.
 */

import { computed, useTemplateRef, watch } from 'vue';
import { CoarButton, CoarSegmentedControl } from '@cocoar/vue-ui';
import CoarDayView from './CoarDayView.vue';
import CoarWeekView from './CoarWeekView.vue';
import CoarMonthView from './CoarMonthView.vue';
import CoarAgendaView from './CoarAgendaView.vue';
import {
  Temporal,
  computeViewWindow,
  navigateCursor,
  todayInZone,
  detectFirstDayOfWeekFromLocale,
  detectBrowserTimezone,
  type CalendarEvent,
  type CalendarView,
  type ViewWindow,
  type DayOfWeek,
} from '../core';

interface Props {
  events?: ReadonlyArray<CalendarEvent>;
  availableViews?: ReadonlyArray<CalendarView>;
  locale?: string;
  timezone?: string;
  firstDayOfWeek?: DayOfWeek;
  // Time-grid (day / week)
  timeRange?: [number, number];
  slotDuration?: 5 | 10 | 15 | 30 | 60;
  pixelsPerHour?: number;
  // Month
  maxEventsPerCell?: number;
  // Agenda
  agendaLengthDays?: number;
  showEmptyDays?: boolean;
  // Density (all views)
  density?: 'comfortable' | 'compact';
}

const props = withDefaults(defineProps<Props>(), {
  events: () => [],
  availableViews: () => ['month', 'week', 'day', 'agenda'] as const,
  locale: 'en-US',
  timezone: () => detectBrowserTimezone(),
  firstDayOfWeek: undefined,
  timeRange: () => [0, 24],
  slotDuration: 30,
  pixelsPerHour: 60,
  maxEventsPerCell: 3,
  agendaLengthDays: 30,
  showEmptyDays: false,
  density: 'comfortable',
});

const view = defineModel<CalendarView>('view', { default: 'week' });
const date = defineModel<string>('date', {
  default: () => todayInZone(detectBrowserTimezone()).toString(),
});

defineSlots<{
  /** Replace the entire header bar. Overrides headerStart/End/viewSwitcher. */
  header(props: HeaderSlotScope): unknown;
  /** Prepend before the prev/today/next buttons. */
  headerStart(props: { controls: HeaderControls }): unknown;
  /** Append after the view-switcher. */
  headerEnd(props: { controls: HeaderControls }): unknown;
  /** Replace just the view-switcher. */
  viewSwitcher(props: {
    view: CalendarView;
    available: ReadonlyArray<CalendarView>;
    setView: (v: CalendarView) => void;
  }): unknown;
  /** Per-event renderer — forwarded to whichever view is active. */
  event(props: { event: CalendarEvent; view: CalendarView }): unknown;
  /** All-day-band renderer (week / day). */
  allDayEvent(props: { event: CalendarEvent }): unknown;
  /** Per-day-column header (week / month). */
  dayHeader(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

const emit = defineEmits<{
  'range-change': [ViewWindow];
  'event-click': [{ event: CalendarEvent; native: PointerEvent }];
  'date-click': [{ date: Temporal.PlainDate; native: PointerEvent }];
  'time-click': [{ date: Temporal.PlainDate; time: Temporal.PlainTime; native: PointerEvent }];
  'more-click': [{ date: Temporal.PlainDate; events: CalendarEvent[]; native: PointerEvent }];
}>();

interface HeaderSlotScope {
  view: CalendarView;
  cursor: Temporal.PlainDate;
  range: ViewWindow;
  controls: HeaderControls;
}
interface HeaderControls {
  prev: () => void;
  next: () => void;
  goToToday: () => void;
  setView: (v: CalendarView) => void;
  rangeLabel: string;
  view: CalendarView;
  available: ReadonlyArray<CalendarView>;
}

// ─── Cursor / view-window math ────────────────────────────────────

const cursor = computed<Temporal.PlainDate>(() => {
  const iso = date.value;
  // Accept date-only ('YYYY-MM-DD') or datetime — we keep a date.
  return Temporal.PlainDate.from(iso.length >= 10 ? iso.slice(0, 10) : iso);
});

const resolvedFirstDayOfWeek = computed<DayOfWeek>(() =>
  props.firstDayOfWeek ?? detectFirstDayOfWeekFromLocale(props.locale),
);

const window = computed<ViewWindow>(() =>
  computeViewWindow({
    view: view.value,
    cursor: cursor.value,
    firstDayOfWeek: resolvedFirstDayOfWeek.value,
    agendaLengthDays: props.agendaLengthDays,
  }),
);

watch(window, (w) => emit('range-change', w), { immediate: true });

// ─── Navigation ──────────────────────────────────────────────────

function goToToday() {
  date.value = todayInZone(props.timezone).toString();
}
function next() {
  date.value = navigateCursor(view.value, cursor.value, 'next', props.agendaLengthDays).toString();
}
function prev() {
  date.value = navigateCursor(view.value, cursor.value, 'prev', props.agendaLengthDays).toString();
}
function setView(v: CalendarView) {
  view.value = v;
}

// ─── Range label ─────────────────────────────────────────────────

const rangeLabel = computed<string>(() => {
  const w = window.value;
  const start = Temporal.PlainDate.from(w.start);
  // window.end is exclusive; the visible end is end-1
  const lastVisible = Temporal.PlainDate.from(w.end).subtract({ days: 1 });
  const locale = props.locale;
  switch (view.value) {
    case 'day': {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(toDate(cursor.value));
    }
    case 'week': {
      // Intl's formatRange handles the collapse natively:
      //   same month → "April 12 – 18, 2026"
      //   month boundary → "Apr 27 – May 3, 2026"
      //   year boundary → "Dec 29, 2025 – Jan 4, 2026"
      const fmt = new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      return fmt.formatRange(toDate(start), toDate(lastVisible));
    }
    case 'month': {
      // Month view's window is the 6×7 grid; the LABEL should still be
      // the calendar-month the cursor sits in.
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      }).format(toDate(cursor.value));
    }
    case 'agenda': {
      const fmt = new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      return fmt.formatRange(toDate(start), toDate(lastVisible));
    }
    default:
      return '';
  }
});

function toDate(d: Temporal.PlainDate): Date {
  // Anchor at UTC midnight so Intl with timeZone:'UTC' renders the
  // exact calendar date and never drifts by a day.
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
}

// ─── View-switcher labels ────────────────────────────────────────

const viewLabels: Record<CalendarView, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  agenda: 'Agenda',
  timeline: 'Timeline',
  year: 'Year',
};

const viewSwitcherOptions = computed(() =>
  props.availableViews.map((v) => ({ value: v, label: viewLabels[v] })),
);

// ─── Header controls bag (passed to slots) ───────────────────────

const headerControls = computed<HeaderControls>(() => ({
  prev,
  next,
  goToToday,
  setView,
  rangeLabel: rangeLabel.value,
  view: view.value,
  available: props.availableViews,
}));

// ─── Imperative API ──────────────────────────────────────────────

const dayRef = useTemplateRef<InstanceType<typeof CoarDayView>>('dayView');
const weekRef = useTemplateRef<InstanceType<typeof CoarWeekView>>('weekView');
const monthRef = useTemplateRef<InstanceType<typeof CoarMonthView>>('monthView');
const agendaRef = useTemplateRef<InstanceType<typeof CoarAgendaView>>('agendaView');

defineExpose({
  goTo(iso: string) {
    date.value = iso;
  },
  goToToday,
  next,
  prev,
  setView,
  getVisibleRange: () => window.value,
  /**
   * Filter the events array to those whose start lies inside the
   * current visible window. Multi-day events are included if they
   * touch the window at any point.
   */
  getVisibleEvents(): CalendarEvent[] {
    const ws = window.value.start;
    const we = window.value.end; // exclusive
    return props.events.filter((e) => {
      const s = e.start.slice(0, 10);
      const eEnd = e.end ? e.end.slice(0, 10) : s;
      // overlaps if start < we && end >= ws
      return s < we && eEnd >= ws;
    });
  },
  scrollToTime(hour: number) {
    if (view.value === 'day') dayRef.value?.scrollToTime(hour);
    else if (view.value === 'week') weekRef.value?.scrollToTime(hour);
  },
  /** Forwarded for AgendaView. */
  scrollToDate(iso: string) {
    if (view.value === 'agenda') agendaRef.value?.scrollToDate(iso);
  },
  /** Direct sub-view ref (advanced consumers). */
  getActiveViewRef: () => {
    switch (view.value) {
      case 'day': return dayRef.value;
      case 'week': return weekRef.value;
      case 'month': return monthRef.value;
      case 'agenda': return agendaRef.value;
      default: return null;
    }
  },
});
</script>

<template>
  <div class="coar-calendar" :class="[`coar-calendar--density-${density}`]">
    <!-- ── Header ──────────────────────────────────────────────── -->
    <slot name="header" :view="view" :cursor="cursor" :range="window" :controls="headerControls">
      <header class="coar-calendar__header">
        <slot name="headerStart" :controls="headerControls" />
        <div class="coar-calendar__nav">
          <CoarButton
            variant="secondary"
            size="s"
            icon-start="chevron-left"
            aria-label="Previous"
            @click="prev"
          />
          <CoarButton variant="secondary" size="s" @click="goToToday">
            Today
          </CoarButton>
          <CoarButton
            variant="secondary"
            size="s"
            icon-start="chevron-right"
            aria-label="Next"
            @click="next"
          />
        </div>
        <span class="coar-calendar__range-label">{{ rangeLabel }}</span>
        <span class="coar-calendar__spacer" />
        <slot
          name="viewSwitcher"
          :view="view"
          :available="availableViews"
          :set-view="setView"
        >
          <CoarSegmentedControl
            v-model="view"
            :options="viewSwitcherOptions"
            size="s"
            aria-label="Change view"
          />
        </slot>
        <slot name="headerEnd" :controls="headerControls" />
      </header>
    </slot>

    <!-- ── Body: dispatch to the active view ───────────────────── -->
    <div class="coar-calendar__body">
      <CoarDayView
        v-if="view === 'day'"
        ref="dayView"
        :cursor="date"
        :events="events"
        :time-range="timeRange"
        :slot-duration="slotDuration"
        :pixels-per-hour="pixelsPerHour"
        :timezone="timezone"
        :locale="locale"
        :density="density"
        @event-click="emit('event-click', $event)"
        @date-click="emit('date-click', $event)"
        @time-click="emit('time-click', $event)"
      >
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
        <template v-if="$slots.allDayEvent" #allDayEvent="slotProps">
          <slot name="allDayEvent" v-bind="slotProps" />
        </template>
        <template v-if="$slots.dayHeader" #dayHeader="slotProps">
          <slot name="dayHeader" v-bind="slotProps" />
        </template>
      </CoarDayView>

      <CoarWeekView
        v-else-if="view === 'week'"
        ref="weekView"
        :cursor="date"
        :events="events"
        :first-day-of-week="resolvedFirstDayOfWeek"
        :time-range="timeRange"
        :slot-duration="slotDuration"
        :pixels-per-hour="pixelsPerHour"
        :timezone="timezone"
        :locale="locale"
        :density="density"
        @event-click="emit('event-click', $event)"
        @date-click="emit('date-click', $event)"
        @time-click="emit('time-click', $event)"
      >
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
        <template v-if="$slots.allDayEvent" #allDayEvent="slotProps">
          <slot name="allDayEvent" v-bind="slotProps" />
        </template>
        <template v-if="$slots.dayHeader" #dayHeader="slotProps">
          <slot name="dayHeader" v-bind="slotProps" />
        </template>
      </CoarWeekView>

      <CoarMonthView
        v-else-if="view === 'month'"
        ref="monthView"
        :cursor="date"
        :events="events"
        :first-day-of-week="resolvedFirstDayOfWeek"
        :max-events-per-cell="maxEventsPerCell"
        :timezone="timezone"
        :locale="locale"
        :density="density"
        @event-click="emit('event-click', $event)"
        @date-click="emit('date-click', $event)"
        @more-click="emit('more-click', $event)"
      >
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
        <template v-if="$slots.dayHeader" #dayHeader="slotProps">
          <slot name="dayHeader" v-bind="slotProps" />
        </template>
      </CoarMonthView>

      <CoarAgendaView
        v-else-if="view === 'agenda'"
        ref="agendaView"
        :range-start="window.start"
        :range-end="window.end"
        :events="events"
        :show-empty-days="showEmptyDays"
        :timezone="timezone"
        :locale="locale"
        :density="density"
        @event-click="emit('event-click', $event)"
        @date-click="emit('date-click', $event)"
      >
        <template v-if="$slots.event" #event="slotProps">
          <slot name="event" v-bind="slotProps" :view="view" />
        </template>
      </CoarAgendaView>
    </div>
  </div>
</template>

<style scoped>
.coar-calendar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--coar-background-neutral-primary);
  font-family: var(--coar-body-base-family);
  color: var(--coar-text-neutral-primary);
}

.coar-calendar__header {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-m);
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  background: var(--coar-background-neutral-primary);
  flex: 0 0 auto;
}

.coar-calendar__nav {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
}

.coar-calendar__range-label {
  font-size: var(--coar-component-m-font-size);
  font-weight: 600;
  color: var(--coar-text-neutral-primary);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-calendar__spacer {
  flex: 1 1 auto;
}

.coar-calendar__body {
  flex: 1 1 auto;
  min-height: 0; /* allow children's overflow:auto to work */
  overflow: hidden;
}
</style>
