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

import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { Temporal } from '../core';
import type { CalendarEvent } from '../core';
import {
  applyMoveToEvent,
  buildDropPayload,
  DstResolutionError,
  type CalendarDragMode,
  type CalendarDropTarget,
  type DstPolicy,
  type EventDropPayload,
  type MoveResult,
} from '../core/dnd/move-math';
export type { DstPolicy } from '../core/dnd/move-math';
export { buildDropPayload } from '../core/dnd/move-math';
import { useCoarDrag } from './useCoarDrag';

/**
 * Pin the pointer cursor for the entire duration of a drag.
 * Without this the cursor reverts to whatever each element under
 * the pointer says (default / pointer / …) the moment the pointer
 * leaves the resize handle's 6 px hot zone.
 *
 * `cursor` is NOT an inherited CSS property, so setting it on
 * `<html>` only affects elements that have no `cursor` of their
 * own — almost nothing does what we want there. Instead, append a
 * tiny stylesheet with `*, *::before, *::after { cursor: X
 * !important }` while a drag is in flight, and remove it on end.
 * This wins the cascade everywhere without touching individual
 * components' cursor rules.
 */
let dragCursorStyleEl: HTMLStyleElement | null = null;
function setGlobalDragCursor(cursor: string | null): void {
  if (typeof document === 'undefined') return;
  if (cursor === null) {
    dragCursorStyleEl?.remove();
    dragCursorStyleEl = null;
    return;
  }
  if (!dragCursorStyleEl) {
    dragCursorStyleEl = document.createElement('style');
    dragCursorStyleEl.setAttribute('data-coar-drag-cursor', '');
    document.head.appendChild(dragCursorStyleEl);
  }
  dragCursorStyleEl.textContent =
    `*, *::before, *::after { cursor: ${cursor} !important; }`;
}

function cursorForMode(mode: CalendarDragMode | null): string | null {
  switch (mode) {
    case 'timed-resize-start':
    case 'timed-resize-end':
      return 'ns-resize';
    case 'allDay-resize-start':
    case 'allDay-resize-end':
    case 'month-resize-start':
    case 'month-resize-end':
      return 'ew-resize';
    case 'timed':
    case 'allDay':
    case 'month':
      return 'grabbing';
    default:
      return null;
  }
}

/**
 * Re-export of the canonical `CalendarDropTarget` from
 * `core/dnd/move-math`. Comment kept here for the existing
 * import path.
 *
 * `date`: ISO date string (`YYYY-MM-DD`) of the day-column.
 *
 * `minutes`: minutes from local midnight, snapped to `slotDuration`.
 * `null` for all-day drops — no time component, the drop is "place
 * this event on this date" regardless of where vertically the
 * pointer is.
 */
export type { CalendarDropTarget };

