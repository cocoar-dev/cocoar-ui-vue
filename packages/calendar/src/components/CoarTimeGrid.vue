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
  watchEffect,
} from 'vue';
import { useI18n, useLocalization } from '@cocoar/vue-localization';
import { useTimeGridDnd, type TimeGridEventDropPayload } from '../composables/useTimeGridDnd';
import { useA11yAnnouncer } from '../composables/useA11yAnnouncer';
import {
  Temporal,
  todayInZone,
  nowInZone,
  layoutDayEvents,
  layoutAllDayBand,
  isAllDayEvent,
  buildFormatOptions,
  type CalendarEvent,
  type PositionedEvent,
  type AllDayBar,
} from '../core';
import { CalendarBuilder } from '../builders/calendar-builder';
import { RenderEvent, RenderDayHeader } from '../builders/render-helpers';
import CoarTimeGridEvent from './internal/time-grid/CoarTimeGridEvent.vue';
import CoarTimeGridAllDayBar from './internal/time-grid/CoarTimeGridAllDayBar.vue';
import CoarTimeGridNowMarker from './internal/time-grid/CoarTimeGridNowMarker.vue';
import CoarTimeGridHeader from './internal/time-grid/CoarTimeGridHeader.vue';
import CoarTimeGridAllDayBand from './internal/time-grid/CoarTimeGridAllDayBand.vue';
import CoarTimeGridColumn from './internal/time-grid/CoarTimeGridColumn.vue';
import { contentAwareCascadeFrames, type CascadeItem } from '../core/cascadeLayout';

// Inlined defineProps argument to avoid vue-tsc TS4025 — see note in
// CoarMonthView.vue.
const props = defineProps<{
  builder: CalendarBuilder<TMeta>;
  /** One date per day-column to render. The wrapper (Day/Week
   *  view) computes this from the builder's date + firstDayOfWeek. */
  dates?: ReadonlyArray<Temporal.PlainDate>;
}>();
const { t } = useI18n();

const slots = defineSlots<{
  event?(props: { event: CalendarEvent<TMeta>; layout: PositionedEvent<TMeta> }): unknown;
  allDayEvent?(props: { event: CalendarEvent<TMeta>; layout: AllDayBar<TMeta> }): unknown;
  dayHeader?(props: { date: Temporal.PlainDate; isToday: boolean; isWeekend: boolean }): unknown;
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
    // Phase 4: read via api.getVisibleEvents() so events from
    // `events()` / `eventsLoader()` AND expanded occurrences from
    // `series()` / `seriesLoader()` all reach the layout.
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
    timeRangeMinutes: tr,
    slotDuration: toValue(s.slotDuration) as 5 | 10 | 15 | 30 | 60,
    pixelsPerHour: toValue(s.pixelsPerHour),
    canDrop: s.canDrop,
    eventRenderer: s.eventRenderer,
    dayHeaderRenderer: s.dayHeaderRenderer,
    dstPolicy: toValue(s.dstPolicy),
  };
});
const events = computed(() => state.value.events);
const timeRange = computed(() => state.value.timeRange);
const slotDuration = computed(() => state.value.slotDuration);
const pixelsPerHour = computed(() => state.value.pixelsPerHour);
const timezone = computed(() => state.value.timezone);
// Locale chain (Article 9): builder.locale() > host @cocoar/vue-localization > 'en-US'.
const localization = useLocalization();
const locale = computed<string>(
  () => state.value.locale ?? localization?.language.value ?? 'en-US',
);
const density = computed(() => state.value.density);
const canDrop = computed(() => state.value.canDrop);

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
  canDrop: canDrop.value ?? undefined,
  onEventClick: (event, native) => {
    if (native) props.builder.state.onEventClick?.({ event, native });
  },
  onEventDrop: (payload) => props.builder.state.onEventDrop?.(payload),
  onAnnounce: (kind, payload) => onA11yAnnounce(kind, payload),
});

// ─── A11y live-region ────────────────────────────────────────────────

const a11y = useA11yAnnouncer();

