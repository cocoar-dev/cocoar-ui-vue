/**
 * `useCalendarDnd` — calendar-aware drag & drop composable.
 *
 * Wraps `useCoarDrag` (the generic pointer-events foundation from
 * Spike D) and adds the calendar-specific bits:
 *
 *   1. Hit-test the columns container to translate a screen-x/y
 *      into a calendar-domain `{ date, minutes }` slot, snapped to
 *      `slotDuration`.
 *   2. Build the proposed `next` event payload (`start` / `end`)
 *      preserving the event's original duration, so the consumer's
 *      drop handler can apply it to its data store.
 *
 * The click-vs-drag threshold lives ONE layer below in `useCoarDrag`
 * (via its `dragThreshold` option + `ctx.crossedThreshold` flag) so
 * future direct-manipulation features (resize handles, multi-select
 * drag) get the same disambiguation for free.
 *
 * The composable owns NO DOM mutations and NO data updates. The
 * consumer (typically `<CoarTimeGrid>`) reads `dropTarget` to draw
 * an indicator and `onEventDrop` / `onEventClick` to react.
 */

import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { Temporal } from '../core';
import type { CalendarEvent } from '../core';
import { useCoarDrag } from './useCoarDrag';

export interface CalendarDropTarget {
  /** ISO date string (`YYYY-MM-DD`) of the day-column. */
  date: string;
  /** Minutes from local midnight, snapped to `slotDuration`. */
  minutes: number;
}

export interface UseCalendarDndOptions {
  /** Scrollable surface element (for auto-scroll). */
  surfaceRef: Ref<HTMLElement | null>;
  /**
   * The columns container (`.coar-time-grid__columns`). Used as the
   * hit-test reference frame.
   */
  columnsRef: Ref<HTMLElement | null>;
  /** Visible days, left-to-right. */
  days: ComputedRef<ReadonlyArray<Temporal.PlainDate>> | Ref<ReadonlyArray<Temporal.PlainDate>>;
  /** `[startHour, endHour]`. */
  timeRange: ComputedRef<readonly [number, number]> | Ref<readonly [number, number]>;
  /** Pixels per hour (for translating Y → minutes). */
  pixelsPerHour: ComputedRef<number> | Ref<number>;
  /** Slot subdivision in minutes (e.g. 30). */
  slotDuration: ComputedRef<number> | Ref<number>;
  /**
   * Pointer-distance threshold (px) below which a pointerup is
   * treated as a click instead of a drop. Default 5. Forwarded to
   * `useCoarDrag.dragThreshold`.
   */
  dragThreshold?: number;
  /**
   * Called once the pointer crossed the drag threshold AND the user
   * released over a valid slot. Consumer applies `next` to its data.
   */
  onEventDrop?: (payload: {
    event: CalendarEvent;
    original: { start: string; end?: string };
    next: { start: string; end?: string };
    target: CalendarDropTarget;
    native: PointerEvent | null;
  }) => void;
  /**
   * Called when pointer-down → up happened without crossing the
   * drag threshold. Lets the consumer keep its `event-click` UX.
   */
  onEventClick?: (event: CalendarEvent, native: PointerEvent | null) => void;
}

export interface UseCalendarDndReturn {
  /** True only once the pointer has crossed the drag threshold. */
  isDragging: ComputedRef<boolean>;
  /** The event currently being dragged (or null when idle). */
  draggedEvent: ComputedRef<CalendarEvent | null>;
  /** Current drop slot (or null when off-grid / idle). */
  dropTarget: Ref<CalendarDropTarget | null>;
  /** Pointerdown handler for an event card. */
  startDrag: (event: CalendarEvent) => (e: PointerEvent) => void;
}

