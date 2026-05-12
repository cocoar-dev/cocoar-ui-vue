<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarTimelineView>` — Gantt-lite view.
 *
 * One row per event. Left pane = event labels (from
 * `meta.title` or `event.id`). Right pane = a horizontal time-grid
 * with one date-header row and one bar per event positioned by
 * `[start, end)` against the visible window.
 *
 * Same data as Day / Week / Month / Agenda — different rendering.
 *
 * **Layout — Excel-style frozen panes via CSS Grid + sticky.** One
 * scroll container, no JavaScript scroll sync. The date-axis is
 * `position: sticky; top: 0` so it stays pinned during vertical
 * scroll AND follows horizontal scroll naturally (because it's
 * inside the same scroll container). The label column is
 * `position: sticky; left: 0` so it follows vertical scroll and
 * stays pinned during horizontal scroll. The top-left corner is
 * `position: sticky; top: 0; left: 0` so it stays pinned during
 * both.
 *
 * Public surface: ONE prop, `:builder: CalendarBuilder`.
 */

import { computed, ref, toValue } from 'vue';
import { useLocalization } from '@cocoar/vue-localization';
import {
  Temporal,
  buildFormatOptions,
  layoutTimeline,
  type CalendarEvent,
  type TimelineBar,
  type TimelineRow,
  type ViewWindow,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { useViewWindow } from '../composables/useViewWindow';

const props = defineProps<{ builder: CalendarBuilder<TMeta> }>();

useViewWindow(props.builder, { view: 'timeline' });

defineSlots<{
  /** Override the left-pane row label. Default renders
   *  `meta.title ?? event.id` of the row's first bar as plain text.
   *  `event` is `row.bars[0].event` for convenience — for recurring
   *  series this is the first occurrence in the window, which
   *  carries the series-level metadata (title, color). */
  label?(props: { row: TimelineRow<TMeta>; event: CalendarEvent<TMeta> }): unknown;
  /** Override an individual event bar. Fires once per bar — recurring
   *  series with N occurrences trigger this slot N times, all
   *  sharing the same `row`. */
  bar?(props: {
    row: TimelineRow<TMeta>;
    bar: TimelineBar<TMeta>;
    event: CalendarEvent<TMeta>;
  }): unknown;
  /** Override a single date-header cell in the top axis row. */
  dateHeader?(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
}>();

const localization = useLocalization();
const effectiveLocale = computed<string>(
  () => toValue(props.builder.state.locale) ?? localization?.language.value ?? 'en-US',
);

const state = computed(() => {
  const s = props.builder.state;
  return {
    events: props.builder.api.getVisibleEvents(),
    timezone: toValue(s.timezone),
    pixelsPerDay: toValue(s.timelinePixelsPerDay),
    rowHeight: toValue(s.timelineRowHeight),
    labelWidth: toValue(s.timelineLabelWidth),
    dateStyle: toValue(s.dateStyle),
  };
});

const visibleRange = computed<ViewWindow | null>(
  () => props.builder.api.visibleRange.value,
);

const windowStart = computed<Temporal.PlainDate | null>(() => {
  const w = visibleRange.value;
  return w ? Temporal.PlainDate.from(w.start) : null;
});

const windowEnd = computed<Temporal.PlainDate | null>(() => {
  const w = visibleRange.value;
  return w ? Temporal.PlainDate.from(w.end) : null;
});

const layout = computed(() => {
  if (!windowStart.value || !windowEnd.value) {
    return { rows: [], totalWidth: 0, totalHeight: 0 };
  }
  return layoutTimeline<TMeta>(state.value.events, {
    windowStart: windowStart.value,
    windowEnd: windowEnd.value,
    pixelsPerDay: state.value.pixelsPerDay,
    rowHeight: state.value.rowHeight,
    displayZone: state.value.timezone,
  });
});

// Date-header row: one cell per day in the window.
const dateAxis = computed<Temporal.PlainDate[]>(() => {
  if (!windowStart.value || !windowEnd.value) return [];
  const out: Temporal.PlainDate[] = [];
  let cur = windowStart.value;
  while (Temporal.PlainDate.compare(cur, windowEnd.value) < 0) {
    out.push(cur);
    cur = cur.add({ days: 1 });
  }
  return out;
});

const today = computed<Temporal.PlainDate>(() =>
  Temporal.Now.plainDateISO(state.value.timezone),
);

function isToday(d: Temporal.PlainDate): boolean {
  return d.equals(today.value);
}

function isWeekend(d: Temporal.PlainDate): boolean {
  return d.dayOfWeek === 6 || d.dayOfWeek === 7;
}

const dateHeaderFormatter = computed(
  () =>
    new Intl.DateTimeFormat(
      effectiveLocale.value,
      buildFormatOptions(
        { day: 'numeric', month: 'short', timeZone: 'UTC' },
        { dateStyle: undefined },
      ),
    ),
);

function formatDateHeader(d: Temporal.PlainDate): string {
  return dateHeaderFormatter.value.format(
    new Date(Date.UTC(d.year, d.month - 1, d.day)),
  );
}

function eventTitle(event: CalendarEvent<TMeta>): string {
  const meta = event.meta as { title?: string } | undefined;
  return meta?.title ?? event.id;
}

function eventColor(event: CalendarEvent<TMeta>): string | undefined {
  const meta = event.meta as { color?: string } | undefined;
  return meta?.color;
}

function onEventClick(event: CalendarEvent<TMeta>, native: PointerEvent): void {
  const handler = props.builder.state.onEventClick;
  if (handler) handler({ event, native });
}

// ─── Pan mode (click + drag to scroll) ───────────────────────────
// Drag anywhere on the timeline EXCEPT on a bar (which has its own
// click handler) to scroll both axes. Mirrors the Excel / Gantt /
// figma-canvas pan convention. Pointer-capture keeps the pan alive
// even when the cursor leaves the scroll container.

const scrollEl = ref<HTMLElement | null>(null);
const isPanning = ref(false);

interface PanOrigin {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startScrollTop: number;
}
let panOrigin: PanOrigin | null = null;

function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  // Bar buttons + any nested interactive elements (custom slots
  // may render their own buttons / inputs). Walk up to the
  // closest button/anchor/input to handle deep slot contents.
  return el.closest('button, a, input, select, textarea, [role="button"]') !== null;
}

function onPointerDown(e: PointerEvent): void {
  // Only primary mouse button or single-touch / pen contact.
  if (e.button !== 0) return;
  if (!scrollEl.value) return;
  if (isInteractiveTarget(e.target)) return;

  panOrigin = {
    pointerId: e.pointerId,
    startClientX: e.clientX,
    startClientY: e.clientY,
    startScrollLeft: scrollEl.value.scrollLeft,
    startScrollTop: scrollEl.value.scrollTop,
  };
  isPanning.value = true;
  // setPointerCapture so pan continues even when the cursor leaves
  // the timeline element (e.g. drags up into the page header).
  scrollEl.value.setPointerCapture(e.pointerId);
  e.preventDefault();
}

function onPointerMove(e: PointerEvent): void {
  if (!panOrigin || !scrollEl.value) return;
  if (e.pointerId !== panOrigin.pointerId) return;
  const dx = e.clientX - panOrigin.startClientX;
  const dy = e.clientY - panOrigin.startClientY;
  scrollEl.value.scrollLeft = panOrigin.startScrollLeft - dx;
  scrollEl.value.scrollTop = panOrigin.startScrollTop - dy;
}

function endPan(e: PointerEvent): void {
  if (!panOrigin) return;
  if (e.pointerId !== panOrigin.pointerId) return;
  scrollEl.value?.releasePointerCapture(e.pointerId);
  panOrigin = null;
  isPanning.value = false;
}

// Inline style for the outer grid — drives the frozen-pane layout.
const gridStyle = computed(() => ({
  // Total content size = labels + bars (horizontal), header + rows (vertical).
  width: `${state.value.labelWidth + layout.value.totalWidth}px`,
  // Height: header row + body. Body height grows with row count;
  // empty timeline still gets a one-row-high body so the date axis
  // is visible.
  height: `${state.value.rowHeight + Math.max(layout.value.totalHeight, state.value.rowHeight)}px`,
  gridTemplateColumns: `${state.value.labelWidth}px ${layout.value.totalWidth}px`,
  gridTemplateRows: `${state.value.rowHeight}px 1fr`,
}));

defineExpose({
  getVisibleRange: () => props.builder.api.visibleRange.value,
});
</script>

<template>
  <div
    ref="scrollEl"
    class="coar-timeline-view"
    :class="{ 'coar-timeline-view--panning': isPanning }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endPan"
    @pointercancel="endPan"
  >
    <div class="coar-timeline-view__grid" :style="gridStyle">
      <!-- Top-left frozen corner (sticky both axes) -->
      <div class="coar-timeline-view__corner">
        <span class="coar-timeline-view__corner-title">Event</span>
      </div>

      <!-- Date axis: sticky top, scrolls horizontally with bars -->
      <div class="coar-timeline-view__date-axis">
        <div
          v-for="d in dateAxis"
          :key="d.toString()"
          class="coar-timeline-view__date-cell"
          :class="{
            'coar-timeline-view__date-cell--today': isToday(d),
            'coar-timeline-view__date-cell--weekend': isWeekend(d),
          }"
          :style="{ width: `${state.pixelsPerDay}px`, minWidth: `${state.pixelsPerDay}px` }"
        >
          <slot
            v-if="$slots.dateHeader"
            name="dateHeader"
            :date="d"
            :is-today="isToday(d)"
            :is-weekend="isWeekend(d)"
          />
          <span v-else class="coar-timeline-view__date-label">
            {{ formatDateHeader(d) }}
          </span>
        </div>
      </div>

      <!-- Label column: sticky left, scrolls vertically with rows -->
      <div class="coar-timeline-view__label-column">
        <div
          v-for="row in layout.rows"
          :key="row.id"
          class="coar-timeline-view__label-row"
          :class="{ 'coar-timeline-view__label-row--recurring': row.isRecurring }"
          :style="{ height: `${row.height}px`, minHeight: `${row.height}px` }"
        >
          <slot v-if="$slots.label" name="label" :row="row" :event="row.bars[0].event" />
          <template v-else>
            <span class="coar-timeline-view__label-text" :title="eventTitle(row.bars[0].event)">
              {{ eventTitle(row.bars[0].event) }}
            </span>
            <span
              v-if="row.isRecurring"
              class="coar-timeline-view__label-count"
              :title="`${row.bars.length} occurrences`"
            >
              ×{{ row.bars.length }}
            </span>
          </template>
        </div>
      </div>

      <!-- Bars area: regular flow (no sticky), scrolls both axes -->
      <div
        class="coar-timeline-view__bars-area"
        :style="{ width: `${layout.totalWidth}px`, height: `${Math.max(layout.totalHeight, state.rowHeight)}px` }"
      >
        <!-- Day grid lines as background -->
        <div class="coar-timeline-view__day-grid-bg">
          <div
            v-for="d in dateAxis"
            :key="d.toString()"
            class="coar-timeline-view__day-grid-cell"
            :class="{ 'coar-timeline-view__day-grid-cell--weekend': isWeekend(d) }"
            :style="{ width: `${state.pixelsPerDay}px`, minWidth: `${state.pixelsPerDay}px` }"
          />
        </div>

        <!-- Event bars — one row may have N bars (recurring series). -->
        <template v-for="row in layout.rows" :key="row.id">
          <button
            v-for="bar in row.bars"
            :key="bar.event.id"
            type="button"
            class="coar-timeline-view__bar"
            :class="{
              'coar-timeline-view__bar--clipped-start': bar.clippedStart,
              'coar-timeline-view__bar--clipped-end': bar.clippedEnd,
            }"
            :style="{
              left: `${bar.left}px`,
              top: `${row.top + 4}px`,
              width: `${bar.width}px`,
              height: `${row.height - 8}px`,
              background: eventColor(bar.event) ?? 'var(--coar-color-accent, #2563eb)',
            }"
            :aria-label="eventTitle(bar.event)"
            @click="onEventClick(bar.event, $event)"
          >
            <!-- Default bar renders as a coloured rectangle only — the row
                 label on the left already names the event. The aria-label
                 keeps the bar identifiable to screen readers / keyboard
                 navigation; consumers wanting an inline title override via
                 the `#bar` slot. -->
            <slot v-if="$slots.bar" name="bar" :row="row" :bar="bar" :event="bar.event" />
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-timeline-view {
  /* Single scroll container. The inner grid is sized to the FULL
     content rectangle (labels + bars × header + rows); this element
     handles both axes so sticky elements have a single coordinate
     system to anchor against. */
  display: block;
  width: 100%;
  height: 100%;
  overflow: auto;
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-body-s-size, 13px);
  background: var(--coar-background-neutral-primary);
  /* Pan affordance — empty area shows the grab hand; bars and other
     interactive children re-assert their own cursor. The
     panning-active class overrides during the actual pan motion. */
  cursor: grab;
  /* Prevent native text selection during drag — `user-select: none`
     stops the browser from selecting label / header text while the
     user pans. Slot contents that need selection (e.g. a copy-able
     event title) can override on themselves. */
  user-select: none;
  /* Prevent the browser's native touch-scroll from interfering with
     the pointer-driven pan on touch devices. We handle the scroll
     manually via setScrollLeft/Top. */
  touch-action: none;
}

