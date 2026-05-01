<script setup lang="ts">
/**
 * `<CoarTimeGrid>` — the time-grid surface shared by the day and
 * week views.
 *
 * One hour-label column on the left, N day-columns to the right.
 * Slot lines are CSS background-gradients (no DOM nodes per slot,
 * no per-slot reflow). Events are absolutely positioned by
 * `transform: translate(x, y)` over each day column.
 *
 * Overlap resolution comes from `core/timeGridLayout`'s pure-
 * function `layoutDayEvents`, which delegates to Spike C's
 * interval-graph coloring.
 *
 * Now-marker is a thin horizontal line + dot on today's column,
 * updating every 30 seconds via setInterval (we don't need
 * sub-second precision for a wall-clock indicator).
 *
 * The component is FULLY headless on slot content: consumers
 * provide `#event` to render each event; we provide a sensible
 * default that reads `meta.title` / `meta.color`.
 */

import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watchEffect } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { useCalendarDnd } from '../composables/useCalendarDnd';
import {
  Temporal,
  dateKey,
  todayInZone,
  nowInZone,
  layoutDayEvents,
  layoutAllDayBand,
  type DayOfWeek,
  type CalendarEvent,
  type PositionedEvent,
  type AllDayBar,
} from '../core';

interface Props {
  /** One date per day-column to render. Length = number of columns. */
  days: ReadonlyArray<Temporal.PlainDate>;
  /** Events to layout across the days. */
  events: ReadonlyArray<CalendarEvent>;
  /** Visible hour range. Default `[0, 24]`. */
  timeRange?: [number, number];
  /** Subdivision in minutes for slot lines. Default 30. */
  slotDuration?: 5 | 10 | 15 | 30 | 60;
  /** Pixels per hour. Higher = taller grid. Default 60. */
  pixelsPerHour?: number;
  /** IANA timezone for resolving timed events. Default `'UTC'`. */
  timezone?: string;
  /** BCP-47 locale for day-header formatting. Default `'en-US'`. */
  locale?: string;
  /** Density of event cards. */
  density?: 'comfortable' | 'compact';
}

const props = withDefaults(defineProps<Props>(), {
  timeRange: () => [0, 24],
  slotDuration: 30,
  pixelsPerHour: 60,
  timezone: 'UTC',
  locale: 'en-US',
  density: 'comfortable',
});

