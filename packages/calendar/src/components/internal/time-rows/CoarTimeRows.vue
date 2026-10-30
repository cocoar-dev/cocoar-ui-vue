<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
/**
 * `<CoarTimeRows>` — the horizontal time grid
 * (`builder.timeGridOrientation('horizontal')`): one row per day, time
 * running left → right on one shared axis.
 *
 *   ┌────────────┬ 07 ─── 08 ─── 09 ─── 10 ─── … ┐  sticky hour header
 *   │ Mo., 19.   │ [ Entwicklung ][Daily][ … ]   │  one row per day,
 *   │ ▢ Urlaub   │        [ Review ]             │  lanes stack down
 *   └────────────┴───────────────────────────────┘
 *   sticky label column (day header + all-day chips)
 *
 * Shares everything axis-free with `<CoarTimeGrid>`: the per-day
 * layout (`layoutDayEvents` via `layoutTimeRows`), the presentation
 * (`useTimeGridPresentation`) and the drag runtime (`useTimeGridDnd`
 * with a horizontal `timedAxis`). Not here: swipe paging (the time
 * axis scrolls horizontally instead) and the all-day band — all-day
 * events are chips in the label cell of every day they cover.
 *
 * The component owns its scroller (both axes) so the hour header and
 * the label column can stick; give it a sized parent.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed, onBeforeUnmount, onMounted, ref, toValue, useTemplateRef } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { useTimeGridDnd } from '../../../composables/useTimeGridDnd';
import type { TimedAxisAdapter } from '../../../composables/useCalendarDnd';
import { useTimeGridPresentation } from '../../../composables/useTimeGridPresentation';
import { onSurfacePointerdown } from '../../../composables/surfaceTap';
import {
  Temporal,
  isAllDayEvent,
  type AllDayBar,
  type CalendarEvent,
  type PositionedEvent,
} from '../../../core';
import {
  layoutTimeRows,
  rowIndexAtY,
  timeRowLaneTopPx,
  timeRowsPxPerMinute,
  type TimeRowsGeometry,
} from '../../../core/timeRowsLayout';
import { CalendarBuilder } from '../../../builders/calendar-builder';
import { RenderEvent, RenderDayHeader } from '../../../builders/render-helpers';
import { originatesFromEvent } from '../originatesFromEvent';
import CoarTimeRowsEvent from './CoarTimeRowsEvent.vue';
import CoarTimeGridNowMarker from '../time-grid/CoarTimeGridNowMarker.vue';
import CoarCalendarBands from '../time-grid/CoarCalendarBands.vue';
import CoarTimeSelectionLayer from '../time-grid/CoarTimeSelectionLayer.vue';
import CoarTimeAxisMarker from '../time-grid/CoarTimeAxisMarker.vue';
import { useTimeSelection } from '../../../composables/useTimeSelection';
import { useTimeGridOverlays, timeAxisMark } from '../../../composables/useTimeGridOverlays';
import type { CalendarDraftSegment } from '../../../builders/types';

const props = defineProps<{
  builder: CalendarBuilder<TMeta>;
  /** One date per row, top to bottom. */
  dates: ReadonlyArray<Temporal.PlainDate>;
}>();

const slots = defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  /** Not used by the horizontal grid: all-day events render as chips. */
  allDayEvent?(props: { event: CalendarEvent<TMeta>; layout: AllDayBar<TMeta> }): unknown;
  dayHeader?(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
  /** Custom drawing of the host's draft (`builder.draft`), one call per day it covers. */
  draft?(props: {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
    segment: CalendarDraftSegment;
  }): unknown;
}>();
const { t } = useI18n();

// ─── Builder bindings ────────────────────────────────────────────────

