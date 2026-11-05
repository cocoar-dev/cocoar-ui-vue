<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
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

import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  useTemplateRef,
  watch,
} from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { useTimeGridDnd } from '../composables/useTimeGridDnd';
import { createVerticalTimedAxis } from '../composables/useCalendarDnd';
import { useTimeGridPresentation } from '../composables/useTimeGridPresentation';
import { useTimeGridSwipe, type TimeGridSwipeState } from '../composables/useTimeGridSwipe';
import {
  Temporal,
  layoutDayEvents,
  layoutAllDayBand,
  capAllDayBand,
  allDayBandLanes,
  type CalendarEvent,
  type PositionedEvent,
  type AllDayBar,
  type ViewWindow,
  resolveTimedCardAnatomy,
  type TimedCardAnatomy,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { RenderEvent, RenderDayHeader } from '../builders/render-helpers';
import CoarTimeGridEvent from './internal/time-grid/CoarTimeGridEvent.vue';
import CoarTimeGridAllDayBar from './internal/time-grid/CoarTimeGridAllDayBar.vue';
import CoarTimeGridNowMarker from './internal/time-grid/CoarTimeGridNowMarker.vue';
import CoarTimeGridHeader from './internal/time-grid/CoarTimeGridHeader.vue';
import CoarTimeGridAllDayBand from './internal/time-grid/CoarTimeGridAllDayBand.vue';
import CoarTimeGridColumn from './internal/time-grid/CoarTimeGridColumn.vue';
import CoarTimeGridAllDayOverflow from './internal/time-grid/CoarTimeGridAllDayOverflow.vue';
import CoarCalendarBands from './internal/time-grid/CoarCalendarBands.vue';
import CoarTimeSelectionLayer from './internal/time-grid/CoarTimeSelectionLayer.vue';
import CoarTimeAxisMarker from './internal/time-grid/CoarTimeAxisMarker.vue';
import { useTimeSelection } from '../composables/useTimeSelection';
import { useTimeGridOverlays, timeAxisMark } from '../composables/useTimeGridOverlays';
import type { CalendarDraftSegment } from '../builders/types';
import { originatesFromEvent } from './internal/originatesFromEvent';
import { afterFollowingClick, onSurfacePointerdown } from '../composables/surfaceTap';
import {
  contentAwareCascadeFrames,
  type CascadeFrame,
  type CascadeItem,
} from '../core/cascadeLayout';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
const props = defineProps<{
  builder: CalendarBuilder<TMeta>;
  /** One date per day-column to render. The wrapper (Day/Week
   *  view) computes this from the builder's date + firstDayOfWeek. */
  dates?: ReadonlyArray<Temporal.PlainDate>;
  /**
   * Read events for THIS window instead of the builder's visible
   * window. The neighbour pages drawn during a swipe pass their own
   * window; the live grid leaves it undefined.
   */
  window?: ViewWindow;
  /**
   * Neighbour-page mode: purely visual. No scroll registration on the
   * builder, `aria-hidden`, no pointer events, hour axis hidden (it
   * keeps its width so columns align with the live grid).
   */
  ghost?: boolean;
  /**
   * Ghost only: pin the sticky top (header + all-day band) to the live
   * grid's height so the hour rows of both pages line up during the
   * pan even when only one of them has an all-day band.
   */
  ghostTopPx?: number;
  /**
   * Ghost only: height of the live grid's all-day band (0 = none).
   * The ghost renders its band exactly that tall — an empty one when
   * it has no all-day events — so the pinned top stays opaque over the
   * ghost's own scrolled hour rows.
   */
  ghostBandPx?: number;
}>();
const emit = defineEmits<{
  /** The swipe runtime's state, for the surface that hosts the neighbour pages. */
  swipeState: [state: TimeGridSwipeState];
}>();
const { t } = useI18n();

const slots = defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  allDayEvent?(props: { event: CalendarEvent<TMeta>; layout: AllDayBar<TMeta> }): unknown;
  dayHeader?(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
  /** Custom drawing of the host's draft (`builder.draft`), one call per day it covers. */
  draft?(props: {
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
    segment: CalendarDraftSegment;
  }): unknown;
}>();

// ─── Builder bindings ────────────────────────────────────────────────
//
// Snapshot adapter — resolves every `MaybeRefOrGetter` field through
// `toValue` per Vue tick so the template can read `state.value.X`.
// `timeRange` is surfaced as both `{ startMinutes, endMinutes }` and an
// `[startHour, endHour]` tuple — internal hour-grid math reads the
// tuple, drop math reads the minutes form.
const state = computed(() => {
  const s = props.builder.state;
  const tr = toValue(s.timeRange);
  return {
    // Phase 4: read via the api so events from `events()` /
    // `eventsLoader()` AND expanded occurrences from `series()` /
    // `seriesLoader()` all reach the layout. A neighbour page reads
    // its own window.
    events: props.window
      ? props.builder.api.getEventsForWindow(props.window)
      : props.builder.api.getVisibleEvents(),
    timezone: toValue(s.timezone),
    locale: toValue(s.locale),
    density: toValue(s.density),
    dateStyle: toValue(s.dateStyle),
    timeStyle: toValue(s.timeStyle),
    hour12: toValue(s.hour12),
    timedEventDetailMinWidth: toValue(s.timedEventDetailMinWidth),
    timeRange: [Math.floor(tr.startMinutes / 60), Math.ceil(tr.endMinutes / 60)] as readonly [
      number,
      number,
    ],
    timeRangeMinutes: tr,
    slotDuration: toValue(s.slotDuration) as 5 | 10 | 15 | 30 | 60,
    pixelsPerHour: toValue(s.pixelsPerHour),
    canDrop: s.canDrop,
    eventRenderer: s.eventRenderer,
    eventTextContrast: toValue(s.eventTextContrast),
    allDayMaxVisibleLanes: toValue(s.allDayMaxVisibleLanes),
    allDayBandMode: toValue(s.allDayBandMode),
    swipeNavigation: toValue(s.swipeNavigation),
    dayHeaderRenderer: s.dayHeaderRenderer,
    dstPolicy: toValue(s.dstPolicy),
  };
});
const events = computed(() => state.value.events);
const timeRange = computed(() => state.value.timeRange);
const slotDuration = computed(() => state.value.slotDuration);
const pixelsPerHour = computed(() => state.value.pixelsPerHour);
const timezone = computed(() => state.value.timezone);
const density = computed(() => state.value.density);
const canDrop = computed(() => state.value.canDrop);

// Axis-free presentation shared with the horizontal grid: today / now,
// labels, colours, aria labels and the drag announcements.
const {
  nowMinutesFromGridStart,
  isToday: isTodayColumn,
  isWeekend,
  formatDayHeader,
  hourLabels,
  formatClock,
  formatDuration,
  cardTimeLabel,
  cardLocation,
  eventTitle,
  eventBgFor,
  eventBorderFor,
  eventInkFor,
  eventAriaLabel,
  kbdPreviewAriaLabel,
  a11y,
  onA11yAnnounce,
} = useTimeGridPresentation<TMeta>({ state, timeRange: computed(() => state.value.timeRange) });

// Script-local alias for the `dates` prop so the template / drop-pipeline
// reads stay terse.
const visibleDays = computed<ReadonlyArray<Temporal.PlainDate>>(
  () => (props.dates as ReadonlyArray<Temporal.PlainDate> | undefined) ?? [],
);
const days = visibleDays;

/**
 * Stand-in `PositionedEvent` / `AllDayBar` passed to the
 * `phantom` and `invalid` variants of `<CoarTimeGridEvent>` /
 * `<CoarTimeGridAllDayBar>`. Those variants don't invoke the
 * slot — the prop is plumbing only, never observed.
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
const phantomAllDayBarStub: AllDayBar<TMeta> = {
  event: {
    id: '__phantom__',
    start: Temporal.PlainDate.from('1970-01-01'),
  } as CalendarEvent<TMeta>,
  lane: 0,
  laneCount: 1,
  startCol: 0,
  endCol: 0,
  clippedStart: false,
  clippedEnd: false,
};

// ─── Drag & Drop ──────────────────────────────────────────────────────

const columnsRef = useTemplateRef<HTMLElement>('columns');
const allDayColumnsRef = ref<HTMLElement | null>(null);
function setAllDayColumnsEl(el: HTMLElement | null) {
  allDayColumnsRef.value = el;
}

// Touch paging (iOS parity). Owns the `--coar-time-grid-swipe-x`
// translate the header cells, all-day columns and body columns share.
const swipe = useTimeGridSwipe({
  columnsEl: columnsRef,
  enabled: () => state.value.swipeNavigation && !props.ghost,
  onCommit: (direction) => (direction === 1 ? props.builder.api.next() : props.builder.api.prev()),
});
watch(
  () => ({
    engaged: swipe.engaged.value,
    swiping: swipe.isSwiping.value,
    settling: swipe.settling.value,
    offsetX: swipe.swipeStyle.value['--coar-time-grid-swipe-x'],
  }),
  (s) => emit('swipeState', s),
  { flush: 'sync' },
);

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

const daysRef = visibleDays;
const renderBufferMinutesRef = computed(() => RENDER_BUFFER_MINUTES);
/** One hit-test for drag & drop and time-range selection. */
const timedAxis = createVerticalTimedAxis({
  columnsRef,
  days: daysRef,
  pixelsPerHour,
  topBufferMinutes: renderBufferMinutesRef,
});

const {
  dnd,
  workingEvents,
  dragSourceSnapshot,
  dragAllDaySourceSnapshot,
  invalidTimedGhost,
  invalidAllDayGhost,
  isPreviewEvent,
  onEventPointerdown,
  onEventKeydown,
  keyboardDrag,
} = useTimeGridDnd({
  events: () => events.value,
  days: daysRef,
  timeRange,
  pixelsPerHour,
  slotDuration,
  timezone: () => timezone.value,
  // Article 5: forward the active dstPolicy so `.dstPolicy('reject')`
  // (or 'earlier' / 'later') on the builder actually reaches the
  // drop math. Without this, view-layer drops always ran with the
  // polyfill default — the public API surface advertised a knob that
  // had no runtime effect.
  dstPolicy: () => state.value.dstPolicy,
  surfaceRef,
  columnsRef,
  allDayColumnsRef,
  topBufferMinutes: renderBufferMinutesRef,
  timedAxis,
  canDrop: canDrop.value ?? undefined,
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
  events: () => events.value,
  // A long press took the finger: it no longer pages the grid.
  onClaim: (pointerId) => swipe.release(pointerId),
});
const selectable = computed(() => !props.ghost && toValue(props.builder.state.timeRangeSelect));
const overlays = useTimeGridOverlays<TMeta>({
  builder: props.builder,
  days: visibleDays,
  timeRange,
  timezone,
});
/** Top offset in a column of a minute of the day. */
function minuteOfDayToPx(minuteOfDay: number): number {
  return minutesToOffsetPx(minuteOfDay - timeRange.value[0] * 60);
}
const axisMark = computed(() => {
  if (props.ghost) return null;
  return timeAxisMark({
    drag: selection.dragSelection.value,
    hoverMinute: selection.hoverMinute.value,
    draft: overlays.draft.value,
    draftSegments: visibleDays.value
      .map((d) => overlays.draftFor(d))
      .filter((s): s is CalendarDraftSegment => s !== null),
    timezone: timezone.value,
    toPx: minuteOfDayToPx,
    formatClock,
    formatDuration,
  });
});
/** The hover indicator's line across all columns. */
const hoverLinePx = computed(() =>
  props.ghost || selection.hoverMinute.value === null
    ? null
    : minuteOfDayToPx(selection.hoverMinute.value),
);

// All event emission flows through the builder's `_emit*` family
// (set up by the consumer via builder.onTimeClick / onTimeDoubleClick /
// onEventClick / onEventDrop / onEventDoubleClick / onDateClick /
// onDateDoubleClick). No defineEmits.

// ─── Geometry ─────────────────────────────────────────────────────────

/**
 * Visual padding (in minutes) rendered above the first hour and
 * below the last hour of the time range. The hour-axis labels and
 * gridlines sit `RENDER_BUFFER_MINUTES` of pixels into the grid
 * body — semantically the time range is unchanged, but events at
 * the boundary now have breathing room for their focus halo and
 * resize handles instead of being flush against the all-day band
 * (top) or the bottom edge of the body. 15 min keeps the buffer
 * small enough that it doesn't waste vertical real estate but big
 * enough to fit a 2 px halo + a 6 px resize handle without
 * clipping. The same buffer is added at the bottom for symmetry.
 */
const RENDER_BUFFER_MINUTES = 15;

const totalHours = computed(() => timeRange.value[1] - timeRange.value[0]);
// Body height includes a leading + trailing render buffer so events
// at the time-range boundary have room for their focus halo / resize
// handles without being clipped or covered by the all-day band.
const totalHeightPx = computed(
  () =>
    totalHours.value * pixelsPerHour.value +
    (2 * (pixelsPerHour.value * RENDER_BUFFER_MINUTES)) / 60,
);

const slotHeightPx = computed(() => (pixelsPerHour.value * slotDuration.value) / 60);

// ─── Per-day event layout ─────────────────────────────────────────────

const dayLayouts = computed<
  {
    date: Temporal.PlainDate;
    positioned: PositionedEvent<TMeta>[];
    horizontalFrames: Map<string, CascadeFrame>;
  }[]
>(() => {
  // While dragging, anchor the preview event to the rightmost lane
  // within its overlap component. Without this, the greedy lane
  // assignment can flip the ghost between left/right lanes as the
  // user drags through slots with shifting overlap shapes — which
  // feels jumpy.
  const dragged = dnd.draggedEvent.value;
  const mode = dnd.dragMode.value;
  // Anchor the preview rightmost-lane while the dragged event is
  // being moved or resized in the time grid. Other modes
  // (`'month'`, `'allDay*'`) don't go through `layoutDayEvents`.
  const isTimedMode =
    mode === 'timed' || mode === 'timed-resize-start' || mode === 'timed-resize-end';
  const previewId = dragged !== null && isTimedMode ? `${dragged.id}__preview` : undefined;
  return visibleDays.value.map((day) => {
    const positioned = layoutDayEvents(workingEvents.value, {
      day,
      timeRange: timeRange.value,
      timezone: timezone.value,
      priorityId: previewId,
    });
    const hasCustomContent = !!slots.event || state.value.eventRenderer !== null;
    const cascadeItems: CascadeItem[] = positioned.map((item) => {
      const meta = item.event.meta as
        | { title?: unknown; location?: unknown; assignees?: unknown }
        | undefined;
      const title = typeof meta?.title === 'string' ? meta.title : '';
      const assignees = Array.isArray(meta?.assignees) ? meta.assignees.length : 0;
      const duration = item.endMinutes - item.startMinutes;
      const textHeight =
        18 +
        (typeof meta?.location === 'string' && duration >= 34 ? 13 : 0) +
        (duration >= 52 ? 13 : 0);
      const textMinutes =
        pixelsPerHour.value > 0 ? (textHeight / pixelsPerHour.value) * 60 : Infinity;
      const preferred = Math.min(
        58,
        Math.max(24, 10 + Math.min(title.length, 32) * 1.15 + Math.min(assignees, 3) * 8),
      );
      return {
        id: item.event.id,
        lane: item.lane,
        laneCount: item.laneCount,
        startMinutes: item.startMinutes,
        endMinutes: item.endMinutes,
        textEndMinutes: hasCustomContent ? Infinity : item.startMinutes + textMinutes,
        preferredVisibleWidth: hasCustomContent ? Infinity : preferred,
        compactPreferredVisibleWidth: hasCustomContent
          ? Infinity
          : Math.min(preferred, 32 + Math.min(assignees, 1) * 8),
      };
    });
    return {
      date: day,
      positioned,
      horizontalFrames: contentAwareCascadeFrames(cascadeItems),
    };
  });
});

function eventHorizontalStyle(
  layout: { horizontalFrames: Map<string, CascadeFrame> },
  positioned: PositionedEvent<TMeta>,
): { left: string; width: string } {
  const frame = layout.horizontalFrames.get(positioned.event.id);
  if (!frame) {
    return {
      left: `calc(${(positioned.lane / positioned.laneCount) * 100}% + 2px)`,
      width: `calc(${100 / positioned.laneCount}% - 4px)`,
    };
  }
  return {
    left: `calc(${frame.x}% + 2px)`,
    width: `calc(${frame.width}% - 4px)`,
  };
}

// ─── Card anatomy (iOS 4.0 parity) ───────────────────────────────────
// The cascade works in percent of the column; the compact switch needs
// pixels. Measure the columns container once mounted and on resize.

const columnsWidthPx = ref(0);
let columnsObserver: ResizeObserver | null = null;
onMounted(() => {
  const el = columnsRef.value;
  if (!el) return;
  columnsWidthPx.value = el.getBoundingClientRect().width;
  if (typeof ResizeObserver === 'undefined') return;
  columnsObserver = new ResizeObserver(([entry]) => {
    columnsWidthPx.value = entry.contentRect.width;
  });
  columnsObserver.observe(el);
});
onBeforeUnmount(() => columnsObserver?.disconnect());

const columnWidthPx = computed(() =>
  columnsWidthPx.value > 0 && visibleDays.value.length > 0
    ? columnsWidthPx.value / visibleDays.value.length
    : 0,
);
function cardAnatomy(
  layout: { horizontalFrames: Map<string, CascadeFrame> },
  positioned: PositionedEvent<TMeta>,
): TimedCardAnatomy {
  const frame = layout.horizontalFrames.get(positioned.event.id);
  const fraction = frame ? frame.visibleContentWidth / 100 : 1 / positioned.laneCount;
  const visibleWidthPx = columnWidthPx.value > 0 ? columnWidthPx.value * fraction - 4 : null;
  return resolveTimedCardAnatomy({
    durationMinutes: positioned.endMinutes - positioned.startMinutes,
    visibleWidthPx,
    detailMinWidth: state.value.timedEventDetailMinWidth,
    overlapped: positioned.laneCount > 1,
    hasLocation: cardLocation(positioned.event) !== undefined,
  });
}

// All-day band: filtered to all-day + multi-day-all-day events,
// laid out across the visible day columns. Empty when no all-day
// events match — band hides itself.
const allDayBars = computed<AllDayBar<TMeta>[]>(() => {
  return layoutAllDayBand(workingEvents.value, {
    days: visibleDays.value,
    timezone: timezone.value,
  });
});

/**
 * Lane cap (iOS parity). The user's expand choice lives here; it is
 * reset whenever the layout stops exceeding the cap so a band that
 * later shrinks doesn't remember a stale "expanded". An in-flight
 * all-day drag counts as expanded — the preview lane may sit beyond
 * the cap and must stay visible.
 */
const allDayExpanded = ref(false);
const allDayCap = computed(() =>
  capAllDayBand(allDayBars.value, {
    maxVisibleLanes: state.value.allDayMaxVisibleLanes,
    expanded: allDayExpanded.value || dragAllDaySourceSnapshot.value !== null,
    columnCount: days.value.length,
  }),
);
watch(
  () => allDayCap.value.exceedsCap,
  (exceeds) => {
    if (!exceeds) allDayExpanded.value = false;
  },
);
const allDayLaneCount = computed(() => allDayCap.value.visibleLanes);
/** Lanes the band is SIZED for — may exceed the content under `reservesCap` / `alwaysOneLane`. */
const allDayBandLaneCount = computed(() =>
  allDayBandLanes(
    allDayLaneCount.value,
    state.value.allDayBandMode,
    state.value.allDayMaxVisibleLanes,
  ),
);
const allDayMarkerTop = computed(
  () => 4 + (allDayLaneCount.value - 1) * (ALL_DAY_LANE_HEIGHT + ALL_DAY_LANE_GAP),
);
function allDayOverflowLabel(hidden: number): string {
  return t(
    'coar.calendar.timegrid.allDayMore',
    { count: hidden },
    `${hidden} more all-day events — show all`,
  );
}

const ALL_DAY_LANE_HEIGHT = 24;
const ALL_DAY_LANE_GAP = 2;
const allDayBandHeight = computed(() => {
  if (allDayBandLaneCount.value === 0) return 0;
  return allDayBandLaneCount.value * (ALL_DAY_LANE_HEIGHT + ALL_DAY_LANE_GAP) + 8;
});

// Convert minutes-from-day-start to pixels.
function minutesToPx(min: number): number {
  return (min * pixelsPerHour.value) / 60;
}

/**
 * Same as `minutesToPx`, plus the leading buffer offset. Use this
 * for any visual `top:` calculation tied to a time-of-day position
 * (events, hour labels, drop ghosts, resize handles) so the buffer
 * shifts every layer by the same amount and gridlines stay aligned.
 */
function minutesToOffsetPx(min: number): number {
  return minutesToPx(min + RENDER_BUFFER_MINUTES);
}

// ─── Click handling ──────────────────────────────────────────────────

/**
 * Slot time under the pointer, snapped to the slot grid. ONE
 * resolver for click and double-click so both hooks agree on what
 * "the slot at this y" means. The render buffer above the first hour
 * is not part of the range: y is measured from the first hour line,
 * and the buffer rows clamp to the first / last slot.
 */
function slotTimeAt(e: MouseEvent): Temporal.PlainTime | null {
  const col = e.currentTarget as HTMLElement;
  const rect = col.getBoundingClientRect();
  const yInRange = e.clientY - rect.top - minutesToPx(RENDER_BUFFER_MINUTES);
  // The slot the pointer is in.
  const lastSlot = Math.max(0, Math.ceil((totalHours.value * 60) / slotDuration.value) - 1);
  const slotIndex = Math.min(lastSlot, Math.max(0, Math.floor(yInRange / slotHeightPx.value)));
  const minutesFromStart = slotIndex * slotDuration.value;
  const totalMinFromMidnight = timeRange.value[0] * 60 + minutesFromStart;
  const hour = Math.floor(totalMinFromMidnight / 60);
  const minute = totalMinFromMidnight % 60;
  if (hour < 0 || hour >= 24) return null;
  return Temporal.PlainTime.from({ hour, minute });
}

function onColumnPointerDown(e: PointerEvent, date: Temporal.PlainDate) {
  // A card's pointerdown bubbles through its column — that's an event
  // click (onEventClick), not an empty-slot click.
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
  // Touch: the swipe runtime decides on release whether this was a
  // tap (→ fire, after the click that follows the lift so it can't
  // land on what the handler opens) or the start of a pan (→ page).
  // Otherwise (mouse, or paging off): at once for a mouse, after a
  // tap for touch / pen.
  if (swipe.onPointerdown(e, { onTap: () => afterFollowingClick(fire) })) return;
  onSurfacePointerdown(e, fire);
}

/**
 * The day-name strip is a paging handle for EVERY pointer type: there
 * is no event to drag and no slot to click up there, so a mouse drag
 * across the day names pages the grid like a finger does.
 */
function onHeaderPointerdown(e: PointerEvent) {
  swipe.onPointerdown(e, { allowMouse: true });
}

function onColumnDblclick(e: MouseEvent, date: Temporal.PlainDate) {
  const time = slotTimeAt(e);
  if (!time) return;
  props.builder.state.onTimeDoubleClick?.({ date, time, native: e });
}

function onAllDayCellPointerDown(e: PointerEvent, date: Temporal.PlainDate) {
  if (originatesFromEvent(e)) return;
  // Mouse: at once. Touch / pen: only for a tap, after its click.
  onSurfacePointerdown(e, () => props.builder.state.onDateClick?.({ date, native: e }));
}

function onAllDayCellDblclick(e: MouseEvent, date: Temporal.PlainDate) {
  props.builder.state.onDateDoubleClick?.({ date, native: e });
}

// Register the imperative scroll-to-time impl on the builder so
// CoarCalendar's api.scrollToTime can find it once the view mounts.
// The public api takes `Temporal.PlainTime`; the inner scroll logic
// works in numeric hours, so adapt at the boundary.
function scrollToTime(time: Temporal.PlainTime): void {
  const hour = time.hour;
  const surface = surfaceRef.value;
  if (!surface) return;
  const px = (hour - timeRange.value[0]) * pixelsPerHour.value;
  surface.scrollTo({ top: Math.max(0, px), behavior: 'smooth' });
}
onMounted(() => {
  if (!props.ghost) props.builder._setScrollToTime(scrollToTime);
});
onBeforeUnmount(() => {
  if (!props.ghost) props.builder._setScrollToTime(undefined);
});

defineExpose({
  /** Layout snapshot per day — useful for tests. */
  getLayout: () => dayLayouts.value,
  scrollToTime,
});
</script>

<template>
  <div
    class="coar-time-grid"
    :class="[
      `coar-time-grid--density-${density}`,
      {
        'coar-time-grid--settling': swipe.settling.value,
        'coar-time-grid--swiping': swipe.isSwiping.value,
        'coar-time-grid--ghost': props.ghost,
        'coar-time-grid--selectable': selectable,
        'coar-time-grid--selecting': selection.selecting.value,
      },
    ]"
    :style="props.ghost ? undefined : swipe.swipeStyle.value"
    :aria-hidden="props.ghost ? 'true' : undefined"
    role="region"
    :aria-label="
      days.length === 1
        ? t('coar.calendar.timegrid.dayLabel', undefined, 'Day view')
        : builder.state.view.value === 'day'
          ? t('coar.calendar.timegrid.multiDayLabel', undefined, 'Multi-day view')
          : t('coar.calendar.timegrid.weekLabel', undefined, 'Week view')
    "
  >
    <!-- Live region for SR announcements (move committed / move
         cancelled). Visually hidden but read out by assistive
         tech. -->
    <div class="coar-time-grid__a11y-live" role="status" aria-live="polite" aria-atomic="true">
      {{ a11y.message.value }}
    </div>
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
    <div
      class="coar-time-grid__sticky-top"
      :style="props.ghost && props.ghostTopPx ? { height: props.ghostTopPx + 'px' } : undefined"
    >
      <!-- Header row: blank cell over hour labels + one cell per day -->
      <CoarTimeGridHeader
        :days="days"
        :is-today="isTodayColumn"
        :is-weekend="isWeekend"
        :format-label="formatDayHeader"
        :density="density"
        :swipeable="state.swipeNavigation"
        @cells-pointerdown="onHeaderPointerdown"
      >
        <template v-if="$slots.dayHeader || state.dayHeaderRenderer" #dayHeader="slotProps">
          <slot v-if="$slots.dayHeader" name="dayHeader" v-bind="slotProps" />
          <RenderDayHeader
            v-else-if="state.dayHeaderRenderer"
            :renderer="state.dayHeaderRenderer!"
            :ctx="slotProps"
          />
        </template>
      </CoarTimeGridHeader>

      <!-- All-day band (between header and body, only if there are any) -->
      <CoarTimeGridAllDayBand
        v-if="props.ghost ? (props.ghostBandPx ?? 0) > 0 : allDayBandLaneCount > 0"
        :days="days"
        :axis-label="t('coar.calendar.timegrid.allDay', undefined, 'all-day')"
        :band-height-px="props.ghost ? (props.ghostBandPx ?? 0) : allDayBandHeight"
        :is-today="isTodayColumn"
        :is-weekend="isWeekend"
        :set-columns-el="props.ghost ? () => {} : setAllDayColumnsEl"
        :collapsible="allDayExpanded && allDayCap.exceedsCap"
        :collapse-label="t('coar.calendar.timegrid.allDayCollapse', undefined, 'Show fewer')"
        @cell-pointerdown="(e, day) => onAllDayCellPointerDown(e, day)"
        @cell-dblclick="(e, day) => onAllDayCellDblclick(e, day)"
        @collapse="allDayExpanded = false"
      >
        <!-- "+N" markers for the lanes folded away by the cap. -->
        <CoarTimeGridAllDayOverflow
          v-for="marker in allDayCap.overflow"
          :key="`overflow-${marker.col}`"
          :hidden="marker.hidden"
          :ariaLabel="allDayOverflowLabel(marker.hidden)"
          :top="allDayMarkerTop"
          :left="`calc(${(marker.col / days.length) * 100}% + ${marker.col === 0 ? 4 : 2}px)`"
          :width="`calc(${(1 / days.length) * 100}% - ${(marker.col === 0 ? 4 : 2) + (marker.col === days.length - 1 ? 4 : 2)}px)`"
          :height="ALL_DAY_LANE_HEIGHT"
          @expand="allDayExpanded = true"
        />
        <!--
          All-day bars on top of the day-cell background.
          Same calc()-based inset as timed events: 2 px gap left and
          right, box-sizing: border-box (in scoped CSS), so the
          rightmost bar's right edge sits exactly inside the band —
          no overflow, no overlap with adjacent bars.
        -->
        <CoarTimeGridAllDayBar
          v-for="bar in allDayCap.bars"
          :key="bar.event.id"
          :event="bar.event"
          :bar="bar"
          :variant="isPreviewEvent(bar.event.id) ? 'preview' : 'live'"
          :kbd-active="keyboardDrag !== null"
          :bg="eventBgFor(bar.event)"
          :ink="eventInkFor(bar.event)"
          :border="eventBorderFor(bar.event)"
          :title="eventTitle(bar.event)"
          :aria-label="
            isPreviewEvent(bar.event.id) && keyboardDrag
              ? kbdPreviewAriaLabel(bar.event)
              : eventAriaLabel(bar.event)
          "
          :density="density"
          :top="4 + bar.lane * (ALL_DAY_LANE_HEIGHT + ALL_DAY_LANE_GAP)"
          :left="`calc(${(bar.startCol / days.length) * 100}% + ${bar.startCol === 0 ? 4 : 2}px)`"
          :width="`calc(${((bar.endCol - bar.startCol + 1) / days.length) * 100}% - ${(bar.startCol === 0 ? 4 : 2) + (bar.endCol === days.length - 1 ? 4 : 2)}px)`"
          :height="ALL_DAY_LANE_HEIGHT"
          :z-index="isPreviewEvent(bar.event.id) ? 100 : 1"
          :clipped-start="bar.clippedStart"
          :clipped-end="bar.clippedEnd"
          @pointerdown="onEventPointerdown($event, bar.event, dnd.startAllDayDrag)"
          @keydown="onEventKeydown($event, bar.event)"
          @dblclick="props.builder.state.onEventDoubleClick?.({ event: bar.event, native: $event })"
          @pointerenter="props.builder.state.onEventHover?.({ event: bar.event, native: $event })"
          @pointerleave="
            props.builder.state.onEventHoverLeave?.({ event: bar.event, native: $event })
          "
          @start-resize="dnd.startAllDayResizeStart(bar.event)($event)"
          @end-resize="dnd.startAllDayResizeEnd(bar.event)($event)"
        >
          <template
            v-if="$slots.allDayEvent || state.eventRenderer"
            #default="{ event: e, bar: b }"
          >
            <slot v-if="$slots.allDayEvent" name="allDayEvent" :event="e" :layout="b" />
            <RenderEvent
              v-else-if="state.eventRenderer"
              :renderer="state.eventRenderer"
              :ctx="{ event: e, view: 'week', layout: { kind: 'allDayBar', layout: b } }"
            />
          </template>
        </CoarTimeGridAllDayBar>

        <!-- All-day source phantom: dimmed copy at the bar's original
             columns. Rendered from the snapshot captured at drag-start. -->
        <CoarTimeGridAllDayBar
          v-if="dragAllDaySourceSnapshot"
          variant="phantom"
          :event="dragAllDaySourceSnapshot.event"
          :bar="phantomAllDayBarStub"
          :bg="eventBgFor(dragAllDaySourceSnapshot.event)"
          :ink="eventInkFor(dragAllDaySourceSnapshot.event)"
          :border="eventBorderFor(dragAllDaySourceSnapshot.event)"
          :title="eventTitle(dragAllDaySourceSnapshot.event)"
          :density="density"
          :top="4 + dragAllDaySourceSnapshot.lane * (ALL_DAY_LANE_HEIGHT + ALL_DAY_LANE_GAP)"
          :left="`calc(${(dragAllDaySourceSnapshot.startCol / days.length) * 100}% + ${dragAllDaySourceSnapshot.startCol === 0 ? 4 : 2}px)`"
          :width="`calc(${((dragAllDaySourceSnapshot.endCol - dragAllDaySourceSnapshot.startCol + 1) / days.length) * 100}% - ${(dragAllDaySourceSnapshot.startCol === 0 ? 4 : 2) + (dragAllDaySourceSnapshot.endCol === days.length - 1 ? 4 : 2)}px)`"
          :height="ALL_DAY_LANE_HEIGHT"
          :z-index="1"
          :clipped-start="dragAllDaySourceSnapshot.clippedStart"
          :clipped-end="dragAllDaySourceSnapshot.clippedEnd"
        />

        <!-- Invalid all-day ghost: rendered when canDrop vetoed the
             target. Sits at the would-be drop columns with red dashed
             outline so the user sees their pointer slot. -->
        <CoarTimeGridAllDayBar
          v-if="invalidAllDayGhost && dnd.draggedEvent.value"
          variant="invalid"
          :event="dnd.draggedEvent.value!"
          :bar="phantomAllDayBarStub"
          :bg="eventBgFor(dnd.draggedEvent.value!)"
          :ink="eventInkFor(dnd.draggedEvent.value!)"
          :border="eventBorderFor(dnd.draggedEvent.value!)"
          :title="eventTitle(dnd.draggedEvent.value!)"
          :snapping-back="dnd.snappingBack.value"
          :density="density"
          :top="
            4 + (dragAllDaySourceSnapshot?.lane ?? 0) * (ALL_DAY_LANE_HEIGHT + ALL_DAY_LANE_GAP)
          "
          :left="`calc(${(invalidAllDayGhost.startCol / days.length) * 100}% + ${invalidAllDayGhost.startCol === 0 ? 4 : 2}px)`"
          :width="`calc(${((invalidAllDayGhost.endCol - invalidAllDayGhost.startCol + 1) / days.length) * 100}% - ${(invalidAllDayGhost.startCol === 0 ? 4 : 2) + (invalidAllDayGhost.endCol === days.length - 1 ? 4 : 2)}px)`"
          :height="ALL_DAY_LANE_HEIGHT"
          :z-index="100"
        />
      </CoarTimeGridAllDayBand>
    </div>
    <!-- /sticky-top wrapper -->

    <!-- Grid body: hour labels + day columns -->
    <div class="coar-time-grid__body" :style="{ height: totalHeightPx + 'px' }">
      <!-- Hour labels (left axis) -->
      <div class="coar-time-grid__hour-axis" :style="{ height: totalHeightPx + 'px' }">
        <div
          v-for="entry in hourLabels"
          :key="entry.hour"
          class="coar-time-grid__hour-label"
          :data-hour="entry.hour"
          :style="{
            top: minutesToOffsetPx((entry.hour - timeRange[0]) * 60) + 'px',
          }"
        >
          {{ entry.label }}
        </div>
        <CoarTimeAxisMarker v-if="axisMark" orientation="vertical" :mark="axisMark" />
      </div>

      <!-- Day columns -->
      <div
        ref="columns"
        class="coar-time-grid__columns"
        @pointermove="selection.onPointermove"
        @pointerleave="selection.onPointerleave"
      >
        <CoarTimeGridColumn
          v-for="layout in dayLayouts"
          :key="layout.date.toString()"
          :day="layout.date"
          :is-today="isTodayColumn(layout.date)"
          :is-weekend="isWeekend(layout.date)"
          :height-px="totalHeightPx"
          :slot-height-px="slotHeightPx"
          :render-buffer-offset-px="minutesToPx(RENDER_BUFFER_MINUTES)"
          @pointerdown="(e, day) => onColumnPointerDown(e, day)"
          @dblclick="(e, day) => onColumnDblclick(e, day)"
        >
          <!-- Host bands behind the events (`builder.backgrounds`). -->
          <CoarCalendarBands
            :bands="overlays.bandsFor(layout.date)"
            layer="below"
            orientation="vertical"
            :to-px="minuteOfDayToPx"
          />
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
          <CoarTimeGridEvent
            v-for="positioned in layout.positioned"
            :key="positioned.event.id"
            :event="positioned.event"
            :positioned="positioned"
            :variant="isPreviewEvent(positioned.event.id) ? 'preview' : 'live'"
            :kbd-active="keyboardDrag !== null"
            :bg="eventBgFor(positioned.event)"
            :ink="eventInkFor(positioned.event)"
            :border="eventBorderFor(positioned.event)"
            :title="eventTitle(positioned.event)"
            :location="cardLocation(positioned.event)"
            :time-label="cardTimeLabel(positioned.event)"
            :anatomy="cardAnatomy(layout, positioned)"
            :display-zone="timezone"
            :aria-label="
              isPreviewEvent(positioned.event.id) && keyboardDrag
                ? kbdPreviewAriaLabel(positioned.event)
                : eventAriaLabel(positioned.event)
            "
            :density="density"
            :top="minutesToOffsetPx(positioned.startMinutes)"
            :height="Math.max(16, minutesToPx(positioned.endMinutes - positioned.startMinutes))"
            :left="eventHorizontalStyle(layout, positioned).left"
            :width="eventHorizontalStyle(layout, positioned).width"
            :z-index="isPreviewEvent(positioned.event.id) ? 100 : positioned.lane + 1"
            :clipped-top="positioned.clippedTop"
            :clipped-bottom="positioned.clippedBottom"
            @pointerdown="onEventPointerdown($event, positioned.event, dnd.startDrag)"
            @keydown="onEventKeydown($event, positioned.event)"
            @dblclick="
              props.builder.state.onEventDoubleClick?.({ event: positioned.event, native: $event })
            "
            @pointerenter="
              props.builder.state.onEventHover?.({ event: positioned.event, native: $event })
            "
            @pointerleave="
              props.builder.state.onEventHoverLeave?.({ event: positioned.event, native: $event })
            "
            @start-resize="dnd.startTimedResizeStart(positioned.event)($event)"
            @end-resize="dnd.startTimedResizeEnd(positioned.event)($event)"
          >
            <template
              v-if="$slots.event || state.eventRenderer"
              #default="{ event: e, positioned: p }"
            >
              <slot v-if="$slots.event" name="event" :event="e" :layout="p" />
              <RenderEvent
                v-else-if="state.eventRenderer"
                :renderer="state.eventRenderer!"
                :ctx="{
                  event: e,
                  view: days.length === 1 ? 'day' : 'week',
                  layout: { kind: 'positioned', layout: p },
                }"
              />
            </template>
          </CoarTimeGridEvent>

          <!-- Source phantom for the dragged event at its original slot. -->
          <CoarTimeGridEvent
            v-if="dragSourceSnapshot && dragSourceSnapshot.dayKey === layout.date.toString()"
            variant="phantom"
            :event="dragSourceSnapshot.event"
            :positioned="phantomPositionedStub"
            :bg="eventBgFor(dragSourceSnapshot.event)"
            :ink="eventInkFor(dragSourceSnapshot.event)"
            :border="eventBorderFor(dragSourceSnapshot.event)"
            :title="eventTitle(dragSourceSnapshot.event)"
            :display-zone="timezone"
            :density="density"
            :top="minutesToOffsetPx(dragSourceSnapshot.startMinutes)"
            :height="
              Math.max(
                16,
                minutesToPx(dragSourceSnapshot.endMinutes - dragSourceSnapshot.startMinutes),
              )
            "
            :left="`calc(${(dragSourceSnapshot.lane / dragSourceSnapshot.laneCount) * 100}% + ${dragSourceSnapshot.lane === 0 ? 4 : 2}px)`"
            :width="`calc(${100 / dragSourceSnapshot.laneCount}% - ${(dragSourceSnapshot.lane === 0 ? 4 : 2) + (dragSourceSnapshot.lane === dragSourceSnapshot.laneCount - 1 ? 4 : 2)}px)`"
            :z-index="dragSourceSnapshot.lane + 1"
          />

          <!-- Invalid timed ghost. -->
          <CoarTimeGridEvent
            v-if="
              invalidTimedGhost &&
              invalidTimedGhost.dayKey === layout.date.toString() &&
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
            :top="minutesToOffsetPx(invalidTimedGhost.startMinutes)"
            :height="Math.max(16, minutesToPx(invalidTimedGhost.durationMinutes))"
            left="calc(0% + 4px)"
            width="calc(100% - 8px)"
            :z-index="100"
          />

          <!-- Now-marker on today's column -->
          <CoarTimeGridNowMarker
            v-if="isTodayColumn(layout.date) && nowMinutesFromGridStart !== null"
            :top-px="minutesToOffsetPx(nowMinutesFromGridStart)"
          />

          <!-- Bands above the events, the selection and the host's draft. -->
          <CoarCalendarBands
            :bands="overlays.bandsFor(layout.date)"
            layer="above"
            orientation="vertical"
            :to-px="minuteOfDayToPx"
          />
          <CoarTimeSelectionLayer
            orientation="vertical"
            :to-px="minuteOfDayToPx"
            :selection="props.ghost ? null : selection.selectionFor(layout.date)"
            :draft="overlays.draftFor(layout.date)"
          >
            <template v-if="$slots.draft" #draft="draftProps">
              <slot name="draft" v-bind="draftProps" />
            </template>
          </CoarTimeSelectionLayer>
        </CoarTimeGridColumn>
        <div
          v-if="hoverLinePx !== null"
          class="coar-time-grid__hover-line"
          :style="{ top: hoverLinePx + 'px' }"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Visually-hidden live-region — kept in the layout flow but
   off-screen so the surface ring around it can't catch focus and
   the surrounding layout doesn't shift. Standard a11y pattern. */