defineSlots<{
  /** Render an event card. Receives the event + its layout. */
  event(props: { event: CalendarEvent; layout: PositionedEvent }): unknown;
  /** Render an all-day bar (overrides default). */
  allDayEvent(props: { event: CalendarEvent; layout: AllDayBar }): unknown;
  /** Custom day header (overrides default). */
  dayHeader(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

const { t } = useI18n();

// ─── Drag & Drop ──────────────────────────────────────────────────────

const columnsRef = useTemplateRef<HTMLElement>('columns');

/**
 * Find the nearest scrollable ancestor of the columns container.
 * `<CoarCalendar>` uses `.coar-calendar__body` as the scroll
 * surface; standalone callers may wrap us in their own `overflow:
 * auto` container. Walk up until we find one — or fall back to
 * `null` to disable auto-scroll.
 */
const surfaceRef = computed<HTMLElement | null>(() => {
  let el: HTMLElement | null = columnsRef.value;
  while (el && el !== document.body) {
    const overflowY = window.getComputedStyle(el).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
    el = el.parentElement;
  }
  return null;
});

const daysRef = computed(() => props.days);
const timeRangeRef = computed(() => props.timeRange);
const pixelsPerHourRef = computed(() => props.pixelsPerHour);
const slotDurationRef = computed(() => props.slotDuration);

const dnd = useCalendarDnd({
  surfaceRef,
  columnsRef,
  days: daysRef,
  timeRange: timeRangeRef,
  pixelsPerHour: pixelsPerHourRef,
  slotDuration: slotDurationRef,
  onEventClick: (event, native) => {
    if (native) emit('event-click', { event, native });
  },
  onEventDrop: (payload) => {
    emit('event-drop', payload);
  },
});

const emit = defineEmits<{
  /** User clicked an empty time slot. */
  'time-click': [{ date: Temporal.PlainDate; time: Temporal.PlainTime; native: PointerEvent }];
  /** User clicked an empty all-day band day cell. */
  'date-click': [{ date: Temporal.PlainDate; native: PointerEvent }];
  /** User clicked an event (timed or all-day). */
  'event-click': [{ event: CalendarEvent; native: PointerEvent }];
  /**
   * User dropped a timed event after dragging it. Consumer applies
   * `next` to its data store; the calendar does not mutate `events`
   * directly. `target` is the snapped slot the pointer landed on.
   */
  'event-drop': [{
    event: CalendarEvent;
    original: { start: string; end?: string };
    next: { start: string; end?: string };
    target: { date: string; minutes: number };
    native: PointerEvent | null;
  }];
}>();

// ─── Geometry ─────────────────────────────────────────────────────────

const totalHours = computed(() => props.timeRange[1] - props.timeRange[0]);
const totalMinutes = computed(() => totalHours.value * 60);
const totalHeightPx = computed(() => totalHours.value * props.pixelsPerHour);

const slotHeightPx = computed(
  () => (props.pixelsPerHour * props.slotDuration) / 60,
);

const hourLabels = computed(() => {
  const labels: { hour: number; label: string }[] = [];
  const fmt = new Intl.DateTimeFormat(props.locale, {
    hour: 'numeric',
    hour12: undefined, // let Intl decide based on locale
  });
  for (let h = props.timeRange[0]; h <= props.timeRange[1]; h++) {
    const ref = new Date(2024, 0, 1, h);
    labels.push({ hour: h, label: fmt.format(ref) });
  }
  return labels;
});

// ─── Per-day event layout ─────────────────────────────────────────────

interface DayLayout {
  date: Temporal.PlainDate;
  positioned: PositionedEvent[];
}

const dayLayouts = computed<DayLayout[]>(() => {
  return props.days.map((day) => ({
    date: day,
    positioned: layoutDayEvents(props.events, {
      day,
      timeRange: props.timeRange,
      timezone: props.timezone,
    }),
  }));
});

// All-day band: filtered to all-day + multi-day-all-day events,
// laid out across the visible day columns. Empty when no all-day
// events match — band hides itself.
const allDayBars = computed<AllDayBar[]>(() => {
  return layoutAllDayBand(props.events, {
    days: props.days,
    timezone: props.timezone,
  });
});

const allDayLaneCount = computed(() =>
  allDayBars.value.length === 0 ? 0 : allDayBars.value[0].laneCount,
);

const ALL_DAY_LANE_HEIGHT = 24;
const ALL_DAY_LANE_GAP = 2;
const allDayBandHeight = computed(() => {
  if (allDayLaneCount.value === 0) return 0;
  return allDayLaneCount.value * (ALL_DAY_LANE_HEIGHT + ALL_DAY_LANE_GAP) + 8;
});

// Convert minutes-from-day-start to pixels.
function minutesToPx(min: number): number {
  return (min * props.pixelsPerHour) / 60;
}

// ─── Now-marker ───────────────────────────────────────────────────────

const today = ref<Temporal.PlainDate>(todayInZone(props.timezone));
const now = ref<Temporal.ZonedDateTime>(nowInZone(props.timezone));
let nowTimer = 0;

onMounted(() => {
  // Update every 30s — sub-second is overkill for a clock indicator.
  nowTimer = window.setInterval(() => {
    today.value = todayInZone(props.timezone);
    now.value = nowInZone(props.timezone);
  }, 30_000);
});
onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer);
});

watchEffect(() => {
  // Re-pick today/now when the timezone prop changes.
  today.value = todayInZone(props.timezone);
  now.value = nowInZone(props.timezone);
});

const nowMinutesFromGridStart = computed(() => {
  const minutes =
    now.value.hour * 60 + now.value.minute - props.timeRange[0] * 60;
  if (minutes < 0 || minutes >= totalMinutes.value) return null;
  return minutes;
});

function isTodayColumn(date: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(date, today.value) === 0;
}

function isWeekend(date: Temporal.PlainDate): boolean {
  const dow = date.dayOfWeek; // 1..7 ISO
  return dow === 6 || dow === 7;
}

// ─── Click handling ──────────────────────────────────────────────────

