<script setup lang="ts">
/**
 * `<CoarMonthView>` — month grid (6 × 7 = 42 cells), pagination mode.
 *
 * Layout:
 *
 *   ┌────────────────────────────────────────────────┐
 *   │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun │  ← weekday header
 *   ├──────┼──────┼──────┼──────┼──────┼──────┼─────┤
 *   │  1   │  2   │  3   │  4   │  5   │  6   │  7  │  ← cells per week
 *   │ ░░░░░ Conference (Mon-Wed) ░░░░░ │            │  ← multi-day bar
 *   │             │ • Standup  │       │            │  ← single-day pills
 *   │             │ • Lunch    │       │            │
 *   ├──────┼──────┼──────┼──────┼──────┼──────┼─────┤
 *   │  8   │  9   │ 10   │ 11   │ 12   │ 13   │ 14  │
 *   │ ...                                                │
 *
 * The 6 × 7 grid is a CSS grid; weekday headers in row 0, week
 * rows in rows 1-6. Multi-day bars are absolute-positioned over
 * the cells, using the bars' (lane, startCol, endCol) to span
 * across cells WITHIN a single week row.
 *
 * Per design doc v0.2 §6.1: continuous-scroll mode lands later
 * (Phase 2.3d). This file implements pagination mode only — one
 * month at a time, prev/next emits update the cursor.
 *
 * Pure-function layout from `core/monthGridLayout.ts`. Vue layer
 * is thin: render the grid, position the bars, plumb click events.
 */

import { computed, ref } from 'vue';
import {
  Temporal,
  monthGridDates,
  layoutMonthGrid,
  localizedWeekdayNames,
  todayInZone,
  dateKey,
  type CalendarEvent,
  type DayOfWeek,
  type MonthMultiDayBar,
  type MonthCellPill,
} from '../core';

interface Props {
  /** ISO date string for any date inside the month to render. */
  cursor: string;
  events: ReadonlyArray<CalendarEvent>;
  firstDayOfWeek?: DayOfWeek;
  /** Max event pills per cell before "+N more" link appears. */
  maxEventsPerCell?: number;
  timezone?: string;
  locale?: string;
  density?: 'comfortable' | 'compact';
}

const props = withDefaults(defineProps<Props>(), {
  firstDayOfWeek: 1,
  maxEventsPerCell: 3,
  timezone: 'UTC',
  locale: 'en-US',
  density: 'comfortable',
});

defineSlots<{
  /** Render a single-day pill. Default reads meta.title / meta.color. */
  pill(props: { event: CalendarEvent; pill: MonthCellPill }): unknown;
  /** Render a multi-day bar. Default reads meta.title / meta.color. */
  multiDayBar(props: { event: CalendarEvent; bar: MonthMultiDayBar }): unknown;
}>();

const emit = defineEmits<{
  /** User clicked an empty area of a cell. */
  'date-click': [{ date: Temporal.PlainDate; native: PointerEvent }];
  /** User clicked an event (pill or bar). */
  'event-click': [{ event: CalendarEvent; native: PointerEvent }];
  /** User clicked the "+N more" link. */
  'more-click': [{ date: Temporal.PlainDate; events: CalendarEvent[]; native: PointerEvent }];
}>();

// ─── Grid + layout ───────────────────────────────────────────────────

const yearMonth = computed(() => {
  const cur = Temporal.PlainDate.from(props.cursor);
  return Temporal.PlainYearMonth.from({ year: cur.year, month: cur.month });
});

const gridDates = computed(() =>
  monthGridDates(yearMonth.value, props.firstDayOfWeek),
);

const layout = computed(() =>
  layoutMonthGrid(props.events, {
    gridDates: gridDates.value,
    timezone: props.timezone,
  }),
);

const weekdayHeaders = computed(() =>
  localizedWeekdayNames(props.locale, props.firstDayOfWeek, 'short'),
);

// ─── Decoration helpers ─────────────────────────────────────────────

const today = ref<Temporal.PlainDate>(todayInZone(props.timezone));

function isToday(d: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(d, today.value) === 0;
}
function isOtherMonth(d: Temporal.PlainDate): boolean {
  return d.year !== yearMonth.value.year || d.month !== yearMonth.value.month;
}
function isWeekend(d: Temporal.PlainDate): boolean {
  // Temporal: 1..7 = Mon..Sun
  return d.dayOfWeek === 6 || d.dayOfWeek === 7;
}

// ─── Bar geometry ────────────────────────────────────────────────────

const BAR_HEIGHT = 20;
const BAR_GAP = 2;
/** Pixels reserved at the top of each cell for the day-number badge. */
const DAY_NUMBER_HEIGHT = 24;

/** Top offset of a multi-day bar inside its row (relative to cell top). */
function barTopPx(lane: number): number {
  return DAY_NUMBER_HEIGHT + lane * (BAR_HEIGHT + BAR_GAP);
}

