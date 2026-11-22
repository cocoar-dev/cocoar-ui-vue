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

import { computed, ref, toValue, useTemplateRef } from 'vue';
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
import {
  useBoardDnd,
  useBoardSelection,
  type BoardRangeSelection,
} from '../composables/useBoardDnd';
import { usePageSwipe } from '../composables/usePageSwipe';
import { useViewWindow } from '../composables/useViewWindow';
import { isEventActivation } from './internal/eventActivation';
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
    /** Drag across the days of a row to select them (`rangeSelect`). */
    selectable?: boolean;
    /** Take the parent's height; rows of cells share what the others leave. */
    fill?: boolean;
    /** Leave out the row of column headers, for rows that name their own day. */
    hideHeader?: boolean;
  }>(),
  { range: 'week', columns: undefined, selectable: false, fill: false, hideHeader: false },
);

const emit = defineEmits<{
  rangeSelect: [selection: BoardRangeSelection];
}>();

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
const headerRows = computed(() => (props.hideHeader ? 0 : 1));
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

// ─── Moving, selecting, paging ───────────────────────────────────────

const rootEl = useTemplateRef<HTMLElement>('rootEl');

const dnd = useBoardDnd<TMeta>({
  rootEl,
  layout: () => layout.value,
  timezone: () => timezone.value,
  dstPolicy: () => toValue(props.builder.state.dstPolicy),
  canDrop: () => props.builder.state.canDrop,
  onDrop: (payload) => props.builder.state.onEventDrop?.(payload),
  onClick: (event, native) => props.builder.state.onEventClick?.({ event, native }),
});

const swipe = usePageSwipe({
  pageEl: rootEl,
  enabled: () =>
    toValue(props.builder.state.swipeNavigation) &&
    !dnd.isDragging.value &&
    selecting.selection.value === null,
  offsetVar: '--coar-board-swipe-x',
  onCommit: (direction) => {
    if (direction === 1) props.builder.api.next();
    else props.builder.api.prev();
  },
});

const selecting = useBoardSelection<TMeta>({
  rootEl,
  layout: () => layout.value,
  enabled: () => props.selectable,
  onTakePointer: (id) => swipe.release(id),
  onDateClick: (date, native) => props.builder.state.onDateClick?.({ date, native }),
  onSelect: (selection) => emit('rangeSelect', selection),
});

function onEventActivate(e: KeyboardEvent | MouseEvent, event: CalendarEvent<TMeta>): void {
  if (!isEventActivation(e)) return;
  props.builder.state.onEventClick?.({ event, native: e as unknown as PointerEvent });
}

function onRootPointerdown(e: PointerEvent): void {
  if (!originatesFromEvent(e)) swipe.onPointerdown(e);
}

function onCellPointerdown(e: PointerEvent, rowIndex: number, col: number): void {
  if (originatesFromEvent(e)) return;
  if (selecting.onCellPointerdown(e, rowIndex, col)) return;
  const date = layout.value[rowIndex]?.cells[col]?.date;
  if (date) onSurfacePointerdown(e, () => props.builder.state.onDateClick?.({ date, native: e }));
}

function cellState(rowIndex: number, col: number): Record<string, boolean> {
  const drop = dnd.dropState.value;
  const range = selecting.selection.value;
  const isDrop = drop?.rowIndex === rowIndex && drop.col === col;
  return {
    'coar-calendar-board__cell--drop': isDrop && !!drop?.valid,
    'coar-calendar-board__cell--drop-invalid': isDrop && !drop?.valid,
    'coar-calendar-board__cell--selecting':
      range?.rowIndex === rowIndex &&
      col >= Math.min(range.fromCol, range.toCol) &&
      col <= Math.max(range.fromCol, range.toCol),
  };
}