function formatAnnouncementWhen(payload: TimeGridEventDropPayload<TMeta>): string {
  const isAllDay = payload.next.start instanceof Temporal.PlainDate;
  const overrides = {
    dateStyle: state.value.dateStyle,
    timeStyle: state.value.timeStyle,
    hour12: state.value.hour12,
  };
  try {
    const fmt = new Intl.DateTimeFormat(
      locale.value,
      buildFormatOptions(
        isAllDay
          ? { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }
          : {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
              timeZone: timezone.value,
            },
        overrides,
      ),
    );
    if (isAllDay) {
      const pd = payload.next.start as Temporal.PlainDate;
      return fmt.format(new Date(Date.UTC(pd.year, pd.month - 1, pd.day)));
    }
    const zdt = (payload.next.start as Temporal.ZonedDateTime).withTimeZone(timezone.value);
    return fmt.format(new Date(zdt.epochMilliseconds));
  } catch {
    return payload.target.date;
  }
}

/**
 * Aria-label for the preview-ghost variant during a keyboard
 * drag — tells the SR user the keys they have. The visible
 * card's regular aria-label would otherwise read out the
 * pre-drag start time, which is misleading once they've
 * staged a move.
 */
function kbdPreviewAriaLabel(event: CalendarEvent<TMeta>): string {
  const meta = event.meta as { title?: unknown } | undefined;
  const rawTitle = typeof meta?.title === 'string' ? meta.title : undefined;
  const title = rawTitle ?? t('coar.calendar.a11y.unnamedEvent', undefined, 'Event');
  return t(
    'coar.calendar.a11y.kbdPreviewLabel',
    { title },
    `${title} preview — Arrow keys to move, Enter to commit, Escape to cancel`,
  );
}

function eventTitleSafe(p: TimeGridEventDropPayload<TMeta>): string {
  const meta = p.event.meta as { title?: unknown } | undefined;
  return typeof meta?.title === 'string'
    ? meta.title
    : t('coar.calendar.a11y.unnamedEvent', undefined, 'Event');
}

function onA11yAnnounce(
  kind: 'committed' | 'cancelled',
  payload?: TimeGridEventDropPayload<TMeta>,
): void {
  if (kind === 'cancelled') {
    a11y.announce(t('coar.calendar.a11y.moveCancelled', undefined, 'Move cancelled'));
    return;
  }
  if (!payload) return;
  const title = eventTitleSafe(payload);
  const when = formatAnnouncementWhen(payload);
  a11y.announce(t('coar.calendar.a11y.eventMovedTo', { title, when }, `${title} moved to ${when}`));
}

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
const totalMinutes = computed(() => totalHours.value * 60);
// Body height includes a leading + trailing render buffer so events
// at the time-range boundary have room for their focus halo / resize
// handles without being clipped or covered by the all-day band.
const totalHeightPx = computed(
  () =>
    totalHours.value * pixelsPerHour.value +
    (2 * (pixelsPerHour.value * RENDER_BUFFER_MINUTES)) / 60,
);

const slotHeightPx = computed(() => (pixelsPerHour.value * slotDuration.value) / 60);

const hourLabels = computed(() => {
  const labels: { hour: number; label: string }[] = [];
  // Article 9: hour-axis honours `builder.hour12()` AND `timeStyle()`.
  // Note: setting `timeStyle` makes Intl drop the explicit `hour`
  // field; `buildFormatOptions` handles the prune. A consumer using
  // `.timeStyle('short')` gets the locale's short-form hour
  // representation (e.g. "9 AM" / "09:00"); falling back to
  // `{ hour: 'numeric' }` when timeStyle is unset gives the existing
  // tight one-cell label.
  const fmt = new Intl.DateTimeFormat(
    locale.value,
    buildFormatOptions(
      { hour: 'numeric' },
      { timeStyle: state.value.timeStyle, hour12: state.value.hour12 },
    ),
  );
  for (let h = timeRange.value[0]; h <= timeRange.value[1]; h++) {
    const ref = new Date(2024, 0, 1, h);
    labels.push({ hour: h, label: fmt.format(ref) });
  }
  return labels;
});

