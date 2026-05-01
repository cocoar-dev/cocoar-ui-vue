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

import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import {
  Temporal,
  dateKey,
  todayInZone,
  nowInZone,
  layoutDayEvents,
  type DayOfWeek,
  type CalendarEvent,
  type PositionedEvent,
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
  /** Custom day header (overrides default). */
  dayHeader(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

const emit = defineEmits<{
  /** User clicked an empty time slot. */
  'time-click': [{ date: Temporal.PlainDate; time: Temporal.PlainTime; native: PointerEvent }];
  /** User clicked an event. */
  'event-click': [{ event: CalendarEvent; native: PointerEvent }];
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
    <!-- Header row: blank cell over hour labels + one cell per day -->
    <div class="coar-time-grid__header">
      <div class="coar-time-grid__corner" aria-hidden="true" />
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
      <div class="coar-time-grid__columns">
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
          <!-- Events -->
          <div
            v-for="positioned in layout.positioned"
            :key="positioned.event.id"
            class="coar-time-grid__event"
            :class="{
              'coar-time-grid__event--clipped-top': positioned.clippedTop,
              'coar-time-grid__event--clipped-bottom': positioned.clippedBottom,
            }"
            :style="{
              top: minutesToPx(positioned.startMinutes) + 'px',
              height:
                Math.max(
                  16,
                  minutesToPx(positioned.endMinutes - positioned.startMinutes),
                ) + 'px',
              left: (positioned.lane / positioned.laneCount) * 100 + '%',
              width: 100 / positioned.laneCount + '%',
              background: eventBgFor(positioned.event),
              borderLeft: `3px solid ${eventBorderFor(positioned.event)}`,
            }"
            @pointerdown="onEventClick($event, positioned.event)"
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
}

.coar-time-grid__header {
  display: grid;
  grid-template-columns: 64px 1fr;
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-time-grid__corner { /* empty top-left cell */ }
.coar-time-grid__day-header {
  padding: 8px 12px;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  font-size: var(--coar-font-size-sm, 13px);
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-flow: column;
  grid-template-rows: 1fr;
  background: var(--coar-calendar-bg, #fff);
}
.coar-time-grid__day-header--today {
  color: var(--coar-color-accent, #2563eb);
}
.coar-time-grid__day-header--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}

.coar-time-grid__body {
  display: grid;
  grid-template-columns: 64px 1fr;
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
  margin: 1px 2px;
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