const dayHeaderFormatter = computed(
  () =>
    new Intl.DateTimeFormat(props.locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
);

function formatDayHeader(date: Temporal.PlainDate): string {
  // Convert to JS Date for Intl. UTC interpretation here is fine —
  // we're only formatting day-of-week + day-of-month.
  return dayHeaderFormatter.value.format(
    new Date(Date.UTC(date.year, date.month - 1, date.day)),
  );
}

function onColumnPointerDown(e: PointerEvent, date: Temporal.PlainDate) {
  const col = e.currentTarget as HTMLElement;
  const rect = col.getBoundingClientRect();
  const yInColumn = e.clientY - rect.top;
  // Snap to nearest slot boundary.
  const snappedSlots = Math.floor(yInColumn / slotHeightPx.value);
  const minutesFromStart = snappedSlots * props.slotDuration;
  const totalMinFromMidnight = props.timeRange[0] * 60 + minutesFromStart;
  const hour = Math.floor(totalMinFromMidnight / 60);
  const minute = totalMinFromMidnight % 60;
  if (hour < 0 || hour >= 24) return;
  emit('time-click', {
    date,
    time: Temporal.PlainTime.from({ hour, minute }),
    native: e,
  });
}

function onAllDayCellPointerDown(e: PointerEvent, date: Temporal.PlainDate) {
  emit('date-click', { date, native: e });
}

function onEventClick(e: PointerEvent, event: CalendarEvent) {
  e.stopPropagation();
  emit('event-click', { event, native: e });
}

// ─── Default event card content ──────────────────────────────────────
//
// Reads `meta.title` / `meta.color` if present. Consumers needing
// more replace via the `#event` slot.

function eventTitle(event: CalendarEvent): string {
  const meta = event.meta as { title?: unknown } | undefined;
  return typeof meta?.title === 'string' ? meta.title : '(untitled)';
}
function eventColor(event: CalendarEvent): string | undefined {
  const meta = event.meta as { color?: unknown } | undefined;
  return typeof meta?.color === 'string' ? meta.color : undefined;
}
function eventBgFor(event: CalendarEvent): string {
  const c = eventColor(event);
  return c ?? 'var(--coar-color-accent-soft, #93c5fd)';
}
function eventBorderFor(event: CalendarEvent): string {
  const c = eventColor(event);
  return c ?? 'var(--coar-color-accent, #2563eb)';
}

defineExpose({
  /** Layout snapshot per day — useful for tests. */
  getLayout: (): readonly DayLayout[] => dayLayouts.value,
});

// Used in templates where DayOfWeek hover-class is convenient.
void ({} as DayOfWeek);
void dateKey;
</script>

<template>
  <div
    class="coar-time-grid"
    :class="[
      `coar-time-grid--density-${density}`,
    ]"
  >
    <!--
      Sticky-top wrapper. Holds both the day-of-week header AND the
      all-day band so they pin together at the top of the scroll
      container regardless of either one's actual height. The
      previous "two independent stickies with a fixed
      `--coar-time-grid-header-height: 36px` offset" approach broke
      whenever the day-header wrapped to two lines (e.g. narrow
      column widths), because the all-day band's `top: 36px` didn't
      match the header's actual rendered height.
    -->
    <div class="coar-time-grid__sticky-top">
    <!-- Header row: blank cell over hour labels + one cell per day -->
    <div class="coar-time-grid__header">
      <div class="coar-time-grid__corner" aria-hidden="true" />
      <div class="coar-time-grid__day-headers">
        <div
          v-for="day in days"
          :key="day.toString()"
          class="coar-time-grid__day-header"
          :class="{
            'coar-time-grid__day-header--today': isTodayColumn(day),
            'coar-time-grid__day-header--weekend': isWeekend(day),
          }"
        >
          <slot
            name="dayHeader"
            :date="day"
            :is-today="isTodayColumn(day)"
            :is-weekend="isWeekend(day)"
          >
            <span class="coar-time-grid__day-header-label">
              {{ formatDayHeader(day) }}
            </span>
          </slot>
        </div>
      </div>
    </div>

    <!-- All-day band (between header and body, only if there are any) -->
    <div
      v-if="allDayLaneCount > 0"
      class="coar-time-grid__all-day-band"
      :style="{ minHeight: allDayBandHeight + 'px' }"
    >
      <div class="coar-time-grid__all-day-axis">{{ t('coar.calendar.timegrid.allDay', undefined, 'all-day') }}</div>
      <div class="coar-time-grid__all-day-columns">
        <!-- Background day cells (clickable for date-click) -->
        <div
          v-for="(day, i) in days"
          :key="day.toString()"
          class="coar-time-grid__all-day-cell"
          :class="{
            'coar-time-grid__all-day-cell--today': isTodayColumn(day),
            'coar-time-grid__all-day-cell--weekend': isWeekend(day),
          }"
          :style="{ gridColumn: i + 1 }"
          @pointerdown="onAllDayCellPointerDown($event, day)"
        />
        <!--
          All-day bars on top of the day-cell background.
          Same calc()-based inset as timed events: 2 px gap left and
          right, box-sizing: border-box (in scoped CSS), so the
          rightmost bar's right edge sits exactly inside the band —
          no overflow, no overlap with adjacent bars.
        -->
        <div
          v-for="bar in allDayBars"
          :key="bar.event.id"
          class="coar-time-grid__all-day-bar"
          :class="{
            'coar-time-grid__all-day-bar--clipped-start': bar.clippedStart,
            'coar-time-grid__all-day-bar--clipped-end': bar.clippedEnd,
          }"
          :style="{
            top: 4 + bar.lane * (ALL_DAY_LANE_HEIGHT + ALL_DAY_LANE_GAP) + 'px',
            left: `calc(${(bar.startCol / days.length) * 100}% + 2px)`,
            width: `calc(${((bar.endCol - bar.startCol + 1) / days.length) * 100}% - 4px)`,
            height: ALL_DAY_LANE_HEIGHT + 'px',
            background: eventBgFor(bar.event),
            borderLeft: bar.clippedStart
              ? 'none'
              : `3px solid ${eventBorderFor(bar.event)}`,
          }"
          @pointerdown="onEventClick($event, bar.event)"
        >
          <slot name="allDayEvent" :event="bar.event" :layout="bar">
            <span class="coar-time-grid__all-day-bar-title">
              {{ eventTitle(bar.event) }}
            </span>
          </slot>
        </div>
      </div>
    </div>
    </div>
    <!-- /sticky-top wrapper -->

    <!-- Grid body: hour labels + day columns -->
    <div
      class="coar-time-grid__body"
      :style="{ height: totalHeightPx + 'px' }"
    >
      <!-- Hour labels (left axis) -->
      <div
        class="coar-time-grid__hour-axis"
        :style="{ height: totalHeightPx + 'px' }"
      >
        <div
          v-for="entry in hourLabels"
          :key="entry.hour"
          class="coar-time-grid__hour-label"
          :style="{
            top: minutesToPx((entry.hour - timeRange[0]) * 60) + 'px',
          }"
        >
          {{ entry.label }}
        </div>
      </div>

      <!-- Day columns -->
      <div ref="columns" class="coar-time-grid__columns">
        <div
          v-for="layout in dayLayouts"
          :key="layout.date.toString()"
          class="coar-time-grid__column"
          :class="{
            'coar-time-grid__column--today': isTodayColumn(layout.date),
            'coar-time-grid__column--weekend': isWeekend(layout.date),
          }"
          :style="{
            height: totalHeightPx + 'px',
            backgroundImage:
              `repeating-linear-gradient(to bottom,` +
              ` transparent 0,` +
              ` transparent ${slotHeightPx - 1}px,` +
              ` var(--coar-calendar-grid-line, #e3e5e9) ${slotHeightPx - 1}px,` +
              ` var(--coar-calendar-grid-line, #e3e5e9) ${slotHeightPx}px)`,
          }"
          @pointerdown="onColumnPointerDown($event, layout.date)"
        >
          <!--
            Events.
            Lane-aware horizontal positioning uses calc() with pixel
            gaps inside the percentage so the right edge of the
            rightmost lane sits exactly INSIDE the column — not 4 px
            past it like with margin-based offsets. With box-sizing:
            border-box (in scoped CSS) the 3 px left-border lives
            inside the box.
            z-index = lane + 1: lane 0 in back, higher lanes in
            front, matching Google / Outlook conventions ("rightmost
            lane is on top"). Without it, DOM order (= input event
            order) decides who covers whom, which is unpredictable.
          -->
          <div
            v-for="positioned in layout.positioned"
            :key="positioned.event.id"
            class="coar-time-grid__event"
            :class="{
              'coar-time-grid__event--clipped-top': positioned.clippedTop,
              'coar-time-grid__event--clipped-bottom': positioned.clippedBottom,
              'coar-time-grid__event--dragging':
                dnd.isDragging.value && dnd.draggedEvent.value?.id === positioned.event.id,
            }"
            :style="{
              top: minutesToPx(positioned.startMinutes) + 'px',
              height:
                Math.max(
                  16,
                  minutesToPx(positioned.endMinutes - positioned.startMinutes),
                ) + 'px',
              left: `calc(${(positioned.lane / positioned.laneCount) * 100}% + 2px)`,
              width: `calc(${100 / positioned.laneCount}% - 4px)`,
              zIndex: positioned.lane + 1,
              background: eventBgFor(positioned.event),
              borderLeft: `3px solid ${eventBorderFor(positioned.event)}`,
            }"
            @pointerdown="dnd.startDrag(positioned.event)($event)"
          >
            <slot name="event" :event="positioned.event" :layout="positioned">
              <div class="coar-time-grid__event-default">
                <span class="coar-time-grid__event-title">
                  {{ eventTitle(positioned.event) }}
                </span>
              </div>
            </slot>
          </div>

          <!-- Now-marker on today's column -->
          <div
            v-if="isTodayColumn(layout.date) && nowMinutesFromGridStart !== null"
            class="coar-time-grid__now-marker"
            :style="{ top: minutesToPx(nowMinutesFromGridStart) + 'px' }"
            aria-hidden="true"
          >
            <span class="coar-time-grid__now-dot" />
            <span class="coar-time-grid__now-line" />
          </div>

          <!-- Drop indicator: thin line at the snapped target slot
               on the matching day-column. Rendered while dragging. -->
          <div
            v-if="
              dnd.isDragging.value
                && dnd.dropTarget.value?.date === layout.date.toString()
            "
            class="coar-time-grid__drop-indicator"
            :style="{
              top:
                minutesToPx(
                  (dnd.dropTarget.value!.minutes - timeRange[0] * 60),
                ) + 'px',
            }"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-time-grid {
  display: flex;
  flex-direction: column;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  font-variant-numeric: tabular-nums;
  background: var(--coar-calendar-bg, #fff);
  /*
   * Sticky-header stack:
   *   --header-height: top sticky band (day-of-week labels)
   *   --all-day-stick-top: where the all-day band starts sticking
   *
   * `position: sticky` resolves against the nearest scroll
   * ancestor — typically the consumer's outer container with
   * `overflow-y: auto`. The header floats over the time-grid body
   * as the user scrolls down through the hours; the all-day band
   * floats just below the header so multi-day events stay visible
   * the whole time. Everything inside the body (hour labels,
   * events, now-marker) scrolls naturally underneath.
   */
  --coar-time-grid-header-height: 36px;
  /* Width of the left axis column (hour labels + "all-day" label).
     Wide enough that the localized all-day label ("ALL-DAY",
     "GANZTAGS", …) fits on one line at 11 px uppercase + 0.04 em
     letter-spacing, with a comfortable breathing margin. */
  --coar-time-grid-axis-width: 80px;
}