export interface UseCalendarDndOptions {
  /** Scrollable surface element (for auto-scroll). */
  surfaceRef: Ref<HTMLElement | null>;
  /**
   * The columns container (`.coar-time-grid__columns`). Used as the
   * hit-test reference frame for timed-event drags. Optional —
   * month-view consumers don't have a time-grid.
   */
  columnsRef?: Ref<HTMLElement | null>;
  /**
   * Optional separate hit-test container for the all-day band
   * (`.coar-time-grid__all-day-columns`). When set, drags initiated
   * with `mode: 'allDay'` snap to date-only targets relative to this
   * container, so the user can move all-day bars horizontally
   * across days without touching the time-grid math.
   */
  allDayColumnsRef?: Ref<HTMLElement | null>;
  /**
   * Optional 6×7 month-grid container. When set, `startMonthDrag`
   * snaps to date-only targets via a 2D cell hit-test against this
   * container. Pair with `monthGridDates` (42 dates).
   */
  monthGridRef?: Ref<HTMLElement | null>;
  /** Visible days for the time-grid (left-to-right). Required when columnsRef is set. */
  days?: ComputedRef<ReadonlyArray<Temporal.PlainDate>> | Ref<ReadonlyArray<Temporal.PlainDate>>;
  /**
   * 42 dates for the month grid (6 rows × 7 cols, top-left first).
   * Required when `monthGridRef` is set.
   */
  monthGridDates?: ComputedRef<ReadonlyArray<Temporal.PlainDate>> | Ref<ReadonlyArray<Temporal.PlainDate>>;
  /** `[startHour, endHour]`. Required when columnsRef is set. */
  timeRange?: ComputedRef<readonly [number, number]> | Ref<readonly [number, number]>;
  /** Pixels per hour (for translating Y → minutes). Required when columnsRef is set. */
  pixelsPerHour?: ComputedRef<number> | Ref<number>;
  /** Slot subdivision in minutes (e.g. 30). Required when columnsRef is set. */
  slotDuration?: ComputedRef<number> | Ref<number>;
  /**
   * IANA display timezone — the zone the calendar is currently
   * rendering in. Required for timed targets so move-math can resolve
   * the slot in the same zone the user's eyes saw it. Default `'UTC'`.
   * Real consumers pass `builder.timezone()` (the same value the
   * layouts use).
   */
  /**
   * IANA display timezone — the zone the calendar is currently
   * rendering in. **Required** since Phase 8.11-AC. Required for
   * timed targets so move-math can resolve the slot in the same
   * zone the user's eyes saw it (Article 4 + Article 9 — defaults
   * are not decisions, the silent-UTC fallback used to be a real
   * foot-gun for direct callers).
   */
  timezone: ComputedRef<string> | Ref<string>;
  /**
   * DST disambiguation policy. Forwarded into `applyMoveToEvent`. See
   * `DstPolicy` in `core/dnd/move-math` for semantics. Default
   * `'compatible'` matches the polyfill default.
   */
  dstPolicy?: ComputedRef<DstPolicy> | Ref<DstPolicy>;
  /**
   * Render-buffer offset (in minutes) the time-grid applies above the
   * first hour. CoarTimeGrid leaves some visual padding above
   * `timeRange[0]` so events at the boundary have room for their
   * focus halo / resize handle. The hit-test must subtract that
   * offset so a click in the buffer zone doesn't map to a negative
   * time. Default 0 (no buffer). Set this to whatever
   * `RENDER_BUFFER_MINUTES` the time-grid uses.
   */
  timeGridTopBufferMinutes?: ComputedRef<number> | Ref<number>;
  /**
   * Pointer-distance threshold (px) below which a pointerup is
   * treated as a click instead of a drop. Default 5. Forwarded to
   * `useCoarDrag.dragThreshold`.
   */
  dragThreshold?: number;
  /**
   * Optional drop validator. Called per pointer-move once a target
   * slot has been hit-tested. Return `false` to mark the slot as
   * invalid — the ghost still renders (so the user sees their
   * pointer position) but with an invalid style, and `onEventDrop`
   * won't fire on release. Returning `true` (or omitting the
   * predicate) keeps the slot valid.
   *
   * Use this for business rules like "daily standups can't move to
   * a weekend" or "blocked hours can't accept events".
   */
  canDrop?: (event: CalendarEvent, target: CalendarDropTarget) => boolean;
  /**
   * Called once the pointer crossed the drag threshold AND the user
   * released over a valid slot. Consumer applies `next` to its data.
   */
  onEventDrop?: (payload: {
    event: CalendarEvent;
    original: {
      start: Temporal.ZonedDateTime | Temporal.PlainDate;
      end?: Temporal.ZonedDateTime | Temporal.PlainDate;
      displayZone: string;
    };
    next: MoveResult;
    target: CalendarDropTarget & {
      disambiguation: null | 'gap' | 'overlap';
    };
    native: PointerEvent | null;
  }) => void;
  /**
   * Called when pointer-down → up happened without crossing the
   * drag threshold. Lets the consumer keep its `event-click` UX.
   */
  onEventClick?: (event: CalendarEvent, native: PointerEvent | null) => void;
}