const state = computed(() => {
  const s = props.builder.state;
  const tr = toValue(s.timeRange);
  return {
    events: props.builder.api.getVisibleEvents(),
    timezone: toValue(s.timezone),
    locale: toValue(s.locale),
    density: toValue(s.density),
    dateStyle: toValue(s.dateStyle),
    timeStyle: toValue(s.timeStyle),
    hour12: toValue(s.hour12),
    timeRange: [Math.floor(tr.startMinutes / 60), Math.ceil(tr.endMinutes / 60)] as readonly [
      number,
      number,
    ],
    slotDuration: toValue(s.slotDuration) as 5 | 10 | 15 | 30 | 60,
    pixelsPerHour: toValue(s.pixelsPerHour),
    canDrop: s.canDrop,
    eventRenderer: s.eventRenderer,
    eventTextContrast: toValue(s.eventTextContrast),
    shadeWeekends: toValue(s.shadeWeekends),
    dayHeaderRenderer: s.dayHeaderRenderer,
    dstPolicy: toValue(s.dstPolicy),
  };
});
const timeRange = computed(() => state.value.timeRange);
const slotDuration = computed(() => state.value.slotDuration);
const timezone = computed(() => state.value.timezone);
const density = computed(() => state.value.density);
const days = computed<ReadonlyArray<Temporal.PlainDate>>(() => props.dates);

const {
  nowMinutesFromGridStart,
  isToday,
  isWeekend,
  formatDayHeader,
  hourLabels,
  formatClock,
  formatDuration,
  cardTimeLabel,
  eventTitle,
  eventBgFor,
  eventBorderFor,
  eventInkFor,
  eventAriaLabel,
  kbdPreviewAriaLabel,
  a11y,
  onA11yAnnounce,
} = useTimeGridPresentation<TMeta>({ state, timeRange });

// ─── Geometry ────────────────────────────────────────────────────────

/** Width of the sticky label column (day header + all-day chips), px. */
const LABEL_WIDTH_PX = 132;
const HEADER_HEIGHT_PX = 28;
const CHIP_HEIGHT_PX = 18;
const CHIP_GAP_PX = 2;
const LABEL_LINE_PX = 20;

const geometry = computed<TimeRowsGeometry>(() => ({
  laneHeightPx: density.value === 'compact' ? 22 : density.value === 'spacious' ? 30 : 26,
  laneGapPx: 2,
  rowPaddingPx: 4,
  minRowHeightPx: density.value === 'compact' ? 36 : 44,
}));

const scrollerRef = useTemplateRef<HTMLElement>('scroller');
const bodyRef = useTemplateRef<HTMLElement>('body');
const scrollerWidthPx = ref(0);
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  const el = scrollerRef.value;
  if (!el) return;
  scrollerWidthPx.value = el.clientWidth;
  if (typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(() => {
    scrollerWidthPx.value = el.clientWidth;
  });
  resizeObserver.observe(el);
});
onBeforeUnmount(() => resizeObserver?.disconnect());

const totalHours = computed(() => timeRange.value[1] - timeRange.value[0]);
/** Pixels per minute along the shared axis — `pixelsPerHour`, stretched to fit. */
const pxPerMin = computed(() =>
  timeRowsPxPerMinute(
    state.value.pixelsPerHour,
    totalHours.value,
    scrollerWidthPx.value - LABEL_WIDTH_PX,
  ),
);
const trackWidthPx = computed(() => totalHours.value * 60 * pxPerMin.value);
const slotWidthPx = computed(() => slotDuration.value * pxPerMin.value);
const hourWidthPx = computed(() => 60 * pxPerMin.value);

function minutesToX(min: number): number {
  return min * pxPerMin.value;
}

// ─── All-day chips (label cell) ──────────────────────────────────────

/** All-day events covering `date` (end exclusive, RFC 5545). */
function allDayEventsOn(date: Temporal.PlainDate): CalendarEvent<TMeta>[] {
  return state.value.events.filter((e) => {
    if (!isAllDayEvent(e)) return false;
    const start = e.start;
    // No end, or an end not after the start: a one-day event.
    const end =
      e.end && Temporal.PlainDate.compare(e.end, start) > 0 ? e.end : start.add({ days: 1 });
    return (
      Temporal.PlainDate.compare(start, date) <= 0 && Temporal.PlainDate.compare(date, end) < 0
    );
  });
}
const allDayByDay = computed(() => {
  const out = new Map<string, CalendarEvent<TMeta>[]>();
  for (const d of days.value) out.set(d.toString(), allDayEventsOn(d));
  return out;
});
function chipsFor(date: Temporal.PlainDate): CalendarEvent<TMeta>[] {
  return allDayByDay.value.get(date.toString()) ?? [];
}

