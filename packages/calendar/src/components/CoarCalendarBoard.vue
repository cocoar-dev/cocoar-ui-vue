<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarCalendarBoard>` — rows of day cells with bars running across.
 *
 * The rows decide what the board is: days by parts of the day
 * (`weekBoardRows`), a week per resource (`resourceWeekRows`) or a year
 * wall planner (`yearWallRows`). The board draws the grid and the
 * events; what a row means, and the content of `custom` rows, come
 * from the host through slots.
 */

import { computed, ref, toValue } from 'vue';
import { useLocalization } from '@cocoar/vue-localization';
import {
  Temporal,
  buildFormatOptions,
  detectFirstDayOfWeekFromLocale,
  eventInkColor,
  isTimedEvent,
  layoutBoard,
  localizedWeekdayNames,
  startOfWeek,
  todayInZone,
  type BoardBar,
  type BoardRow,
  type CalendarEvent,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { onSurfacePointerdown } from '../composables/surfaceTap';
import { useViewWindow } from '../composables/useViewWindow';
import { originatesFromEvent } from './internal/originatesFromEvent';

/** What a `rows` function gets to build its rows from. */
export interface BoardRowsContext {
  /** The days of the visible week, or of the visible year. */
  dates: Temporal.PlainDate[];
  year: number;
  timezone: string;
}

/** A column header other than a date, such as the days of a wall planner. */
export interface BoardColumn {
  key: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    builder: CalendarBuilder<TMeta>;
    rows: ReadonlyArray<BoardRow<TMeta>> | ((context: BoardRowsContext) => ReadonlyArray<BoardRow<TMeta>>);
    /** The window to load and page: a week (default) or a year. */
    range?: 'week' | 'year';
    /** Column headers. Default: the dates of the first row. */
    columns?: ReadonlyArray<BoardColumn>;
  }>(),
  { range: 'week', columns: undefined },
);

defineSlots<{
  rowLabel?(props: { row: BoardRow<TMeta> }): unknown;
  columnHeader?(props: {
    date: Temporal.PlainDate | null;
    column: BoardColumn | null;
    index: number;
    isToday: boolean;
  }): unknown;
  event?(props: {
    event: CalendarEvent<TMeta>;
    row: BoardRow<TMeta>;
    date: Temporal.PlainDate;
  }): unknown;
  bar?(props: { event: CalendarEvent<TMeta>; row: BoardRow<TMeta>; bar: BoardBar<TMeta> }): unknown;
  /** Content of a day cell: all of a `custom` row, above the events of the others. */
  cell?(props: {
    row: BoardRow<TMeta>;
    date: Temporal.PlainDate;
    events: ReadonlyArray<CalendarEvent<TMeta>>;
    isToday: boolean;
    isPast: boolean;
  }): unknown;
}>();

useViewWindow(props.builder, { view: props.range });

const localization = useLocalization();
const locale = computed(
  () => toValue(props.builder.state.locale) ?? localization?.language.value ?? 'en-US',
);
const timezone = computed(() => toValue(props.builder.state.timezone));
const firstDayOfWeek = computed(
  () => toValue(props.builder.state.firstDayOfWeek) ?? detectFirstDayOfWeekFromLocale(locale.value),
);
const today = computed(() => todayInZone(timezone.value));

const context = computed<BoardRowsContext>(() => {
  const cursor = props.builder.state.date.value;
  if (props.range === 'year') {
    const first = Temporal.PlainDate.from({ year: cursor.year, month: 1, day: 1 });
    const days = first.until(first.add({ years: 1 }), { largestUnit: 'days' }).days;
    return {
      dates: Array.from({ length: days }, (_, i) => first.add({ days: i })),
      year: cursor.year,
      timezone: timezone.value,
    };
  }
  const start = startOfWeek(cursor, firstDayOfWeek.value);
  return {
    dates: Array.from({ length: 7 }, (_, i) => start.add({ days: i })),
    year: cursor.year,
    timezone: timezone.value,
  };
});

const resolvedRows = computed(() =>
  typeof props.rows === 'function' ? props.rows(context.value) : props.rows,
);
const layout = computed(() =>
  layoutBoard(props.builder.api.getVisibleEvents(), {
    rows: resolvedRows.value,
    timezone: timezone.value,
  }),
);
const columnCount = computed(
  () => props.columns?.length ?? resolvedRows.value[0]?.dates.length ?? 0,
);

const weekdayNames = computed(() =>
  localizedWeekdayNames(
    locale.value,
    firstDayOfWeek.value,
    toValue(props.builder.state.weekdayFormat) ?? 'short',
  ),
);
const headers = computed(() =>
  Array.from({ length: columnCount.value }, (_, index) => {
    const column = props.columns?.[index] ?? null;
    const date = column ? null : (resolvedRows.value[0]?.dates[index] ?? null);
    return {
      index,
      column,
      date,
      key: column?.key ?? date?.toString() ?? String(index),
      isToday: !!date && isToday(date),
      weekday: date ? weekdayNames.value[index % 7] : '',
    };
  }),
);

function isToday(date: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(date, today.value) === 0;
}
function isPast(date: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(date, today.value) < 0;
}
function isWeekend(date: Temporal.PlainDate): boolean {
  return date.dayOfWeek >= 6;
}

// ─── Events ──────────────────────────────────────────────────────────

const metaOf = (event: CalendarEvent<TMeta>) =>
  (event.meta ?? {}) as { title?: unknown; color?: unknown; textColor?: unknown };
const titleOf = (event: CalendarEvent<TMeta>) => {
  const title = metaOf(event).title;
  return typeof title === 'string' ? title : '(untitled)';
};
const timeFormatter = computed(
  () =>
    new Intl.DateTimeFormat(
      locale.value,
      buildFormatOptions(
        { hour: 'numeric', minute: '2-digit', timeZone: timezone.value },
        {
          timeStyle: toValue(props.builder.state.timeStyle),
          hour12: toValue(props.builder.state.hour12),
        },
      ),
    ),
);
function timeOf(event: CalendarEvent<TMeta>): string {
  return isTimedEvent(event) ? timeFormatter.value.format(event.start.epochMilliseconds) : '';
}
function eventStyle(event: CalendarEvent<TMeta>): Record<string, string> {
  const color = typeof metaOf(event).color === 'string' ? (metaOf(event).color as string) : undefined;
  const bg =
    color ?? 'var(--coar-calendar-event-default-bg, var(--coar-color-accent-soft, #93c5fd))';
  return {
    '--event-bg': bg,
    '--event-border-left': `3px solid ${
      color ??
      'var(--coar-calendar-event-default-color, var(--coar-color-accent, var(--coar-color-accent-500, #2563eb)))'
    }`,
    '--event-ink': eventInkColor({
      background: bg,
      textColor: metaOf(event).textColor,
      policy: toValue(props.builder.state.eventTextContrast),
    }),
  };
}

function onEventPointerup(e: PointerEvent, event: CalendarEvent<TMeta>): void {
  props.builder.state.onEventClick?.({ event, native: e });
}

function onCellPointerdown(e: PointerEvent, date: Temporal.PlainDate | null): void {
  if (!date || originatesFromEvent(e)) return;
  onSurfacePointerdown(e, () => props.builder.state.onDateClick?.({ date, native: e }));
}

// ─── Keyboard ────────────────────────────────────────────────────────

const rootEl = ref<HTMLElement | null>(null);
const active = ref({ row: 0, col: 0 });
const activeCell = computed(() => {
  const rows = layout.value;
  const row = Math.min(active.value.row, rows.length - 1);
  return { row, col: Math.min(active.value.col, columnCount.value - 1) };
});

function onCellKeydown(e: KeyboardEvent, rowIndex: number, col: number): void {
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
  };
  const move = moves[e.key];
  if (move) {
    e.preventDefault();
    const row = Math.max(0, Math.min(layout.value.length - 1, rowIndex + move[0]));
    const next = Math.max(0, Math.min(columnCount.value - 1, col + move[1]));
    active.value = { row, col: next };
    rootEl.value
      ?.querySelector<HTMLElement>(`[data-board-cell="${row}:${next}"]`)
      ?.focus();
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    const date = layout.value[rowIndex]?.cells[col]?.date;
    if (!date || originatesFromEvent(e)) return;
    e.preventDefault();
    props.builder.state.onDateClick?.({ date, native: e as unknown as PointerEvent });
  }
}

const dateLabel = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }),
);
function cellLabel(rowKey: string, date: Temporal.PlainDate | null): string | undefined {
  if (!date) return undefined;
  return `${dateLabel.value.format(new Date(`${date}T00:00:00Z`))}, ${rowKey}`;
}

defineExpose({ getLayout: () => layout.value });
</script>

<template>
  <div
    ref="rootEl"
    class="coar-calendar-board"
    role="grid"
    :aria-rowcount="layout.length + 1"
    :aria-colcount="columnCount + 1"
    :style="{ '--coar-i-board-columns': columnCount }"
  >
    <div class="coar-calendar-board__row coar-calendar-board__row--header" role="row" aria-rowindex="1">
      <div class="coar-calendar-board__label" role="columnheader" aria-colindex="1" />
      <div class="coar-calendar-board__columns">
        <div
          v-for="header in headers"
          :key="header.key"
          class="coar-calendar-board__column-header"
          :class="{
            'coar-calendar-board__column-header--today': header.isToday,
            'coar-calendar-board__column-header--past': header.date && isPast(header.date),
          }"
          role="columnheader"
          :aria-colindex="header.index + 2"
        >
          <slot
            name="columnHeader"
            :date="header.date"
            :column="header.column"
            :index="header.index"
            :is-today="header.isToday"
          >
            <template v-if="header.column">{{ header.column.label }}</template>
            <template v-else-if="header.date">
              <small>{{ header.weekday }}</small>
              <b>{{ header.date.day }}</b>
            </template>
          </slot>
        </div>
      </div>
    </div>

    <div
      v-for="(entry, rowIndex) in layout"
      :key="entry.row.key"
      class="coar-calendar-board__row"
      :class="`coar-calendar-board__row--${entry.row.kind}`"
      :data-row-key="entry.row.key"
      role="row"
      :aria-rowindex="rowIndex + 2"
    >
      <div class="coar-calendar-board__label" role="rowheader" aria-colindex="1">
        <slot name="rowLabel" :row="entry.row">{{ entry.row.key }}</slot>
      </div>
      <div class="coar-calendar-board__body">
        <div
          v-if="entry.laneCount > 0"
          class="coar-calendar-board__bars"
          :style="{ gridTemplateRows: `repeat(${entry.laneCount}, auto)` }"
        >
          <div
            v-for="bar in entry.bars"
            :key="`${bar.event.id}#${bar.startCol}`"
            class="coar-calendar-board__bar"
            :class="{
              'coar-calendar-board__bar--clipped-start': bar.clippedStart,
              'coar-calendar-board__bar--clipped-end': bar.clippedEnd,
            }"
            :style="{
              ...eventStyle(bar.event),
              gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
              gridRow: bar.lane + 1,
            }"
            :data-event-id="bar.event.id"
            tabindex="0"
            role="button"
            :aria-label="titleOf(bar.event)"
            @pointerup="onEventPointerup($event, bar.event)"
          >
            <slot name="bar" :event="bar.event" :row="entry.row" :bar="bar">
              <span class="coar-calendar-board__title">{{ titleOf(bar.event) }}</span>
            </slot>
          </div>
        </div>
        <div class="coar-calendar-board__columns">
          <div
            v-for="(cell, col) in entry.cells"
            :key="col"
            class="coar-calendar-board__cell"
            :class="
              cell.date
                ? {
                    'coar-calendar-board__cell--today': isToday(cell.date),
                    'coar-calendar-board__cell--past': isPast(cell.date),
                    'coar-calendar-board__cell--weekend': isWeekend(cell.date),
                  }
                : 'coar-calendar-board__cell--none'
            "
            role="gridcell"
            :aria-colindex="col + 2"
            :aria-label="cellLabel(entry.row.key, cell.date)"
            :aria-disabled="cell.date ? undefined : 'true'"
            :tabindex="activeCell.row === rowIndex && activeCell.col === col ? 0 : -1"
            :data-board-cell="`${rowIndex}:${col}`"
            :data-day-key="cell.date?.toString()"
            @pointerdown="onCellPointerdown($event, cell.date)"
            @focus="active = { row: rowIndex, col }"
            @keydown="onCellKeydown($event, rowIndex, col)"
          >
            <slot
              v-if="cell.date"
              name="cell"
              :row="entry.row"
              :date="cell.date"
              :events="cell.events"
              :is-today="isToday(cell.date)"
              :is-past="isPast(cell.date)"
            />
            <template v-if="cell.date">
              <div
                v-for="event in cell.events"
                :key="event.id"
                class="coar-calendar-board__event"
                :style="eventStyle(event)"
                :data-event-id="event.id"
                tabindex="0"
                role="button"
                :aria-label="`${timeOf(event)} ${titleOf(event)}`.trim()"
                @pointerup="onEventPointerup($event, event)"
              >
                <slot name="event" :event="event" :row="entry.row" :date="cell.date">
                  <time v-if="timeOf(event)" class="coar-calendar-board__time">{{ timeOf(event) }}</time>
                  <span class="coar-calendar-board__title">{{ titleOf(event) }}</span>
                </slot>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-calendar-board {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--coar-calendar-bg, #fff);
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  font-size: var(--coar-calendar-event-font-size, var(--coar-font-size-xs, 11px));
  color: var(--coar-text-base, #1a1c1f);
}
.coar-calendar-board__row {
  display: grid;
  grid-template-columns: var(--coar-calendar-board-label-width, 88px) minmax(0, 1fr);
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-calendar-board__row:last-child {
  border-bottom: 0;
}
.coar-calendar-board__label {
  min-width: 0;
  padding: var(--coar-calendar-board-label-padding, 8px);
  font-size: var(--coar-calendar-caption-font-size, var(--coar-font-size-xs, 11px));
  font-weight: var(--coar-calendar-caption-font-weight, 600);
  color: var(--coar-text-subtle, #6c7280);
}
.coar-calendar-board__body {
  min-width: 0;
}
.coar-calendar-board__columns,
.coar-calendar-board__bars {
  display: grid;
  grid-template-columns: repeat(
    var(--coar-i-board-columns),
    minmax(var(--coar-calendar-board-column-min-width, 0), 1fr)
  );
}
.coar-calendar-board__bars {
  gap: 2px 0;
  padding: 2px 0;
}
.coar-calendar-board__column-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: var(--coar-calendar-weekday-cell-padding, 8px 12px);
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  font-size: var(--coar-calendar-weekday-font-size, var(--coar-calendar-caption-font-size, var(--coar-font-size-xs, 11px)));
  color: var(--coar-calendar-weekday-color, var(--coar-text-subtle, #6c7280));
}
.coar-calendar-board__column-header--today {
  color: var(--coar-calendar-today-color, var(--coar-color-accent, var(--coar-color-accent-500, #2563eb)));
}
.coar-calendar-board__cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  min-height: var(--coar-calendar-board-cell-min-height, 48px);
  padding: var(--coar-calendar-board-cell-padding, 3px);
  box-sizing: border-box;
  border-left: 1px solid var(--coar-calendar-border, #d1d5db);
  cursor: pointer;
}
.coar-calendar-board__row--bars .coar-calendar-board__cell {
  min-height: var(--coar-calendar-board-bar-row-min-height, 8px);
  padding: 0;
}
.coar-calendar-board__cell--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-calendar-board__cell--today {
  background: var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04));
}
.coar-calendar-board__cell--none {
  background: var(--coar-calendar-bg-other-month, #fafafb);
  cursor: default;
}
.coar-calendar-board__cell:focus-visible,
.coar-calendar-board__event:focus-visible,
.coar-calendar-board__bar:focus-visible {
  outline: 2px solid var(--coar-calendar-focus-color, var(--coar-color-focus, #2563eb));
  outline-offset: -2px;
}
.coar-calendar-board__event,
.coar-calendar-board__bar {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  padding: var(--coar-calendar-event-padding, 1px 6px);
  border-left: var(--coar-calendar-event-border-left, var(--event-border-left));
  border-radius: var(--coar-calendar-pill-radius, var(--coar-calendar-event-radius, 3px));
  background: var(--coar-calendar-event-surface-bg, var(--event-bg));
  color: var(--event-ink, var(--coar-text-base, #1a1c1f));
  line-height: var(--coar-calendar-pill-line-height, 16px);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
.coar-calendar-board__bar--clipped-start {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.coar-calendar-board__bar--clipped-end {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.coar-calendar-board__time {
  flex: 0 0 auto;
  opacity: var(--coar-calendar-event-meta-opacity, 0.8);
}
.coar-calendar-board__title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: var(--coar-calendar-event-title-font-weight, 600);
}
</style>