/**
 * Drag mode of the in-flight drag.
 *
 *   - `'timed'`               — move a timed event in the time-grid
 *   - `'timed-resize-start'`  — drag the top edge of a timed event
 *   - `'timed-resize-end'`    — drag the bottom edge of a timed event
 *   - `'allDay'`              — move an all-day bar across days
 *   - `'allDay-resize-start'` — drag the left edge of an all-day bar
 *   - `'allDay-resize-end'`   — drag the right edge of an all-day bar
 *   - `'month'`               — move a pill / multi-day bar across cells
 *
 * Resize modes only ever update one side of the event (start XOR
 * end). Move modes preserve the duration / span. The composable
 * picks the right `applyMoveToEvent` branch based on the mode set
 * by the matching `start*Drag` closure.
 */
export type { CalendarDragMode };

export interface UseCalendarDndReturn {
  /** True only once the pointer has crossed the drag threshold. */
  isDragging: ComputedRef<boolean>;
  /** The event currently being dragged (or null when idle). */
  draggedEvent: ComputedRef<CalendarEvent | null>;
  /** Drag mode of the in-flight drag, or `null` when idle. */
  dragMode: ComputedRef<CalendarDragMode | null>;
  /** Current drop slot (or null when off-grid / idle). */
  dropTarget: Ref<CalendarDropTarget | null>;
  /**
   * True for a brief window after the user released on an invalid
   * drop target. Lets the consumer keep the "invalid" ghost
   * rendered just long enough to play a fade-out animation, so the
   * rejection reads as a soft snap-back rather than an instant
   * disappear. Always `false` while the user is still dragging —
   * use `isDragging.value || snappingBack.value` in templates.
   */
  snappingBack: ComputedRef<boolean>;
  /**
   * Pointerdown handler for a TIMED event card. Resolves to a
   * `{ date, minutes }` slot via the time-grid hit-test.
   */
  startDrag: (event: CalendarEvent) => (e: PointerEvent) => void;
  /** Top-edge handle: only the start moves, end stays anchored. */
  startTimedResizeStart: (event: CalendarEvent) => (e: PointerEvent) => void;
  /** Bottom-edge handle: only the end moves, start stays anchored. */
  startTimedResizeEnd: (event: CalendarEvent) => (e: PointerEvent) => void;
  /**
   * Pointerdown handler for an ALL-DAY bar. Resolves to a
   * `{ date, minutes: null }` slot via the all-day-band hit-test
   * (X-only — the vertical position inside the band doesn't carry
   * any meaning for an all-day event).
   */
  startAllDayDrag: (event: CalendarEvent) => (e: PointerEvent) => void;
  /** Left-edge handle on a multi-day all-day bar: start moves only. */
  startAllDayResizeStart: (event: CalendarEvent) => (e: PointerEvent) => void;
  /** Right-edge handle on a multi-day all-day bar: end moves only. */
  startAllDayResizeEnd: (event: CalendarEvent) => (e: PointerEvent) => void;
  /**
   * Pointerdown handler for a MONTH-view event (pill or multi-day
   * bar). Resolves to a `{ date, minutes: null }` slot via the
   * 6×7 month-grid hit-test. Drop preserves the event's wall-time
   * (timed events) or shifts the all-day span (date-only events)
   * by the original-vs-target date delta.
   */
  startMonthDrag: (event: CalendarEvent) => (e: PointerEvent) => void;
  /** Left-edge handle on a multi-day month bar: start moves only. */
  startMonthResizeStart: (event: CalendarEvent) => (e: PointerEvent) => void;
  /** Right-edge handle on a multi-day month bar: end moves only. */
  startMonthResizeEnd: (event: CalendarEvent) => (e: PointerEvent) => void;
}