// ─── Drag & drop ─────────────────────────────────────────────────────

const allDayColumnsRef = ref<HTMLElement | null>(null);

/** y → row, x → minutes; the body's rect moves with both scroll axes. */
const timedAxis: TimedAxisAdapter = {
  orientation: 'horizontal',
  pixelsPerMinute: () => pxPerMin.value,
  minutesAt(clientX) {
    const body = bodyRef.value;
    const ppm = pxPerMin.value;
    if (!body || ppm <= 0) return 0;
    return (clientX - body.getBoundingClientRect().left - LABEL_WIDTH_PX) / ppm;
  },
  locate(clientX, clientY) {
    const body = bodyRef.value;
    if (!body) return null;
    const rect = body.getBoundingClientRect();
    const index = rowIndexAtY(rows.value, clientY - rect.top);
    if (index === null) return null;
    const x = clientX - rect.left - LABEL_WIDTH_PX;
    const ppm = pxPerMin.value;
    if (ppm <= 0) return null;
    return { day: rows.value[index].date, minutesFromGridStart: Math.max(0, x / ppm) };
  },
};

const {
  dnd,
  workingEvents,
  dragSourceSnapshot,
  invalidTimedGhost,
  isPreviewEvent,
  onEventPointerdown,
  onEventKeydown,
  keyboardDrag,
} = useTimeGridDnd({
  events: () => state.value.events,
  days,
  timeRange,
  pixelsPerHour: computed(() => pxPerMin.value * 60),
  slotDuration,
  timezone: () => timezone.value,
  dstPolicy: () => state.value.dstPolicy,
  surfaceRef: scrollerRef,
  columnsRef: bodyRef,
  allDayColumnsRef,
  topBufferMinutes: computed(() => 0),
  timedAxis,
  orientation: 'horizontal',
  canDrop: state.value.canDrop ?? undefined,
  onEventClick: (event, native) => {
    if (native) props.builder.state.onEventClick?.({ event, native });
  },
  onEventDrop: (payload) => props.builder.state.onEventDrop?.(payload),
  onAnnounce: (kind, payload) => onA11yAnnounce(kind, payload),
});

// ─── Time-range selection, bands, draft ──────────────────────────────

const selection = useTimeSelection<TMeta>({
  builder: props.builder,
  axis: timedAxis,
  timeRange,
  slotDuration,
  timezone,
  events: () => state.value.events,
});
const selectable = computed(() => toValue(props.builder.state.timeRangeSelect));
const overlays = useTimeGridOverlays<TMeta>({
  builder: props.builder,
  days,
  timeRange,
  timezone,
});
/** Left offset in a track of a minute of the day. */
function minuteOfDayToPx(minuteOfDay: number): number {
  return minutesToX(minuteOfDay - timeRange.value[0] * 60);
}
const axisMark = computed(() =>
  timeAxisMark({
    drag: selection.dragSelection.value,
    hoverMinute: selection.hoverMinute.value,
    draft: overlays.draft.value,
    draftSegments: days.value
      .map((d) => overlays.draftFor(d))
      .filter((s): s is CalendarDraftSegment => s !== null),
    timezone: timezone.value,
    toPx: minuteOfDayToPx,
    formatClock,
    formatDuration,
  }),
);
/** The hover indicator's line through all rows (body coordinates). */
const hoverLineLeftPx = computed(() =>
  selection.hoverMinute.value === null
    ? null
    : LABEL_WIDTH_PX + minuteOfDayToPx(selection.hoverMinute.value),
);
/** The label column is not part of the time axis: no hover there. */
function onBodyPointermove(e: PointerEvent) {
  const target = e.target;
  if (target instanceof Element && target.closest('.coar-time-rows__label')) {
    selection.onPointerleave();
    return;
  }
  selection.onPointermove(e);
}