.coar-time-grid__a11y-live {
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

.coar-time-grid {
  display: flex;
  flex-direction: column;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
  font-variant-numeric: tabular-nums;
  background: var(--coar-calendar-bg, #fff);
  /* Bottom content inset (iOS parity): extra scroll room so the last
     hours can clear host chrome that overlays the bottom edge (a
     floating action button, a tab bar, the safe area). The grid is
     content inside an outer scroller, so the room is padding here. */
  padding-bottom: var(--coar-calendar-scroll-inset-bottom, 0px);
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

/* Header strip + all-day band visuals live in
   `internal/time-grid/CoarTimeGridHeader.vue` and
   `CoarTimeGridAllDayBand.vue`. */

/* All-day bar visuals (variants, resize handles, snap-back) live
   in `internal/time-grid/CoarTimeGridAllDayBar.vue`. The slot-
   fallback title span is owned by this parent. */
.coar-time-grid__all-day-bar-title {
  font-weight: 600;
  text-overflow: ellipsis;
  overflow: hidden;
  color: var(--coar-text-base, #1a1c1f);
}

.coar-time-grid__body {
  display: grid;
  grid-template-columns: var(--coar-time-grid-axis-width) 1fr;
  position: relative;
  overflow: hidden;
}
/* Neighbour page: visual only. The hidden axis keeps its width so the
   ghost's columns line up with the live grid's columns. */
.coar-time-grid--ghost {
  pointer-events: none;
}
.coar-time-grid--ghost .coar-time-grid__hour-axis {
  /* Header corner + all-day axis: same rule in their own components
     (scoped styles don't reach into children). */
  visibility: hidden;
}
/* A ghost's cells slide INTO the live area; the surface clips at its
   own edge instead. Both axes — a single non-visible axis would turn
   the other into `auto` and make the ghost a scroll container that
   clips its own translated columns. */
.coar-time-grid--ghost .coar-time-grid__sticky-top,
.coar-time-grid--ghost .coar-time-grid__body {
  overflow: visible;
}
/* The pinned sticky top must not spill a taller header into the first
   hour rows; clip vertically only. */
.coar-time-grid--ghost .coar-time-grid__sticky-top {
  clip-path: inset(0 -100vw 0 -100vw);
}
/*
 * Painting during a swipe. Pages overlap the way sliding sheets do:
 * a ghost box covers part of the live grid and vice versa, so no
 * page may paint an opaque box — only the moving cell strips paint
 * (header cells, all-day cells, columns each carry an opaque
 * background). The fixed parts of the live grid (hour axis, header
 * corner, all-day axis) keep opaque backgrounds and their z-order,
 * so cells sliding under them disappear.
 */
.coar-time-grid--ghost,
.coar-time-grid--ghost > .coar-time-grid__sticky-top,
.coar-time-grid--swiping > .coar-time-grid__sticky-top,
.coar-time-grid--settling > .coar-time-grid__sticky-top {
  background: transparent;
}
.coar-time-grid__hour-axis {
  position: relative;
  /* Above the cells sliding past it during a swipe. */
  z-index: 2;
  background: var(--coar-calendar-bg, #fff);
  /* No border-right here — the first day-column already owns
     `border-left: 1px` for the axis-vs-grid seam. Painting both
     produced a 2px double-line at the boundary (issue surfaced as
     a `:deep(...)` workaround in event-tree). */
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
  /* Touch paging: horizontal pans are ours, vertical stays native. */
  touch-action: pan-y;
  transform: translateX(var(--coar-time-grid-swipe-x, 0px));
}
/* Time-range selection: no text selection or iOS callout on a press,
   and none while a range is dragged anywhere in the grid. */
.coar-time-grid--selectable .coar-time-grid__columns {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.coar-time-grid--selecting {
  user-select: none;
  -webkit-user-select: none;
}
/* Hover indicator: a thin line across every day at the pointer's time. */
.coar-time-grid__hover-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px solid
    color-mix(in srgb, var(--coar-background-accent-primary, #2563eb) 60%, transparent);
  pointer-events: none;
  z-index: 6;
}
.coar-time-grid--settling .coar-time-grid__columns {
  transition: transform 180ms ease-out;
}
/* The translated header cells / band / columns must not widen the
   scroll surface while they are off to one side. */
.coar-time-grid__sticky-top,
.coar-time-grid__body {
  overflow-x: clip;
}

/* Column visuals (today / weekend tint, slot-gradient lines,
   contain:layout for outline overflow) live in
   `internal/time-grid/CoarTimeGridColumn.vue`. */

/* Event visuals (timed card variants, resize handles, snap-back,
   now-marker) live in `internal/time-grid/`. The slot-fallback
   default-content classes are still owned by the parent. */
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

/* Density: header tightens inside CoarTimeGridHeader's own
   scoped CSS via the `density` prop. Event / bar density
   classes live in their own scoped CSS too. */
</style>