export function useCalendarDnd(opts: UseCalendarDndOptions): UseCalendarDndReturn {
  const dropTarget = ref<CalendarDropTarget | null>(null);

  function pointToSlot(clientX: number, clientY: number): CalendarDropTarget | null {
    const cols = opts.columnsRef.value;
    if (!cols) return null;
    const rect = cols.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    if (localX < 0 || localX >= rect.width || localY < 0) return null;
    const days = opts.days.value;
    if (days.length === 0) return null;
    const colWidth = rect.width / days.length;
    const dayIndex = Math.min(days.length - 1, Math.max(0, Math.floor(localX / colWidth)));
    const day = days[dayIndex];
    const pxPerMin = opts.pixelsPerHour.value / 60;
    const minutesFromGridStart = localY / pxPerMin;
    const slot = opts.slotDuration.value;
    const totalMinutes = opts.timeRange.value[0] * 60 + minutesFromGridStart;
    const snapped = Math.round(totalMinutes / slot) * slot;
    if (snapped < 0 || snapped >= 24 * 60) return null;
    return { date: day.toString(), minutes: snapped };
  }

  let lastNativeEvent: PointerEvent | null = null;

  const drag = useCoarDrag<CalendarEvent>({
    surfaceRef: opts.surfaceRef,
    dragThreshold: opts.dragThreshold ?? 5,
    onDragStart: ({ event }) => {
      lastNativeEvent = event;
    },
    onDragMove: (ctx) => {
      // useCoarDrag only fires this AFTER the threshold is crossed
      // (when configured), so we know we're in a real drag.
      dropTarget.value = pointToSlot(ctx.pointer.x, ctx.pointer.y);
    },
    onDragEnd: (ctx) => {
      if (ctx.crossedThreshold) {
        const target = dropTarget.value;
        if (target && opts.onEventDrop) {
          opts.onEventDrop({
            event: ctx.data,
            original: { start: ctx.data.start, end: ctx.data.end },
            next: applyMoveToEvent(ctx.data, target),
            target,
            native: lastNativeEvent,
          });
        }
      } else {
        // No movement past threshold → treat as click.
        opts.onEventClick?.(ctx.data, lastNativeEvent);
      }
      dropTarget.value = null;
    },
    onDragCancel: () => {
      dropTarget.value = null;
    },
  });

  return {
    isDragging: drag.isDragging,
    draggedEvent: computed(() => drag.draggedData.value),
    dropTarget,
    startDrag: drag.startDrag,
  };
}

/**
 * Compute `next` payload (start/end) by translating the event to
 * `target.date` at `target.minutes`, preserving its original
 * duration. All-day events stay all-day.
 */
function applyMoveToEvent(
  event: CalendarEvent,
  target: CalendarDropTarget,
): { start: string; end?: string } {
  // All-day (date-only) events: just move the date.
  const isAllDay = event.start.length === 10 || event.allDay === true;
  if (isAllDay) {
    if (event.end && event.end.length === 10) {
      // Multi-day all-day: shift end by the same delta.
      const oldStart = Temporal.PlainDate.from(event.start.slice(0, 10));
      const oldEnd = Temporal.PlainDate.from(event.end.slice(0, 10));
      const days = oldStart.until(oldEnd).total({ unit: 'days' });
      const newStart = Temporal.PlainDate.from(target.date);
      const newEnd = newStart.add({ days });
      return { start: newStart.toString(), end: newEnd.toString() };
    }
    return { start: target.date };
  }

  // Timed events: compute new start as ZonedDateTime at UTC, then
  // shift end by the same duration.
  const startInstant = Temporal.Instant.from(event.start);
  const endInstant = event.end ? Temporal.Instant.from(event.end) : null;
  const durationNs = endInstant
    ? endInstant.epochNanoseconds - startInstant.epochNanoseconds
    : null;

  const targetDate = Temporal.PlainDate.from(target.date);
  const targetTime = Temporal.PlainTime.from({
    hour: Math.floor(target.minutes / 60),
    minute: target.minutes % 60,
  });
  const newStart = targetDate
    .toZonedDateTime({ timeZone: 'UTC', plainTime: targetTime })
    .toInstant();
  const newEnd =
    durationNs !== null
      ? newStart.add({ nanoseconds: Number(durationNs) })
      : null;

  return {
    start: newStart.toString(),
    end: newEnd ? newEnd.toString() : undefined,
  };
}