// ─── Rows ────────────────────────────────────────────────────────────

const layout = computed(() => {
  const dragged = dnd.draggedEvent.value;
  const mode = dnd.dragMode.value;
  const isTimedMode =
    mode === 'timed' || mode === 'timed-resize-start' || mode === 'timed-resize-end';
  const g = geometry.value;
  return layoutTimeRows(workingEvents.value, {
    ...g,
    days: days.value,
    timeRange: timeRange.value,
    timezone: timezone.value,
    // Keep the drag preview on its cluster's last lane so it does not
    // jump between lanes while the pointer moves.
    priorityId: dragged !== null && isTimedMode ? `${dragged.id}__preview` : undefined,
    rowMinHeightPx: (date) => {
      const chips = chipsFor(date).length;
      return chips === 0
        ? 0
        : g.rowPaddingPx * 2 + LABEL_LINE_PX + chips * (CHIP_HEIGHT_PX + CHIP_GAP_PX);
    },
  });
});
const rows = computed(() => layout.value.rows);

function laneTop(lane: number): number {
  return timeRowLaneTopPx(lane, geometry.value);
}
function cardLeft(startMinutes: number): number {
  return minutesToX(startMinutes) + 1;
}
function cardWidth(startMinutes: number, endMinutes: number): number {
  return Math.max(8, minutesToX(endMinutes - startMinutes) - 2);
}
/**
 * Stand-in layout for the phantom / invalid variants — they never
 * render the slot, the prop is plumbing only.
 */
const phantomPositionedStub: PositionedEvent<TMeta> = {
  event: {
    id: '__phantom__',
    start: Temporal.ZonedDateTime.from('1970-01-01T00:00:00+00:00[UTC]'),
  } as CalendarEvent<TMeta>,
  startMinutes: 0,
  endMinutes: 0,
  lane: 0,
  laneCount: 1,
  clippedTop: false,
  clippedBottom: false,
};

/** The time beside the title once a card has room for both. */
const SHOW_TIME_MIN_WIDTH_PX = 110;

// ─── Click hooks ─────────────────────────────────────────────────────

/** Slot time under the pointer in a row's track, snapped down to the slot grid. */
function slotTimeAt(e: MouseEvent): Temporal.PlainTime | null {
  const track = e.currentTarget as HTMLElement;
  const x = e.clientX - track.getBoundingClientRect().left;
  const ppm = pxPerMin.value;
  if (ppm <= 0 || x < 0) return null;
  const slots = Math.floor(x / ppm / slotDuration.value);
  const total = timeRange.value[0] * 60 + slots * slotDuration.value;
  const hour = Math.floor(total / 60);
  if (hour < 0 || hour >= 24) return null;
  return Temporal.PlainTime.from({ hour, minute: total % 60 });
}

function onTrackPointerdown(e: PointerEvent, date: Temporal.PlainDate) {
  // A card's pointerdown bubbles through its track — that's an event click.
  if (originatesFromEvent(e)) return;
  const time = slotTimeAt(e);
  if (!time) return;
  // With `timeRangeSelect` a mouse press belongs to the selection (it
  // runs the click on release unless the press became a drag); touch
  // and pen keep their tap path, the click wrapped to add the range.
  const fire = selection.onSurfacePointerdown(e, () =>
    props.builder.state.onTimeClick?.({ date, time, native: e }),
  );
  if (!fire) return;
  // Mouse: at once. Touch / pen: only for a tap, after its click — a
  // scroll of the rows starts with a finger on a track as well.
  onSurfacePointerdown(e, fire);
}
function onTrackDblclick(e: MouseEvent, date: Temporal.PlainDate) {
  if (originatesFromEvent(e)) return;
  const time = slotTimeAt(e);
  if (!time) return;
  props.builder.state.onTimeDoubleClick?.({ date, time, native: e });
}
function onLabelPointerdown(e: PointerEvent, date: Temporal.PlainDate) {
  if (originatesFromEvent(e)) return;
  onSurfacePointerdown(e, () => props.builder.state.onDateClick?.({ date, native: e }));
}
function onLabelDblclick(e: MouseEvent, date: Temporal.PlainDate) {
  if (originatesFromEvent(e)) return;
  props.builder.state.onDateDoubleClick?.({ date, native: e });
}
function onChipPointerdown(e: PointerEvent, event: CalendarEvent<TMeta>) {
  onSurfacePointerdown(e, () => props.builder.state.onEventClick?.({ event, native: e }));
}
function onChipKeydown(e: KeyboardEvent, event: CalendarEvent<TMeta>) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  props.builder.state.onEventClick?.({ event, native: e as unknown as PointerEvent });
}