// ─── Per-day event layout ─────────────────────────────────────────────

const dayLayouts = computed<
  {
    date: Temporal.PlainDate;
    positioned: PositionedEvent<TMeta>[];
    horizontalFrames: Map<string, { x: number; width: number }>;
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
  layout: { horizontalFrames: Map<string, { x: number; width: number }> },
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

// All-day band: filtered to all-day + multi-day-all-day events,
// laid out across the visible day columns. Empty when no all-day
// events match — band hides itself.
const allDayBars = computed<AllDayBar<TMeta>[]>(() => {
  return layoutAllDayBand(workingEvents.value, {
    days: visibleDays.value,
    timezone: timezone.value,
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

// ─── Now-marker ───────────────────────────────────────────────────────

const today = ref<Temporal.PlainDate>(todayInZone(timezone.value));
const now = ref<Temporal.ZonedDateTime>(nowInZone(timezone.value));
let nowTimer = 0;

onMounted(() => {
  // Update every 30s — sub-second is overkill for a clock indicator.
  nowTimer = window.setInterval(() => {
    today.value = todayInZone(timezone.value);
    now.value = nowInZone(timezone.value);
  }, 30_000);
});
onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer);
});

watchEffect(() => {
  // Re-pick today/now when the timezone prop changes.
  today.value = todayInZone(timezone.value);
  now.value = nowInZone(timezone.value);
});

const nowMinutesFromGridStart = computed(() => {
  const minutes = now.value.hour * 60 + now.value.minute - timeRange.value[0] * 60;
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
    new Intl.DateTimeFormat(
      locale.value,
      buildFormatOptions(
        { weekday: 'short', day: 'numeric', month: 'short' },
        {
          dateStyle: state.value.dateStyle,
          // No timeStyle for a date-only header.
          hour12: state.value.hour12,
        },
      ),
    ),
);

function formatDayHeader(date: Temporal.PlainDate): string {
  // Convert to JS Date for Intl. UTC interpretation here is fine —
  // we're only formatting day-of-week + day-of-month.
  return dayHeaderFormatter.value.format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
}

/**
 * Slot time under the pointer, snapped to the slot grid. ONE
 * resolver for click and double-click so both hooks agree on what
 * "the slot at this y" means. `null` when the pointer sits outside
 * the 0–24 h range (render buffer rows).
 */
function slotTimeAt(e: MouseEvent): Temporal.PlainTime | null {
  const col = e.currentTarget as HTMLElement;
  const rect = col.getBoundingClientRect();
  const yInColumn = e.clientY - rect.top;
  // Snap to nearest slot boundary.
  const snappedSlots = Math.floor(yInColumn / slotHeightPx.value);
  const minutesFromStart = snappedSlots * slotDuration.value;
  const totalMinFromMidnight = timeRange.value[0] * 60 + minutesFromStart;
  const hour = Math.floor(totalMinFromMidnight / 60);
  const minute = totalMinFromMidnight % 60;
  if (hour < 0 || hour >= 24) return null;
  return Temporal.PlainTime.from({ hour, minute });
}

function onColumnPointerDown(e: PointerEvent, date: Temporal.PlainDate) {
  const time = slotTimeAt(e);
  if (!time) return;
  props.builder.state.onTimeClick?.({ date, time, native: e });
}

function onColumnDblclick(e: MouseEvent, date: Temporal.PlainDate) {
  const time = slotTimeAt(e);
  if (!time) return;
  props.builder.state.onTimeDoubleClick?.({ date, time, native: e });
}

function onAllDayCellPointerDown(e: PointerEvent, date: Temporal.PlainDate) {
  props.builder.state.onDateClick?.({ date, native: e });
}

function onAllDayCellDblclick(e: MouseEvent, date: Temporal.PlainDate) {
  props.builder.state.onDateDoubleClick?.({ date, native: e });
}

// ─── Default event card content ──────────────────────────────────────
//
// Reads `meta.title` / `meta.color` if present. Consumers needing
// more replace via the `#event` slot.

function eventTitle(event: CalendarEvent<TMeta>): string {
  const meta = event.meta as { title?: unknown } | undefined;
  return typeof meta?.title === 'string' ? meta.title : '(untitled)';
}

/**
 * Build a screen-reader label for an event card. Includes the
 * title and a short start–end summary so users without sight know
 * what the focused event is. Locale-aware via `locale.value`.
 */
function eventAriaLabel(event: CalendarEvent<TMeta>): string {
  const title = eventTitle(event);
  if (isAllDayEvent(event)) {
    return `${title} (${t('coar.calendar.timegrid.allDay', undefined, 'all-day')})`;
  }
  try {
    const fmt = new Intl.DateTimeFormat(
      locale.value,
      buildFormatOptions(
        {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: timezone.value,
        },
        {
          dateStyle: state.value.dateStyle,
          timeStyle: state.value.timeStyle,
          hour12: state.value.hour12,
        },
      ),
    );
    const range = (
      fmt as Intl.DateTimeFormat & {
        formatRange?: (a: Date, b: Date) => string;
      }
    ).formatRange;
    if (event.start instanceof Temporal.PlainDate) return title;
    const startD = new Date(event.start.epochMilliseconds);
    const endD =
      event.end && !(event.end instanceof Temporal.PlainDate)
        ? new Date(event.end.epochMilliseconds)
        : startD;
    return range
      ? `${title}, ${range.call(fmt, startD, endD)}`
      : `${title}, ${fmt.format(startD)} – ${fmt.format(endD)}`;
  } catch {
    return title;
  }
}
function eventColor(event: CalendarEvent<TMeta>): string | undefined {
  const meta = event.meta as { color?: unknown } | undefined;
  return typeof meta?.color === 'string' ? meta.color : undefined;
}
function eventBgFor(event: CalendarEvent<TMeta>): string {
  const c = eventColor(event);
  return c ?? 'var(--coar-calendar-event-default-bg, var(--coar-color-accent-soft, #93c5fd))';
}
function eventBorderFor(event: CalendarEvent<TMeta>): string {
  const c = eventColor(event);
  return c ?? 'var(--coar-color-accent, var(--coar-color-accent-500, #2563eb))';
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
  props.builder._setScrollToTime(scrollToTime);
});
onBeforeUnmount(() => {
  props.builder._setScrollToTime(undefined);
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
    :class="[`coar-time-grid--density-${density}`]"
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
    <div class="coar-time-grid__sticky-top">
      <!-- Header row: blank cell over hour labels + one cell per day -->
      <CoarTimeGridHeader
        :days="days"
        :is-today="isTodayColumn"
        :is-weekend="isWeekend"
        :format-label="formatDayHeader"
        :density="density"
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
        v-if="allDayLaneCount > 0"
        :days="days"
        :axis-label="t('coar.calendar.timegrid.allDay', undefined, 'all-day')"
        :band-height-px="allDayBandHeight"
        :is-today="isTodayColumn"
        :is-weekend="isWeekend"
        :set-columns-el="setAllDayColumnsEl"
        @cell-pointerdown="(e, day) => onAllDayCellPointerDown(e, day)"
        @cell-dblclick="(e, day) => onAllDayCellDblclick(e, day)"
      >
        <!--
          All-day bars on top of the day-cell background.
          Same calc()-based inset as timed events: 2 px gap left and
          right, box-sizing: border-box (in scoped CSS), so the
          rightmost bar's right edge sits exactly inside the band —
          no overflow, no overlap with adjacent bars.
        -->
        <CoarTimeGridAllDayBar
          v-for="bar in allDayBars"
          :key="bar.event.id"
          :event="bar.event"
          :bar="bar"
          :variant="isPreviewEvent(bar.event.id) ? 'preview' : 'live'"
          :kbd-active="keyboardDrag !== null"
          :bg="eventBgFor(bar.event)"
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
      </div>

      <!-- Day columns -->
      <div ref="columns" class="coar-time-grid__columns">
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
            :border="eventBorderFor(positioned.event)"
            :title="eventTitle(positioned.event)"
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
        </CoarTimeGridColumn>
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
.coar-time-grid__hour-axis {
  position: relative;
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