/**
 * For each row, compute how many lanes the multi-day bars occupy
 * (so the cell-pill block knows where to start vertically).
 */
const rowBarHeightsPx = computed(() => {
  return layout.value.weekRows.map((row) => {
    if (row.multiDayBars.length === 0) return DAY_NUMBER_HEIGHT;
    const lanes = row.multiDayBars[0].laneCount;
    return DAY_NUMBER_HEIGHT + lanes * (BAR_HEIGHT + BAR_GAP);
  });
});

// ─── Pill shaping ────────────────────────────────────────────────────

interface VisiblePillsForCell {
  visible: MonthCellPill[];
  overflowCount: number;
  overflowEvents: CalendarEvent[];
}

/**
 * Pre-computed visible / overflow split per cell, indexed by
 * `dateKey()`. Re-derived whenever events / layout / maxEventsPerCell
 * change. Lookup in the template is O(1).
 */
const pillsByDayKey = computed<Map<string, VisiblePillsForCell>>(() => {
  const out = new Map<string, VisiblePillsForCell>();
  for (const row of layout.value.weekRows) {
    for (const day of row.days) {
      const key = dateKey(day);
      const cellPills = row.cellPills.get(key) ?? [];
      if (cellPills.length <= props.maxEventsPerCell) {
        out.set(key, {
          visible: [...cellPills],
          overflowCount: 0,
          overflowEvents: [],
        });
      } else {
        const visible = cellPills.slice(0, props.maxEventsPerCell - 1);
        const overflowEvents = cellPills.slice(visible.length).map((p) => p.event);
        out.set(key, {
          visible,
          overflowCount: cellPills.length - visible.length,
          overflowEvents,
        });
      }
    }
  }
  return out;
});

function pillsFor(day: Temporal.PlainDate): VisiblePillsForCell {
  return (
    pillsByDayKey.value.get(dateKey(day)) ?? {
      visible: [],
      overflowCount: 0,
      overflowEvents: [],
    }
  );
}

// ─── Click handlers ──────────────────────────────────────────────────

function onCellClick(e: PointerEvent, date: Temporal.PlainDate) {
  emit('date-click', { date, native: e });
}
function onEventClick(e: PointerEvent, event: CalendarEvent) {
  e.stopPropagation();
  emit('event-click', { event, native: e });
}
function onMoreClick(
  e: PointerEvent,
  date: Temporal.PlainDate,
  events: CalendarEvent[],
) {
  e.stopPropagation();
  emit('more-click', { date, events, native: e });
}

// ─── Default event rendering ─────────────────────────────────────────

function eventTitle(event: CalendarEvent): string {
  const meta = event.meta as { title?: unknown } | undefined;
  return typeof meta?.title === 'string' ? meta.title : '(untitled)';
}
function eventColor(event: CalendarEvent): string | undefined {
  const meta = event.meta as { color?: unknown } | undefined;
  return typeof meta?.color === 'string' ? meta.color : undefined;
}
function eventBgFor(event: CalendarEvent): string {
  return eventColor(event) ?? 'var(--coar-color-accent-soft, #93c5fd)';
}
function eventBorderFor(event: CalendarEvent): string {
  return eventColor(event) ?? 'var(--coar-color-accent, #2563eb)';
}

defineExpose({
  /** Snapshot of the current layout — useful for tests. */
  getLayout: () => layout.value,
  /** Move cursor to first-of-month for the visible month. */
  startOfMonth: () => yearMonth.value.toPlainDate({ day: 1 }).toString(),
});
</script>