/*
 * The day-of-week header and the all-day band share a single
 * sticky parent (`.coar-time-grid__sticky-top`). Inside it, both
 * are normal-flow children — their actual rendered heights stack
 * naturally without anyone having to know an offset in advance.
 */
.coar-time-grid__sticky-top {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--coar-calendar-bg, #fff);
}

.coar-time-grid__header {
  display: grid;
  grid-template-columns: var(--coar-time-grid-axis-width) 1fr;
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
  background: var(--coar-calendar-bg, #fff);
  min-height: var(--coar-time-grid-header-height);
}
.coar-time-grid__corner { /* empty top-left cell */ }
.coar-time-grid__day-headers {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}
.coar-time-grid__day-header {
  padding: 8px 12px;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  font-size: var(--coar-font-size-sm, 13px);
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
  background: var(--coar-calendar-bg, #fff);
}
.coar-time-grid__day-header--today {
  color: var(--coar-color-accent, #2563eb);
}
.coar-time-grid__day-header--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}

.coar-time-grid__all-day-band {
  display: grid;
  grid-template-columns: var(--coar-time-grid-axis-width) 1fr;
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
  background: var(--coar-calendar-bg, #fff);
  font-size: var(--coar-font-size-xs, 11px);
}
.coar-time-grid__all-day-axis {
  border-right: 1px solid var(--coar-calendar-border, #d1d5db);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-subtle, #6c7280);
  padding: 4px 6px;
  /*
   * Allow the localized label to wrap. The band uses `min-height`
   * (set inline based on lane count), not a fixed height — so when
   * wrapping makes the row taller, the cells grow with it and the
   * border-bottom stays correctly anchored.
   * `--coar-time-grid-axis-width: 80 px` is a comfortable default
   * for English / German; longer locales just take an extra line.
   */
  align-self: start;
  line-height: 1.2;
}
.coar-time-grid__all-day-columns {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}
.coar-time-grid__all-day-cell {
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  cursor: pointer;
}
.coar-time-grid__all-day-cell--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-time-grid__all-day-cell--today {
  background: var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04));
}
.coar-time-grid__all-day-bar {
  position: absolute;
  /* Same box-sizing rule as timed events — calc()-based left+width
     in the inline style sets the visual inset. */
  box-sizing: border-box;
  padding: 2px 6px;
  border-radius: 3px;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  contain: layout paint;
}
.coar-time-grid__all-day-bar-title {
  font-weight: 600;
  text-overflow: ellipsis;
  overflow: hidden;
  color: var(--coar-text-base, #1a1c1f);
}
.coar-time-grid__all-day-bar--clipped-start { border-top-left-radius: 0; border-bottom-left-radius: 0; }
.coar-time-grid__all-day-bar--clipped-end   { border-top-right-radius: 0; border-bottom-right-radius: 0; }

.coar-time-grid__body {
  display: grid;
  grid-template-columns: var(--coar-time-grid-axis-width) 1fr;
  position: relative;
  overflow: hidden;
}
.coar-time-grid__hour-axis {
  position: relative;
  border-right: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-time-grid__hour-label {
  position: absolute;
  left: 0;
  right: 8px;
  transform: translateY(-50%);
  text-align: right;
  font-size: var(--coar-font-size-xs, 11px);
  color: var(--coar-text-subtle, #6c7280);
  padding-right: 8px;
}

.coar-time-grid__columns {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  position: relative;
}

.coar-time-grid__column {
  position: relative;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  background: var(--coar-calendar-bg, #fff);
  contain: layout paint;
}
.coar-time-grid__column--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-time-grid__column--today {
  background: var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04));
}

.coar-time-grid__event {
  position: absolute;
  /* `box-sizing: border-box` so the calc()-based width/left in
     the inline style includes the 3 px left-border without bleeding
     past the column. */
  box-sizing: border-box;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: var(--coar-font-size-sm, 13px);
  cursor: pointer;
  overflow: hidden;
  user-select: none;
  /* Compositor-cheap. */
  contain: layout paint;
}
.coar-time-grid__event--clipped-top { border-top: 0; }
.coar-time-grid__event--clipped-bottom { border-bottom: 0; }
.coar-time-grid__event--dragging {
  /* Dimmed while user is dragging this event so it visually anchors
     the drop indicator without competing for attention. */
  opacity: 0.4;
  cursor: grabbing;
}

/*
 * Drop indicator: a 2 px accent line at the snapped target slot
 * inside the matching day-column. `pointer-events: none` so it
 * never steals events from the column underneath.
 */
.coar-time-grid__drop-indicator {
  position: absolute;
  left: 2px;
  right: 2px;
  height: 2px;
  background: var(--coar-background-accent-primary, #2563eb);
  border-radius: 1px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.coar-time-grid__event-default {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.coar-time-grid__event-title {
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.coar-time-grid__now-marker {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 5;
}
.coar-time-grid__now-dot {
  position: absolute;
  left: -4px;
  top: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--coar-color-danger, #dc2626);
}
.coar-time-grid__now-line {
  display: block;
  height: 1px;
  background: var(--coar-color-danger, #dc2626);
}

/* Density */
.coar-time-grid--density-compact .coar-time-grid__event {
  font-size: var(--coar-font-size-xs, 11px);
  padding: 1px 4px;
}
.coar-time-grid--density-compact .coar-time-grid__day-header {
  padding: 4px 8px;
  font-size: var(--coar-font-size-xs, 11px);
}
</style>