// ─── Scroll-to-time ──────────────────────────────────────────────────

function scrollToTime(time: Temporal.PlainTime): void {
  const scroller = scrollerRef.value;
  if (!scroller) return;
  const x = minutesToX((time.hour - timeRange.value[0]) * 60 + time.minute);
  scroller.scrollTo({ left: Math.max(0, x), behavior: 'smooth' });
}
onMounted(() => props.builder._setScrollToTime(scrollToTime));
onBeforeUnmount(() => props.builder._setScrollToTime(undefined));

const viewName = computed(() => props.builder.state.view.value);

defineExpose({
  /** Row layout — useful for tests. */
  getLayout: () => layout.value,
  scrollToTime,
});
</script>

<template>
  <div
    class="coar-time-rows"
    :class="[
      `coar-time-rows--density-${density}`,
      {
        'coar-time-rows--shade-weekends': state.shadeWeekends,
        'coar-time-rows--selectable': selectable,
        'coar-time-rows--selecting': selection.selecting.value,
      },
    ]"
    :style="{
      '--coar-time-rows-label-width': LABEL_WIDTH_PX + 'px',
      '--coar-time-rows-header-height': HEADER_HEIGHT_PX + 'px',
    }"
    role="region"
    :aria-label="
      days.length === 1
        ? t('coar.calendar.timegrid.dayLabel', undefined, 'Day view')
        : viewName === 'day'
          ? t('coar.calendar.timegrid.multiDayLabel', undefined, 'Multi-day view')
          : t('coar.calendar.timegrid.weekLabel', undefined, 'Week view')
    "
  >
    <div class="coar-time-rows__a11y-live" role="status" aria-live="polite" aria-atomic="true">
      {{ a11y.message.value }}
    </div>
    <div ref="scroller" class="coar-time-rows__scroller">
      <div class="coar-time-rows__canvas" :style="{ width: LABEL_WIDTH_PX + trackWidthPx + 'px' }">
        <!-- Hour header: sticky top; its corner sticks left as well. -->
        <div class="coar-time-rows__header" aria-hidden="true">
          <div class="coar-time-rows__corner" />
          <div class="coar-time-rows__hours" :style="{ width: trackWidthPx + 'px' }">
            <div
              v-for="entry in hourLabels"
              :key="entry.hour"
              class="coar-time-rows__hour-label"
              :data-hour="entry.hour"
              :style="{ left: minutesToX((entry.hour - timeRange[0]) * 60) + 'px' }"
            >
              {{ entry.label }}
            </div>
            <CoarTimeAxisMarker v-if="axisMark" orientation="horizontal" :mark="axisMark" />
          </div>
        </div>

        <div
          ref="body"
          class="coar-time-rows__body"
          :style="{ height: layout.totalHeightPx + 'px' }"
          @pointermove="onBodyPointermove"
          @pointerleave="selection.onPointerleave"
        >
          <div
            v-for="row in rows"
            :key="row.date.toString()"
            class="coar-time-rows__row"
            :class="{
              'coar-time-rows__row--today': isToday(row.date),
              'coar-time-rows__row--weekend': isWeekend(row.date),
            }"
            :style="{ height: row.heightPx + 'px' }"
            :data-day-key="row.date.toString()"
            role="group"
            :aria-label="formatDayHeader(row.date)"
          >
            <!-- Label cell: day header + all-day chips. Sticky left. -->
            <div
              class="coar-time-rows__label"
              @pointerdown="onLabelPointerdown($event, row.date)"
              @dblclick="onLabelDblclick($event, row.date)"
            >
              <div class="coar-time-rows__day">
                <slot
                  v-if="slots.dayHeader"
                  name="dayHeader"
                  :date="row.date"
                  :is-today="isToday(row.date)"
                  :is-weekend="isWeekend(row.date)"
                />
                <RenderDayHeader
                  v-else-if="state.dayHeaderRenderer"
                  :renderer="state.dayHeaderRenderer!"
                  :ctx="{
                    date: row.date,
                    isToday: isToday(row.date),
                    isWeekend: isWeekend(row.date),
                  }"
                />
                <span v-else class="coar-time-rows__day-label">{{
                  formatDayHeader(row.date)
                }}</span>
              </div>
              <div
                v-for="chip in chipsFor(row.date)"
                :key="chip.id"
                class="coar-time-rows__chip"
                :style="{
                  '--event-bg': eventBgFor(chip),
                  '--event-border': eventBorderFor(chip),
                  '--event-ink': eventInkFor(chip),
                }"
                :data-event-id="chip.id"
                tabindex="0"
                role="button"
                :aria-label="eventAriaLabel(chip)"
                :title="eventTitle(chip)"
                @pointerdown="onChipPointerdown($event, chip)"
                @keydown="onChipKeydown($event, chip)"
                @dblclick.stop="
                  props.builder.state.onEventDoubleClick?.({ event: chip, native: $event })
                "
              >
                {{ eventTitle(chip) }}
              </div>
            </div>

            <!-- Track: the row's time axis. Slot lines are a gradient. -->
            <div
              class="coar-time-rows__track"
              :style="{
                width: trackWidthPx + 'px',
                '--coar-time-rows-slot-px': slotWidthPx + 'px',
                '--coar-time-rows-hour-px': hourWidthPx + 'px',
              }"
              @pointerdown="onTrackPointerdown($event, row.date)"
              @dblclick="onTrackDblclick($event, row.date)"
            >
              <!-- Host bands behind the events (`builder.backgrounds`). -->
              <CoarCalendarBands
                :bands="overlays.bandsFor(row.date)"
                layer="below"
                orientation="horizontal"
                :to-px="minuteOfDayToPx"
              />
              <CoarTimeRowsEvent
                v-for="p in row.positioned"
                :key="p.event.id"
                :event="p.event"
                :positioned="p"
                :variant="isPreviewEvent(p.event.id) ? 'preview' : 'live'"
                :kbd-active="keyboardDrag !== null"
                :bg="eventBgFor(p.event)"
                :ink="eventInkFor(p.event)"
                :border="eventBorderFor(p.event)"
                :title="eventTitle(p.event)"
                :time-label="cardTimeLabel(p.event)"
                :show-time="cardWidth(p.startMinutes, p.endMinutes) >= SHOW_TIME_MIN_WIDTH_PX"
                :display-zone="timezone"
                :aria-label="
                  isPreviewEvent(p.event.id) && keyboardDrag
                    ? kbdPreviewAriaLabel(p.event)
                    : eventAriaLabel(p.event)
                "
                :density="density"
                :left="cardLeft(p.startMinutes)"
                :width="cardWidth(p.startMinutes, p.endMinutes)"
                :top="laneTop(p.lane)"
                :height="geometry.laneHeightPx"
                :z-index="isPreviewEvent(p.event.id) ? 100 : p.lane + 1"
                :clipped-start="p.clippedTop"
                :clipped-end="p.clippedBottom"
                @pointerdown="onEventPointerdown($event, p.event, dnd.startDrag)"
                @keydown="onEventKeydown($event, p.event)"
                @dblclick="
                  props.builder.state.onEventDoubleClick?.({ event: p.event, native: $event })
                "
                @pointerenter="
                  props.builder.state.onEventHover?.({ event: p.event, native: $event })
                "
                @pointerleave="
                  props.builder.state.onEventHoverLeave?.({ event: p.event, native: $event })
                "
                @start-resize="dnd.startTimedResizeStart(p.event)($event)"
                @end-resize="dnd.startTimedResizeEnd(p.event)($event)"
              >
                <template
                  v-if="slots.event || state.eventRenderer"
                  #default="{ event: e, positioned: pp }"
                >
                  <slot v-if="slots.event" name="event" :event="e" :layout="pp" />
                  <RenderEvent
                    v-else-if="state.eventRenderer"
                    :renderer="state.eventRenderer!"
                    :ctx="{
                      event: e,
                      view: viewName,
                      layout: { kind: 'positioned', layout: pp },
                      orientation: 'horizontal',
                    }"
                  />
                </template>
              </CoarTimeRowsEvent>

              <!-- Source phantom at the dragged event's original place. -->
              <CoarTimeRowsEvent
                v-if="dragSourceSnapshot && dragSourceSnapshot.dayKey === row.date.toString()"
                variant="phantom"
                :event="dragSourceSnapshot.event"
                :positioned="phantomPositionedStub"
                :bg="eventBgFor(dragSourceSnapshot.event)"
                :ink="eventInkFor(dragSourceSnapshot.event)"
                :border="eventBorderFor(dragSourceSnapshot.event)"
                :title="eventTitle(dragSourceSnapshot.event)"
                :density="density"
                :left="cardLeft(dragSourceSnapshot.startMinutes)"
                :width="cardWidth(dragSourceSnapshot.startMinutes, dragSourceSnapshot.endMinutes)"
                :top="laneTop(Math.min(dragSourceSnapshot.lane, row.laneCount - 1))"
                :height="geometry.laneHeightPx"
                :z-index="dragSourceSnapshot.lane + 1"
              />

              <!-- Invalid ghost: canDrop vetoed the slot under the pointer. -->
              <CoarTimeRowsEvent
                v-if="
                  invalidTimedGhost &&
                  invalidTimedGhost.dayKey === row.date.toString() &&
                  dnd.draggedEvent.value
                "
                variant="invalid"
                :event="dnd.draggedEvent.value!"
                :positioned="phantomPositionedStub"
                :bg="eventBgFor(dnd.draggedEvent.value!)"
                :ink="eventInkFor(dnd.draggedEvent.value!)"
                :border="eventBorderFor(dnd.draggedEvent.value!)"
                :title="eventTitle(dnd.draggedEvent.value!)"
                :snapping-back="dnd.snappingBack.value"
                :density="density"
                :left="cardLeft(invalidTimedGhost.startMinutes)"
                :width="cardWidth(0, invalidTimedGhost.durationMinutes)"
                :top="laneTop(0)"
                :height="geometry.laneHeightPx"
                :z-index="100"
              />

              <CoarTimeGridNowMarker
                v-if="isToday(row.date) && nowMinutesFromGridStart !== null"
                orientation="horizontal"
                :left-px="minutesToX(nowMinutesFromGridStart)"
              />

              <!-- Bands above the events, the selection and the host's draft. -->
              <CoarCalendarBands
                :bands="overlays.bandsFor(row.date)"
                layer="above"
                orientation="horizontal"
                :to-px="minuteOfDayToPx"
              />
              <CoarTimeSelectionLayer
                orientation="horizontal"
                :to-px="minuteOfDayToPx"
                :selection="selection.selectionFor(row.date)"
                :draft="overlays.draftFor(row.date)"
              >
                <template v-if="slots.draft" #draft="draftProps">
                  <slot name="draft" v-bind="draftProps" />
                </template>
              </CoarTimeSelectionLayer>
            </div>
          </div>
          <div
            v-if="hoverLineLeftPx !== null"
            class="coar-time-rows__hover-line"
            :style="{ left: hoverLineLeftPx + 'px' }"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-time-rows__a11y-live {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.coar-time-rows {
  position: relative;
  height: 100%;
  min-height: 0;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  font-variant-numeric: tabular-nums;
  background: var(--coar-calendar-bg, #fff);
}
.coar-time-rows__scroller {
  height: 100%;
  overflow: auto;
  /* Both axes scroll natively; there is no swipe paging here. */
  touch-action: pan-x pan-y;
  padding-bottom: var(--coar-calendar-scroll-inset-bottom, 0px);
  box-sizing: border-box;
}
.coar-time-rows__canvas {
  position: relative;
  min-width: 100%;
}

/* ── Hour header ─────────────────────────────────────────────── */
.coar-time-rows__header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  height: var(--coar-time-rows-header-height);
  background: var(--coar-calendar-bg, #fff);
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-time-rows__corner {
  position: sticky;
  left: 0;
  z-index: 2;
  flex: 0 0 var(--coar-time-rows-label-width);
  background: var(--coar-calendar-bg, #fff);
  border-right: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-time-rows__hours {
  position: relative;
  flex: 0 0 auto;
}
.coar-time-rows__hour-label {
  position: absolute;
  bottom: 6px;
  transform: translateX(4px);
  font-size: var(--coar-font-size-xs, 11px);
  color: var(--coar-text-subtle, #6c7280);
  white-space: nowrap;
}

/* ── Rows ────────────────────────────────────────────────────── */
.coar-time-rows__body {
  position: relative;
}
.coar-time-rows__row {
  display: flex;
  box-sizing: border-box;
  border-bottom: 1px solid var(--coar-calendar-border, #d1d5db);
}
.coar-time-rows__label {
  position: sticky;
  left: 0;
  z-index: 10;
  flex: 0 0 var(--coar-time-rows-label-width);
  box-sizing: border-box;
  padding: 4px 6px;
  overflow: hidden;
  background: var(--coar-calendar-bg, #fff);
  border-right: 1px solid var(--coar-calendar-border, #d1d5db);
  cursor: pointer;
}
.coar-time-rows__day {
  height: 20px;
  display: flex;
  align-items: center;
}
.coar-time-rows__day-label {
  font-size: var(--coar-font-size-sm, 13px);
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.coar-time-rows__row--today .coar-time-rows__day-label {
  color: var(--coar-color-accent, var(--coar-color-accent-500, #2563eb));
}
.coar-time-rows__chip {
  box-sizing: border-box;
  height: 18px;
  margin-top: 2px;
  padding: 0 6px;
  border-radius: 3px;
  border-left: 3px solid var(--event-border);
  background: var(--event-bg);
  color: var(--event-ink, var(--coar-text-base, #1a1c1f));
  font-size: var(--coar-font-size-xs, 11px);
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.coar-time-rows__chip:focus-visible {
  outline: 2px solid var(--coar-background-accent-primary, #2563eb);
  outline-offset: 1px;
}
.coar-time-rows__track {
  position: relative;
  flex: 0 0 auto;
  /* Hour lines strong, slot lines faint — painted, no DOM per slot. */
  background-image:
    repeating-linear-gradient(
      to right,
      var(--coar-calendar-border, #d1d5db) 0 1px,
      transparent 1px var(--coar-time-rows-hour-px)
    ),
    repeating-linear-gradient(
      to right,
      var(--coar-calendar-grid-line, #e3e5e9) 0 1px,
      transparent 1px var(--coar-time-rows-slot-px)
    );
  contain: layout;
}
.coar-time-rows--shade-weekends .coar-time-rows__row--weekend .coar-time-rows__track {
  background-color: var(--coar-calendar-bg-weekend, #f6f7f9);
}
.coar-time-rows__row--today .coar-time-rows__track {
  background-color: var(--coar-calendar-bg-today, rgba(37, 99, 235, 0.04));
}
/* Time-range selection: no text selection or iOS callout on a press. */
.coar-time-rows--selectable .coar-time-rows__track,
.coar-time-rows--selecting {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
/* Hover indicator: a thin line through every row at the pointer's time,
   under the sticky label column. */
.coar-time-rows__hover-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px solid
    color-mix(in srgb, var(--coar-background-accent-primary, #2563eb) 60%, transparent);
  pointer-events: none;
  z-index: 5;
}
.coar-time-rows--density-compact .coar-time-rows__day-label {
  font-size: var(--coar-font-size-xs, 11px);
}
</style>