<template>
  <div
    class="coar-month-view"
    :class="[`coar-month-view--density-${density}`]"
  >
    <!-- Weekday header row -->
    <div class="coar-month-view__weekday-row">
      <div
        v-for="(name, i) in weekdayHeaders"
        :key="i"
        class="coar-month-view__weekday-cell"
      >
        {{ name }}
      </div>
    </div>

    <!-- 6 week rows -->
    <div
      v-for="(row, rowIndex) in layout.weekRows"
      :key="row.weekStart.toString()"
      class="coar-month-view__week-row"
    >
      <!-- Day cells (background layer) -->
      <div
        v-for="day in row.days"
        :key="day.toString()"
        class="coar-month-view__cell"
        :class="{
          'coar-month-view__cell--today': isToday(day),
          'coar-month-view__cell--other-month': isOtherMonth(day),
          'coar-month-view__cell--weekend': isWeekend(day),
        }"
        @pointerdown="onCellClick($event, day)"
      >
        <div class="coar-month-view__day-number-row">
          <span class="coar-month-view__day-number">{{ day.day }}</span>
        </div>

        <!-- Single-day pills, offset below the multi-day bars -->
        <div
          class="coar-month-view__pills"
          :style="{ marginTop: (rowBarHeightsPx[rowIndex] - DAY_NUMBER_HEIGHT) + 'px' }"
        >
          <div
            v-for="pill in pillsFor(day).visible"
            :key="pill.event.id"
            class="coar-month-view__pill"
            :style="{
              background: eventBgFor(pill.event),
              borderLeft: `3px solid ${eventBorderFor(pill.event)}`,
            }"
            @pointerdown="onEventClick($event, pill.event)"
          >
            <slot name="pill" :event="pill.event" :pill="pill">
              <span class="coar-month-view__pill-title">
                {{ eventTitle(pill.event) }}
              </span>
            </slot>
          </div>
          <button
            v-if="pillsFor(day).overflowCount > 0"
            class="coar-month-view__more"
            @pointerdown.stop="onMoreClick($event, day, pillsFor(day).overflowEvents)"
          >
            +{{ pillsFor(day).overflowCount }} more
          </button>
        </div>
      </div>

      <!-- Multi-day bars overlay (one absolute-positioned <div> per bar) -->
      <div
        v-for="bar in row.multiDayBars"
        :key="bar.event.id"
        class="coar-month-view__bar"
        :class="{
          'coar-month-view__bar--clipped-start': bar.clippedStart,
          'coar-month-view__bar--clipped-end': bar.clippedEnd,
        }"
        :style="{
          top: barTopPx(bar.lane) + 'px',
          left: `calc(${(bar.startCol / 7) * 100}% + 2px)`,
          width: `calc(${((bar.endCol - bar.startCol + 1) / 7) * 100}% - 4px)`,
          height: BAR_HEIGHT + 'px',
          background: eventBgFor(bar.event),
          borderLeft: bar.clippedStart
            ? 'none'
            : `3px solid ${eventBorderFor(bar.event)}`,
          zIndex: bar.lane + 1,
        }"
        @pointerdown="onEventClick($event, bar.event)"
      >
        <slot name="multiDayBar" :event="bar.event" :bar="bar">
          <span class="coar-month-view__bar-title">
            {{ eventTitle(bar.event) }}
          </span>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-month-view {
  display: flex;
  flex-direction: column;
  background: var(--coar-calendar-bg, #fff);
  border: 1px solid var(--coar-calendar-border, #d1d5db);
  border-radius: var(--coar-radius-md, 8px);
  overflow: hidden;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  font-variant-numeric: tabular-nums;
}

.coar-month-view__weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-month-view__weekday-cell {
  padding: 8px 12px;
  font-size: var(--coar-font-size-xs, 11px);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-subtle, #6c7280);
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-month-view__weekday-cell:first-child {
  border-left: none;
}

.coar-month-view__week-row {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 100px;
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-month-view__week-row:last-child {
  border-bottom: none;
}

.coar-month-view__cell {
  position: relative;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  background: var(--coar-calendar-bg, #fff);
  contain: layout paint;
}
.coar-month-view__cell:first-child { border-left: none; }
.coar-month-view__cell--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-month-view__cell--other-month {
  background: var(--coar-calendar-bg-other-month, #fafafb);
  color: var(--coar-text-subtle, #9ca3af);
}
.coar-month-view__cell--today {
  background: var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04));
}

.coar-month-view__day-number-row {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  height: 24px;
  box-sizing: border-box;
}
.coar-month-view__day-number {
  font-size: var(--coar-font-size-sm, 13px);
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
}
.coar-month-view__cell--today .coar-month-view__day-number {
  color: var(--coar-color-accent, #2563eb);
}
.coar-month-view__cell--other-month .coar-month-view__day-number {
  color: var(--coar-text-subtle, #9ca3af);
  font-weight: 500;
}

.coar-month-view__pills {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 4px 4px 4px;
  /* margin-top is set inline based on the row's bar count, so the
     pills sit BELOW the multi-day bars no matter how many lanes
     are above. */
}
.coar-month-view__pill {
  font-size: var(--coar-font-size-xs, 11px);
  padding: 1px 6px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}
.coar-month-view__pill-title {
  color: var(--coar-text-base, #1a1c1f);
  font-weight: 600;
}
.coar-month-view__more {
  align-self: flex-start;
  background: transparent;
  border: 0;
  padding: 1px 6px;
  font-size: var(--coar-font-size-xs, 11px);
  color: var(--coar-color-accent, #2563eb);
  cursor: pointer;
  font-weight: 600;
}
.coar-month-view__more:hover {
  text-decoration: underline;
}

.coar-month-view__bar {
  position: absolute;
  box-sizing: border-box;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: var(--coar-font-size-xs, 11px);
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;
  display: flex;
  align-items: center;
  contain: layout paint;
}
.coar-month-view__bar--clipped-start {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.coar-month-view__bar--clipped-end {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.coar-month-view__bar-title {
  color: var(--coar-text-base, #1a1c1f);
  font-weight: 600;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* Density */
.coar-month-view--density-compact .coar-month-view__week-row {
  min-height: 80px;
}
.coar-month-view--density-compact .coar-month-view__pill,
.coar-month-view--density-compact .coar-month-view__bar {
  font-size: 10px;
  padding: 0 4px;
}
</style>