.coar-timeline-view--panning {
  cursor: grabbing;
}

/* Interactive children re-assert their own cursors so the grab hand
   doesn't hover over clickable bars. */
.coar-timeline-view .coar-timeline-view__bar {
  cursor: pointer;
}
.coar-timeline-view--panning .coar-timeline-view__bar {
  cursor: grabbing;
}

.coar-timeline-view__grid {
  display: grid;
  /* width / height / template come from inline style — the layout
     depends on row count and pixelsPerDay which vary at runtime. */
  position: relative;
}

/* Top-left frozen corner — sticks at top AND left during scroll. */
.coar-timeline-view__corner {
  grid-row: 1;
  grid-column: 1;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 3;
  background: var(--coar-background-neutral-secondary);
  border-right: 1px solid var(--coar-border-neutral-tertiary);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  display: flex;
  align-items: center;
  padding: 0 var(--coar-spacing-s, 8px);
}

.coar-timeline-view__corner-title {
  font-weight: 600;
  color: var(--coar-text-neutral-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Date axis — sticks at top during Y-scroll, follows X-scroll. */
.coar-timeline-view__date-axis {
  grid-row: 1;
  grid-column: 2;
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  background: var(--coar-background-neutral-secondary);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
}

.coar-timeline-view__date-cell {
  /* `box-sizing: border-box` so the 1px right border doesn't add to
     the cell's flex width — otherwise each day-cell would be 1px
     wider than `pixelsPerDay`, and bars (positioned absolutely at
     `left = index × pixelsPerDay`) would drift left by 1px per day
     relative to their date column. */
  box-sizing: border-box;
  flex: 0 0 auto;
  border-right: 1px solid var(--coar-border-neutral-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--coar-text-neutral-secondary);
}

.coar-timeline-view__date-cell--today {
  background: var(--coar-background-accent-soft, #eff6ff);
  color: var(--coar-text-accent, #2563eb);
  font-weight: 600;
}

.coar-timeline-view__date-cell--weekend {
  background: var(--coar-background-neutral-tertiary, #f5f5f5);
}

/* Label column — sticks at left during X-scroll, follows Y-scroll. */
.coar-timeline-view__label-column {
  grid-row: 2;
  grid-column: 1;
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--coar-background-neutral-primary);
  border-right: 1px solid var(--coar-border-neutral-tertiary);
}

.coar-timeline-view__label-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 var(--coar-spacing-s, 8px);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary);
  overflow: hidden;
}

.coar-timeline-view__label-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  flex: 1 1 auto;
  min-width: 0;
}

.coar-timeline-view__label-count {
  font-size: 11px;
  color: var(--coar-text-neutral-secondary);
  font-variant-numeric: tabular-nums;
  flex: 0 0 auto;
  padding: 1px 6px;
  background: var(--coar-background-neutral-tertiary, #f5f5f5);
  border-radius: 9999px;
}

/* Bars area — regular grid cell, no sticky; scrolls with both axes. */
.coar-timeline-view__bars-area {
  grid-row: 2;
  grid-column: 2;
  position: relative;
}

/* Day grid lines as a flex row of cells behind the bars. */
.coar-timeline-view__day-grid-bg {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
  z-index: 0;
}

.coar-timeline-view__day-grid-cell {
  /* Same border-box fix as date-cell — keep grid-line spacing in
     sync with the date-axis and the bar positions. */
  box-sizing: border-box;
  flex: 0 0 auto;
  border-right: 1px solid var(--coar-border-neutral-tertiary);
  height: 100%;
}

.coar-timeline-view__day-grid-cell--weekend {
  background: var(--coar-background-neutral-tertiary, #f5f5f5);
  opacity: 0.4;
}

.coar-timeline-view__bar {
  position: absolute;
  border: none;
  border-radius: var(--coar-radius-xs, 4px);
  color: white;
  font-size: 12px;
  font-weight: 500;
  padding: 0 8px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: filter 0.1s ease;
  z-index: 1;
}

.coar-timeline-view__bar:hover {
  filter: brightness(1.05);
}

.coar-timeline-view__bar:focus-visible {
  outline: 2px solid var(--coar-border-accent, #2563eb);
  outline-offset: 2px;
}

.coar-timeline-view__bar--clipped-start {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.coar-timeline-view__bar--clipped-end {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

/* Reserved for consumers using a custom #bar slot that still wants
   the lib's inline-truncation behaviour. The default render has no
   inline text — the row label is the source of truth. */
.coar-timeline-view__bar-label {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