export function useCalendarDnd(opts: UseCalendarDndOptions): UseCalendarDndReturn {
  const dropTarget = ref<CalendarDropTarget | null>(null);
  const snapBackUntil = ref(0);
  const snappingBack = computed(() => snapBackUntil.value > 0);
  /**
   * Snap-back duration in ms. Picked to feel deliberate but not
   * sluggish — long enough that the eye registers the rejection
   * as a soft fade rather than a flicker, short enough that the
   * user can immediately retry without feeling the calendar is
   * locked.
   */
  const SNAP_BACK_MS = 220;
  let snapBackTimer: ReturnType<typeof setTimeout> | null = null;
  function startSnapBack() {
    if (snapBackTimer !== null) clearTimeout(snapBackTimer);
    snapBackUntil.value = performance.now() + SNAP_BACK_MS;
    snapBackTimer = setTimeout(() => {
      snapBackUntil.value = 0;
      dropTarget.value = null;
      dragMode.value = null;
      snapBackTimer = null;
    }, SNAP_BACK_MS);
  }
  // Mode of the current drag. Set on pointerdown via the matching
  // start-drag closure; consumed by `onDragMove` to pick the right
  // hit-test container, and exposed to the consumer so the calendar
  // can render distinct ghosts for all-day vs timed drops.
  const dragMode = ref<CalendarDragMode | null>(null);
  /**
   * Pointer offset within a multi-day month bar at pointerdown,
   * expressed as a date-delta from the bar's first visible day.
   * Used by the month hit-test so a multi-day bar moves relative
   * to where the user grabbed it instead of snapping its start to
   * the cursor's cell. Single-day pills keep this at 0.
   */
  let grabOffsetDays = 0;
  /**
   * Pointer offset within the event card at pointerdown — used so
   * the dragged ghost stays anchored to where the user grabbed it,
   * not snapped to the pointer (which would move the event start
   * to the cursor on every move). Captured at pointerdown by the
   * `startDrag` / `startAllDayDrag` closures and consumed by the
   * hit-test functions to translate "pointer at minute X" into
   * "event start at minute X − offset". Cleared on drag end.
   */
  let grabOffsetMinutes = 0;
  let grabOffsetCols = 0;

  function pointToSlot(clientX: number, clientY: number): CalendarDropTarget | null {
    const cols = opts.columnsRef?.value;
    if (!cols) return null;
    const rect = cols.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    if (localX < 0 || localX >= rect.width || localY < 0) return null;
    const days = opts.days?.value;
    if (!days || days.length === 0) return null;
    const colWidth = rect.width / days.length;
    const dayIndex = Math.min(days.length - 1, Math.max(0, Math.floor(localX / colWidth)));
    const day = days[dayIndex];
    const pxPerHour = opts.pixelsPerHour?.value ?? 60;
    const pxPerMin = pxPerHour / 60;
    // Subtract the time-grid's render buffer so a click in the
    // visual padding above the first hour doesn't snap to a
    // negative time. `clamp` to 0 so clicks in the buffer zone
    // still resolve cleanly to the boundary minute.
    const topBuffer = opts.timeGridTopBufferMinutes?.value ?? 0;
    const minutesFromGridStart = Math.max(0, localY / pxPerMin - topBuffer);
    const slot = opts.slotDuration?.value ?? 30;
    const startHour = opts.timeRange?.value[0] ?? 0;
    const endHour = opts.timeRange?.value[1] ?? 24;
    // Subtract the offset captured at pointerdown so the ghost
    // start = pointer − offset. A user grabbing 3 h into a 4 h event
    // and moving the mouse 30 min should see the ghost shift 30 min,
    // not jump so the start lands at the cursor.
    const totalMinutes = startHour * 60 + minutesFromGridStart - grabOffsetMinutes;
    const snapped = Math.round(totalMinutes / slot) * slot;
    // Reject drops past the visible time range — without this, a user
    // dragging below the bottom of an [8,18] grid would snap to e.g.
    // 18:30 and lose the event off-screen. The latest acceptable
    // start is `endHour*60 - max(slot, draggedDuration)` so the whole
    // event fits in the visible band.
    const dragged = drag?.draggedData.value;
    let draggedDur = slot;
    if (dragged && 'timeZoneId' in (dragged.start as object)) {
      const zStart = dragged.start as Temporal.ZonedDateTime;
      const zEnd = dragged.end as Temporal.ZonedDateTime | undefined;
      if (zEnd) {
        draggedDur = Math.max(
          slot,
          (zEnd.epochMilliseconds - zStart.epochMilliseconds) / 60000,
        );
      }
    }
    const lastVisibleSlot = endHour * 60 - draggedDur;
    if (snapped < startHour * 60 || snapped > lastVisibleSlot) return null;
    return {
      date: day.toString(),
      minutes: snapped,
      displayZone: opts.timezone.value,
      valid: true,
    };
  }

  /**
   * All-day hit-test: X-only against the all-day-band columns
   * container. Vertical position is irrelevant for an all-day drop —
   * we just need the day. Falls back to `columnsRef` when no
   * dedicated all-day container is provided (keeps the composable
   * working for callers that haven't wired it up yet).
   */
  function pointToAllDayDate(clientX: number): CalendarDropTarget | null {
    const cols = opts.allDayColumnsRef?.value ?? opts.columnsRef?.value;
    if (!cols) return null;
    const rect = cols.getBoundingClientRect();
    const localX = clientX - rect.left;
    const days = opts.days?.value;
    if (!days || days.length === 0 || rect.width <= 0) return null;
    const colWidth = rect.width / days.length;
    // Same anchoring as the timed drag: subtract how many columns
    // into the bar the pointer was at pointerdown. Grabbing the
    // last day of a 4-day all-day event and nudging right by one
    // column should shift the bar by one column, not snap its
    // start to the cursor.
    const dayIndex = Math.min(
      days.length - 1,
      Math.max(0, Math.floor(localX / colWidth) - grabOffsetCols),
    );
    const day = days[dayIndex];
    return {
      date: day.toString(),
      minutes: null,
      displayZone: opts.timezone.value,
      valid: true,
    };
  }

  /**
   * Month-view hit-test: 2D against the 6×7 cell grid. Returns the
   * cell-date the pointer is over, with `minutes: null` so the
   * dropped event preserves its original wall-time (timed) or
   * shifts dates by the same delta (all-day).
   *
   * Rows can have different heights (the row grows when one of
   * its cells has many events), so we measure each row's actual
   * geometry from the DOM instead of dividing the grid evenly.
   */
  function pointToMonthCell(clientX: number, clientY: number): CalendarDropTarget | null {
    const grid = opts.monthGridRef?.value;
    const dates = opts.monthGridDates?.value;
    if (!grid || !dates || dates.length === 0) return null;
    const rect = grid.getBoundingClientRect();
    const localX = clientX - rect.left;
    if (rect.width <= 0 || rect.height <= 0) return null;
    if (localX < 0 || localX >= rect.width) return null;
    const cols = 7;
    const colW = rect.width / cols;
    const colIdx = Math.min(cols - 1, Math.max(0, Math.floor(localX / colW)));
    // Walk the row elements (direct children of the grid) and
    // find which one's vertical span contains the pointer Y.
    // Falls back to the first / last row when above / below.
    const rowEls = Array.from(grid.children) as HTMLElement[];
    if (rowEls.length === 0) return null;
    let rowIdx = -1;
    for (let i = 0; i < rowEls.length; i++) {
      const r = rowEls[i].getBoundingClientRect();
      if (clientY >= r.top && clientY < r.bottom) {
        rowIdx = i;
        break;
      }
    }
    if (rowIdx === -1) {
      if (clientY < rowEls[0].getBoundingClientRect().top) rowIdx = 0;
      else rowIdx = rowEls.length - 1;
    }
    // Apply the grab-offset (in date-delta) so a multi-day bar
    // moves relative to where it was grabbed, not snapping its
    // start to the pointer's cell.
    const idx = rowIdx * cols + colIdx - grabOffsetDays;
    const clamped = Math.min(dates.length - 1, Math.max(0, idx));
    return {
      date: dates[clamped].toString(),
      minutes: null,
      displayZone: opts.timezone.value,
      valid: true,
    };
  }

  /**
   * Apply the consumer's drop validator (if any) to a hit-tested
   * target. Off-grid → leave as-is (null already conveys "no
   * target"); on-grid → flip `valid` to false when the predicate
   * returns false.
   */
  function validateTarget(
    event: CalendarEvent,
    target: CalendarDropTarget | null,
  ): CalendarDropTarget | null {
    if (target === null) return target;
    // Article-5: when the active dstPolicy is `'reject'`, mark targets
    // landing in a DST gap/overlap as invalid here so the live ghost
    // already reads as red. The user can't drop into a non-existent
    // slot.
    const policy: DstPolicy = opts.dstPolicy?.value ?? 'compatible';
    if (policy === 'reject') {
      try {
        applyMoveToEvent(event, target, dragMode.value, policy);
      } catch (e) {
        if (e instanceof DstResolutionError) {
          return { ...target, valid: false };
        }
        throw e;
      }
    }
    if (!opts.canDrop) return target;
    return { ...target, valid: opts.canDrop(event, target) };
  }

  let lastNativeEvent: PointerEvent | null = null;
  /**
   * Snapshot of the display zone at drag-start. The user could
   * toggle `.timezone()` mid-drag (rare but possible — e.g. a
   * keyboard shortcut bound to zone-flip). The drop payload's
   * `original.displayZone` reflects the zone the drag began in,
   * so undo replays in the user's original viewing context.
   */
  let dragStartDisplayZone: string = opts.timezone.value;
  /**
   * Snapshots of the dragged event's start/end at drag-start. A
   * parallel render path (websocket update, optimistic UI) could
   * mutate the event object mid-drag — without these snapshots, the
   * drop payload's `original` would reflect post-mutation values and
   * undo would replay the wrong intent. The Temporal types are
   * immutable, so a reference is enough; we capture them explicitly
   * to make the contract obvious.
   */
  let dragStartOriginalStart: Temporal.ZonedDateTime | Temporal.PlainDate | null =
    null;
  let dragStartOriginalEnd: Temporal.ZonedDateTime | Temporal.PlainDate | undefined =
    undefined;

  const drag = useCoarDrag<CalendarEvent>({
    surfaceRef: opts.surfaceRef,
    dragThreshold: opts.dragThreshold ?? 5,
    onDragStart: ({ event, data }) => {
      lastNativeEvent = event;
      dragStartDisplayZone = opts.timezone.value;
      dragStartOriginalStart = data?.start ?? null;
      dragStartOriginalEnd = data?.end;
    },
    onDragMove: (ctx) => {
      // useCoarDrag only fires this AFTER the threshold is crossed
      // (when configured), so we know we're in a real drag. Pick the
      // hit-test by mode group: time-grid (timed move + both
      // resize-edges) all use minute-precision; all-day band moves
      // and resizes use X-only date hit-test; month uses 2D cells.
      const mode = dragMode.value;
      let raw: CalendarDropTarget | null;
      if (
        mode === 'month' ||
        mode === 'month-resize-start' ||
        mode === 'month-resize-end'
      ) {
        raw = pointToMonthCell(ctx.pointer.x, ctx.pointer.y);
      } else if (
        mode === 'allDay' ||
        mode === 'allDay-resize-start' ||
        mode === 'allDay-resize-end'
      ) {
        raw = pointToAllDayDate(ctx.pointer.x);
      } else {
        raw = pointToSlot(ctx.pointer.x, ctx.pointer.y);
      }
      dropTarget.value = validateTarget(ctx.data, raw);
    },
    onDragEnd: (ctx) => {
      let runSnapBack = false;
      if (ctx.crossedThreshold) {
        const target = dropTarget.value;
        // Drop only fires for valid targets. Invalid (consumer
        // vetoed via canDrop) snaps back — keep the "invalid"
        // ghost rendered briefly so the rejection reads as a soft
        // fade-out instead of an instant disappear.
        if (target && target.valid && opts.onEventDrop) {
          // C2 — route through buildDropPayload (the single drop
          // pipeline). DstPolicy resolved at this single call site.
          const policy: DstPolicy = opts.dstPolicy?.value ?? 'compatible';
          try {
            const payload = buildDropPayload(
              policy,
              ctx.data,
              {
                start: dragStartOriginalStart ?? ctx.data.start,
                ...(dragStartOriginalEnd !== undefined
                  ? { end: dragStartOriginalEnd }
                  : {}),
                displayZone: dragStartDisplayZone,
              },
              target,
              dragMode.value!,
              lastNativeEvent,
            );
            opts.onEventDrop(payload);
          } catch (e) {
            if (e instanceof DstResolutionError) {
              // dstPolicy='reject' on a gap — same outcome as canDrop=false.
              runSnapBack = true;
            } else {
              throw e;
            }
          }
        } else if (target && target.valid === false) {
          runSnapBack = true;
        }
      } else {
        // No movement past threshold → treat as click.
        opts.onEventClick?.(ctx.data, lastNativeEvent);
      }
      grabOffsetMinutes = 0;
      grabOffsetCols = 0;
      grabOffsetDays = 0;
      if (runSnapBack) {
        // dropTarget + dragMode stay set; the snap-back timer
        // clears them after the animation window.
        startSnapBack();
      } else {
        dropTarget.value = null;
        dragMode.value = null;
      }
    },
    onDragCancel: () => {
      dropTarget.value = null;
      dragMode.value = null;
      grabOffsetMinutes = 0;
      grabOffsetCols = 0;
      grabOffsetDays = 0;
    },
  });

  function startTimedDrag(event: CalendarEvent): (e: PointerEvent) => void {
    const inner = drag.startDrag(event);
    return (e) => {
      dragMode.value = 'timed';
      // Offset = how far below the event card's top edge the pointer
      // landed, in minutes. The hit-test subtracts it so the ghost
      // start = pointer − offset, preserving the grab point.
      const card = e.currentTarget as HTMLElement | null;
      if (card) {
        const r = card.getBoundingClientRect();
        const pxPerHour = opts.pixelsPerHour?.value ?? 60;
        const pxPerMin = pxPerHour / 60;
        grabOffsetMinutes = pxPerMin > 0 ? (e.clientY - r.top) / pxPerMin : 0;
      } else {
        grabOffsetMinutes = 0;
      }
      grabOffsetCols = 0;
      grabOffsetDays = 0;
      inner(e);
    };
  }
  function startAllDayDrag(event: CalendarEvent): (e: PointerEvent) => void {
    const inner = drag.startDrag(event);
    return (e) => {
      dragMode.value = 'allDay';
      // Offset = how many full day-columns into the bar the pointer
      // landed. The hit-test shifts the dayIndex by it so a multi-
      // day bar moves relative to where the user grabbed it, not
      // snapping its start to the pointer column.
      const bar = e.currentTarget as HTMLElement | null;
      const cols = opts.allDayColumnsRef?.value ?? opts.columnsRef?.value;
      const days = opts.days?.value;
      if (bar && cols && days && days.length > 0) {
        const barRect = bar.getBoundingClientRect();
        const colsRect = cols.getBoundingClientRect();
        const colWidth = colsRect.width / days.length;
        if (colWidth > 0) {
          grabOffsetCols = Math.floor((e.clientX - barRect.left) / colWidth);
        } else {
          grabOffsetCols = 0;
        }
      } else {
        grabOffsetCols = 0;
      }
      grabOffsetMinutes = 0;
      grabOffsetDays = 0;
      inner(e);
    };
  }
  function startMonthDrag(event: CalendarEvent): (e: PointerEvent) => void {
    const inner = drag.startDrag(event);
    return (e) => {
      dragMode.value = 'month';
      // Offset = how many cells (left-to-right) into the
      // multi-day-bar the pointer landed. Single-day pills sit in
      // exactly one cell, so the offset stays at 0 there. For
      // bars, this lets the user grab the third day of a 5-day
      // event and have the bar move relative to that grab point.
      const node = e.currentTarget as HTMLElement | null;
      const grid = opts.monthGridRef?.value;
      if (node && grid) {
        const nodeRect = node.getBoundingClientRect();
        const gridRect = grid.getBoundingClientRect();
        const cellW = gridRect.width / 7;
        if (cellW > 0) {
          // Distance in cells between the pointer and the bar's
          // left edge — floor so cell 0 covers the entire first
          // visible day-column.
          grabOffsetDays = Math.floor((e.clientX - nodeRect.left) / cellW);
        } else {
          grabOffsetDays = 0;
        }
      } else {
        grabOffsetDays = 0;
      }
      grabOffsetMinutes = 0;
      grabOffsetCols = 0;
      inner(e);
    };
  }

  /**
   * Resize-handle pointerdown (timed): drags the START edge so only
   * `event.start` shifts. No grab-offset to preserve — the user's
   * pointer IS the new start position, snapped to slot.
   */
  function startTimedResizeStart(event: CalendarEvent): (e: PointerEvent) => void {
    const inner = drag.startDrag(event);
    return (e) => {
      dragMode.value = 'timed-resize-start';
      grabOffsetMinutes = 0;
      grabOffsetCols = 0;
      grabOffsetDays = 0;
      inner(e);
    };
  }
  function startTimedResizeEnd(event: CalendarEvent): (e: PointerEvent) => void {
    const inner = drag.startDrag(event);
    return (e) => {
      dragMode.value = 'timed-resize-end';
      grabOffsetMinutes = 0;
      grabOffsetCols = 0;
      grabOffsetDays = 0;
      inner(e);
    };
  }
  function startAllDayResizeStart(event: CalendarEvent): (e: PointerEvent) => void {
    const inner = drag.startDrag(event);
    return (e) => {
      dragMode.value = 'allDay-resize-start';
      grabOffsetMinutes = 0;
      grabOffsetCols = 0;
      grabOffsetDays = 0;
      inner(e);
    };
  }
  function startAllDayResizeEnd(event: CalendarEvent): (e: PointerEvent) => void {
    const inner = drag.startDrag(event);
    return (e) => {
      dragMode.value = 'allDay-resize-end';
      grabOffsetMinutes = 0;
      grabOffsetCols = 0;
      grabOffsetDays = 0;
      inner(e);
    };
  }
  function startMonthResizeStart(event: CalendarEvent): (e: PointerEvent) => void {
    const inner = drag.startDrag(event);
    return (e) => {
      dragMode.value = 'month-resize-start';
      grabOffsetMinutes = 0;
      grabOffsetCols = 0;
      grabOffsetDays = 0;
      inner(e);
    };
  }
  function startMonthResizeEnd(event: CalendarEvent): (e: PointerEvent) => void {
    const inner = drag.startDrag(event);
    return (e) => {
      dragMode.value = 'month-resize-end';
      grabOffsetMinutes = 0;
      grabOffsetCols = 0;
      grabOffsetDays = 0;
      inner(e);
    };
  }

  // Pin the global cursor while dragging. The cursor reflects the
  // intent (resize vs grab); without this, the moment the pointer
  // moves off the handle's 6 px hot zone the cursor reverts to
  // whatever the underlying element wants (often `default`),
  // which is jarring mid-drag.
  watch(
    () => drag.isDragging.value,
    (active) => setGlobalDragCursor(active ? cursorForMode(dragMode.value) : null),
  );

  return {
    isDragging: drag.isDragging,
    draggedEvent: computed(() => drag.draggedData.value),
    dragMode: computed(() => dragMode.value),
    dropTarget,
    snappingBack,
    startDrag: startTimedDrag,
    startTimedResizeStart,
    startTimedResizeEnd,
    startAllDayDrag,
    startAllDayResizeStart,
    startAllDayResizeEnd,
    startMonthDrag,
    startMonthResizeStart,
    startMonthResizeEnd,
  };
}

/**
 * Re-export of the pure-function move/resize math. Lives in
 * `core/dnd/move-math.ts` since Phase 7.7 — kept here for the
 * existing import path (`from '../composables/useCalendarDnd'`).
 *
 *   - Move modes preserve duration / span and shift the whole
 *     event to the target slot.
 *   - Resize modes only update one side (start XOR end). The other
 *     side is preserved from the original event, with a small
 *     minimum-duration clamp so the user can't flip the event
 *     past zero.
 *
 * Pure-function on inputs — no side effects.
 */
export { applyMoveToEvent } from '../core/dnd/move-math';