// ─── Keyboard ────────────────────────────────────────────────────────

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
    :aria-rowcount="layout.length + headerRows"
    :aria-colcount="columnCount + 1"
    :class="{
      'coar-calendar-board--settling': swipe.settling.value,
      'coar-calendar-board--year': range === 'year',
      'coar-calendar-board--fill': fill,
    }"
    :style="{ '--coar-i-board-columns': columnCount, ...swipe.swipeStyle.value }"
    @pointerdown="onRootPointerdown"
  >
    <div
      v-if="!hideHeader"
      class="coar-calendar-board__row coar-calendar-board__row--header"
      role="row"
      aria-rowindex="1"
    >
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
      :class="[`coar-calendar-board__row--${entry.row.kind}`, entry.row.class]"
      :data-row-key="entry.row.key"
      :data-row-index="rowIndex"
      role="row"
      :aria-rowindex="rowIndex + 1 + headerRows"
    >
      <div class="coar-calendar-board__label" role="rowheader" aria-colindex="1">
        <slot name="rowLabel" :row="entry.row">{{ entry.row.label ?? entry.row.key }}</slot>
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
              'coar-calendar-board__bar--dragging': dnd.draggedId.value === bar.event.id,
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
            @pointerdown="dnd.onEventPointerdown($event, bar.event, entry.row, dnd.dayUnderPointer($event) ?? entry.row.dates[bar.startCol])"
            @keydown="onEventActivate($event, bar.event)"
            @click="onEventActivate($event, bar.event)"
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
            :class="[
              cell.date
                ? {
                    'coar-calendar-board__cell--today': isToday(cell.date),
                    'coar-calendar-board__cell--past': isPast(cell.date),
                    'coar-calendar-board__cell--weekend': isWeekend(cell.date),
                  }
                : 'coar-calendar-board__cell--none',
              cellState(rowIndex, col),
            ]"
            role="gridcell"
            :aria-colindex="col + 2"
            :aria-label="cellLabel(entry.row.label ?? entry.row.key, cell.date)"
            :aria-disabled="cell.date ? undefined : 'true'"
            :tabindex="activeCell.row === rowIndex && activeCell.col === col ? 0 : -1"
            :data-board-cell="`${rowIndex}:${col}`"
            :data-day-key="cell.date?.toString()"
            @pointerdown="onCellPointerdown($event, rowIndex, col)"
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
            <template v-if="cell.date && entry.row.showCellEvents !== false">
              <div
                v-for="event in cell.events"
                :key="event.id"
                class="coar-calendar-board__event"
                :class="{ 'coar-calendar-board__event--dragging': dnd.draggedId.value === event.id }"
                :style="eventStyle(event)"
                :data-event-id="event.id"
                tabindex="0"
                role="button"
                :aria-label="`${timeOf(event)} ${titleOf(event)}`.trim()"
                @pointerdown="dnd.onEventPointerdown($event, event, entry.row, cell.date)"
                @keydown="onEventActivate($event, event)"
                @click="onEventActivate($event, event)"
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
.coar-calendar-board {
  gap: var(--coar-calendar-board-row-gap, 0);
  overflow-x: clip;
  touch-action: pan-y;
}
.coar-calendar-board__row {
  transform: translate3d(var(--coar-board-swipe-x, 0px), 0, 0);
}
.coar-calendar-board--settling .coar-calendar-board__row {
  transition: transform 180ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .coar-calendar-board--settling .coar-calendar-board__row {
    transition: none;
  }
}
.coar-calendar-board__row {
  display: grid;
  grid-template-columns: var(--coar-calendar-board-label-width, 88px) minmax(0, 1fr);
  border-bottom: 1px solid var(--coar-calendar-board-row-line, var(--coar-calendar-border, #d1d5db));
}
.coar-calendar-board--fill {
  height: 100%;
  min-height: 0;
}
.coar-calendar-board--fill .coar-calendar-board__row--cells {
  flex: 1 1 0;
  min-height: 0;
}
.coar-calendar-board--fill .coar-calendar-board__row--cells .coar-calendar-board__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.coar-calendar-board--fill .coar-calendar-board__row--cells {
  grid-template-rows: minmax(0, 1fr);
}
.coar-calendar-board--fill .coar-calendar-board__row--cells .coar-calendar-board__columns {
  flex: 1 1 0;
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
}
.coar-calendar-board--fill .coar-calendar-board__row--cells .coar-calendar-board__cell {
  overflow: hidden;
}
.coar-calendar-board__row:last-child {
  border-bottom: 0;
}
.coar-calendar-board__label {
  align-self: var(--coar-calendar-board-label-align, stretch);
  min-width: 0;
  padding: var(--coar-calendar-board-label-padding, 8px);
  font-size: var(
    --coar-calendar-board-label-font-size,
    var(--coar-calendar-caption-font-size, var(--coar-font-size-xs, 11px))
  );
  font-weight: var(
    --coar-calendar-board-label-font-weight,
    var(--coar-calendar-caption-font-weight, 600)
  );
  letter-spacing: var(--coar-calendar-board-label-letter-spacing, normal);
  text-transform: var(--coar-calendar-board-label-transform, none);
  color: var(--coar-calendar-board-label-color, var(--coar-text-subtle, #6c7280));
}
/* The empty corner is a head field like the days beside it. */
.coar-calendar-board__row--header .coar-calendar-board__label {
  align-self: stretch;
  background: var(--coar-calendar-board-header-bg, transparent);
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
  column-gap: var(--coar-calendar-board-column-gap, 0);
}
.coar-calendar-board__bars {
  gap: var(--coar-calendar-board-bar-gap, 2px) 0;
  padding: var(--coar-calendar-board-bars-padding, 2px 0);
}
.coar-calendar-board__column-header {
  display: flex;
  flex-direction: var(--coar-calendar-board-header-direction, column);
  align-items: var(--coar-calendar-board-header-align, center);
  justify-content: var(--coar-calendar-board-header-justify, flex-start);
  min-width: 0;
  padding: var(--coar-calendar-board-header-padding, var(--coar-calendar-weekday-cell-padding, 8px 12px));
  border-left: 1px solid var(--coar-calendar-board-header-line, var(--coar-calendar-board-line, var(--coar-calendar-border, #d1d5db)));
  background: var(--coar-calendar-board-header-bg, transparent);
  font-size: var(--coar-calendar-weekday-font-size, var(--coar-calendar-caption-font-size, var(--coar-font-size-xs, 11px)));
  color: var(--coar-calendar-weekday-color, var(--coar-text-subtle, #6c7280));
}
.coar-calendar-board__column-header--today {
  background: var(--coar-calendar-board-header-today-bg, var(--coar-calendar-board-header-bg, transparent));
  color: var(--coar-calendar-today-color, var(--coar-color-accent, var(--coar-color-accent-500, #2563eb)));
}
.coar-calendar-board__cell {
  display: flex;
  flex-direction: column;
  gap: var(--coar-calendar-board-cell-gap, 2px);
  min-width: 0;
  min-height: var(--coar-calendar-board-cell-min-height, 48px);
  padding: var(--coar-calendar-board-cell-padding, 3px);
  box-sizing: border-box;
  border-left: 1px solid var(--coar-calendar-board-line, var(--coar-calendar-border, #d1d5db));
  background: var(--coar-calendar-board-cell-bg, transparent);
  cursor: pointer;
}
/* A row of bars: the cells lie behind the bars, as tall as the row. */
.coar-calendar-board__row--bars .coar-calendar-board__body {
  position: relative;
  min-height: var(--coar-calendar-board-bar-row-min-height, 8px);
}
.coar-calendar-board__row--bars .coar-calendar-board__columns {
  position: absolute;
  inset: 0;
}
.coar-calendar-board__row--bars .coar-calendar-board__bars {
  position: relative;
  z-index: 1;
  pointer-events: none;
}
.coar-calendar-board__row--bars .coar-calendar-board__bar {
  pointer-events: auto;
}
.coar-calendar-board__row--bars .coar-calendar-board__cell {
  min-height: 0;
  padding: 0;
}
.coar-calendar-board__cell--weekend {
  background: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-calendar-board__cell--today {
  background: var(--coar-calendar-board-cell-today-bg, var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04)));
}
/* Above the bars of the row; no box without the token. */
.coar-calendar-board__cell--today {
  position: relative;
}
.coar-calendar-board__cell--today::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: var(--coar-calendar-board-cell-today-frame-radius, 0);
  box-shadow: var(--coar-calendar-board-cell-today-frame, none);
  pointer-events: none;
}
.coar-calendar-board__cell--none {
  background: var(--coar-calendar-bg-other-month, #fafafb);
  cursor: default;
}
.coar-calendar-board__cell--drop,
.coar-calendar-board__cell--selecting {
  background: color-mix(in srgb, var(--coar-calendar-selection-color, var(--coar-background-accent-primary, #2563eb)) 14%, transparent);
}
.coar-calendar-board__cell--drop-invalid {
  background: var(--coar-calendar-invalid-stripe, rgba(220, 38, 38, 0.18));
  cursor: not-allowed;
}
.coar-calendar-board__event--dragging,
.coar-calendar-board__bar--dragging {
  opacity: 0.4;
}
.coar-calendar-board__cell:focus-visible,
.coar-calendar-board__event:focus-visible,
.coar-calendar-board__bar:focus-visible {
  outline: 2px solid var(--coar-calendar-focus-color, var(--coar-color-focus, #2563eb));
  outline-offset: -2px;
}
/* A full cell clips its last event; it never squeezes them. */
.coar-calendar-board__event {
  flex: 0 0 auto;
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
  /* A touch on an event is a drag, as everywhere in the calendar. */
  touch-action: none;
}
.coar-calendar-board__bar {
  margin: var(--coar-calendar-board-bar-margin, 0);
  padding: var(--coar-calendar-board-bar-padding, var(--coar-calendar-event-padding, 1px 6px));
  border-radius: var(
    --coar-calendar-board-bar-radius,
    var(--coar-calendar-pill-radius, var(--coar-calendar-event-radius, 3px))
  );
  font-size: var(--coar-calendar-board-bar-font-size, inherit);
  font-weight: var(--coar-calendar-board-bar-font-weight, inherit);
}
.coar-calendar-board__bar--clipped-start {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.coar-calendar-board__bar--clipped-end {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
/* A wall planner is dense: small cells, a band's title only where it fits. */
.coar-calendar-board--year {
  --coar-i-board-cell-min-height: 18px;
}
.coar-calendar-board--year .coar-calendar-board__label {
  padding: var(--coar-calendar-board-label-padding, 2px 6px);
}
.coar-calendar-board--year .coar-calendar-board__column-header {
  padding: 2px 0;
}
.coar-calendar-board--year .coar-calendar-board__row:not(.coar-calendar-board__row--header) {
  position: relative;
}
.coar-calendar-board--year .coar-calendar-board__body {
  position: relative;
}
.coar-calendar-board--year .coar-calendar-board__cell {
  align-items: center;
  justify-content: center;
  min-height: var(--coar-calendar-board-cell-min-height, var(--coar-i-board-cell-min-height));
  padding: 0;
}
.coar-calendar-board--year .coar-calendar-board__bars {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: var(--coar-calendar-board-bars-padding, 0);
  pointer-events: none;
}
.coar-calendar-board--year .coar-calendar-board__bar {
  container-type: inline-size;
  padding: var(--coar-calendar-board-bar-padding, 0 3px);
  pointer-events: auto;
}
@container (max-width: 40px) {
  .coar-calendar-board--year .coar-calendar-board__title {
    display: none;
  }
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
