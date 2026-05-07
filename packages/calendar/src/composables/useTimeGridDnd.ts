/**
 * `useTimeGridDnd` — time-grid (Day + Week view) DnD glue.
 *
 * Wraps `useCalendarDnd` for the time-grid surface and
 * packages the stateful glue that was previously inline in
 * `<CoarTimeGrid>`. Mirrors the shape of `useMonthDnd` for
 * the month view.
 *
 * Outputs:
 *   - `dnd`                       — the underlying composable
 *   - `workingEvents`             — events with the dragged
 *                                   event swapped for a synthetic
 *                                   preview at the snapped slot
 *   - `dragSourceSnapshot`        — captured at drag-start (timed
 *                                   modes) so the original lane /
 *                                   slot keeps a dimmed phantom
 *   - `dragAllDaySourceSnapshot`  — same idea for all-day drags
 *   - `invalidTimedGhost`         — geometry for the red dashed
 *                                   ghost when canDrop vetoes a
 *                                   timed slot
 *   - `invalidAllDayGhost`        — same for all-day vetoes
 *   - `isPreviewEvent(id)`        — predicate the template uses to
 *                                   flip cards into ghost variant
 *   - `onEventPointerdown`        — focus-then-startDrag wrapper
 *   - `onEventKeydown`            — arrow-key keyboard moves +
 *                                   shift+arrow timed resize, with
 *                                   canDrop validation and re-focus
 *   - `draggedDurationMinutes`    — used by the invalid ghost
 *                                   geometry to size the would-be
 *                                   drop
 *
 * Pure-function math (`applyMoveToEvent`, hit-tests) still lives
 * in `useCalendarDnd`; Phase 7.7 will move it to `core/dnd/`.
 */

import { computed, nextTick, ref, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import {
  applyMoveToEvent,
  useCalendarDnd,
  type CalendarDragMode,
  type UseCalendarDndReturn,
} from './useCalendarDnd';
import {
  type DstPolicy,
  type EventDropPayload,
  type MoveResult,
} from '../core/dnd/move-math';
import {
  Temporal,
  layoutDayEvents,
  layoutAllDayBand,
  eventStartDateInZone,
  isAllDayEvent,
  isTimedEvent,
  type CalendarEvent,
} from '../core';

/**
 * Time-grid drop payload — structurally identical to the canonical
 * `EventDropPayload` from `core/dnd/move-math`. Re-exported under this
 * name as a convenience for time-grid-specific call sites.
 */
export type TimeGridEventDropPayload = EventDropPayload;

export interface TimedDragSourceSnapshot {
  dayKey: string;
  lane: number;
  laneCount: number;
  startMinutes: number;
  endMinutes: number;
  event: CalendarEvent;
}

export interface AllDayDragSourceSnapshot {
  startCol: number;
  endCol: number;
  lane: number;
  laneCount: number;
  clippedStart: boolean;
  clippedEnd: boolean;
  event: CalendarEvent;
}

export interface InvalidTimedGhost {
  dayKey: string;
  startMinutes: number;
  durationMinutes: number;
}

export interface InvalidAllDayGhost {
  startCol: number;
  endCol: number;
}

export interface UseTimeGridDndOptions {
  events: MaybeRefOrGetter<ReadonlyArray<CalendarEvent>>;
  days:
    | ComputedRef<ReadonlyArray<Temporal.PlainDate>>
    | Ref<ReadonlyArray<Temporal.PlainDate>>;
  timeRange:
    | ComputedRef<readonly [number, number]>
    | Ref<readonly [number, number]>;
  pixelsPerHour: ComputedRef<number> | Ref<number>;
  slotDuration: ComputedRef<5 | 10 | 15 | 30 | 60> | Ref<5 | 10 | 15 | 30 | 60>;
  timezone: MaybeRefOrGetter<string>;
  /** DST disambiguation policy (Article 5). Default `'compatible'`. */
  dstPolicy?: MaybeRefOrGetter<DstPolicy>;

  surfaceRef: Ref<HTMLElement | null>;
  columnsRef: Ref<HTMLElement | null>;
  allDayColumnsRef: Ref<HTMLElement | null>;
  /** Pixels of leading render buffer in the time-grid body. */
  topBufferMinutes: ComputedRef<number> | Ref<number>;

  canDrop?: (
    event: CalendarEvent,
    target: { date: string; minutes: number | null },
  ) => boolean;
  onEventClick?: (event: CalendarEvent, native: PointerEvent | null) => void;
  onEventDrop?: (payload: TimeGridEventDropPayload) => void;
  /**
   * Optional screen-reader announcer hook. Called after every
   * commit (mouse drop OR keyboard Enter) and after every cancel
   * (keyboard Escape). The view typically wires this to
   * `useA11yAnnouncer().announce` so a `role="status"` element
   * relays the change to assistive tech.
   */
  onAnnounce?: (
    kind: 'committed' | 'cancelled',
    payload?: TimeGridEventDropPayload,
  ) => void;
}

/**
 * Snapshot of the in-flight keyboard-drag state. Drives the same
 * preview-ghost / source-phantom rendering pipeline as a pointer
 * drag (the visuals don't care which input modality started the
 * drag).
 */
export interface KeyboardDragState {
  event: CalendarEvent;
  /** Working start/end after applying the arrow-key moves so far. */
  next: MoveResult;
  mode: CalendarDragMode;
  /** Display zone snapshotted on the FIRST arrow keystroke. The
   *  user could toggle `.timezone()` mid-drag — we anchor to the
   *  zone the drag began in (mirroring mouse `dragStartDisplayZone`). */
  startDisplayZone: string;
  /** Event start snapshotted on the FIRST arrow keystroke. If the
   *  consumer mutates the underlying event between arrows (over-eager
   *  listener applies a preview), `original` on commit must still
   *  reflect the pre-drag value, not the mutated one. */
  originalStart: Temporal.ZonedDateTime | Temporal.PlainDate;
  /** Event end snapshotted on the FIRST arrow keystroke (if any). */
  originalEnd?: Temporal.ZonedDateTime | Temporal.PlainDate;
}

export interface UseTimeGridDndReturn {
  dnd: UseCalendarDndReturn;
  workingEvents: ComputedRef<ReadonlyArray<CalendarEvent>>;
  dragSourceSnapshot: Ref<TimedDragSourceSnapshot | null>;
  dragAllDaySourceSnapshot: Ref<AllDayDragSourceSnapshot | null>;
  invalidTimedGhost: ComputedRef<InvalidTimedGhost | null>;
  invalidAllDayGhost: ComputedRef<InvalidAllDayGhost | null>;
  isPreviewEvent: (id: string) => boolean;
  onEventPointerdown: (
    e: PointerEvent,
    event: CalendarEvent,
    start: (data: CalendarEvent) => (e: PointerEvent) => void,
  ) => void;
  onEventKeydown: (e: KeyboardEvent, event: CalendarEvent) => void;
  draggedDurationMinutes: ComputedRef<number | null>;
  /** Active keyboard-drag state, or `null` when no kbd-drag is in flight. */
  keyboardDrag: Ref<KeyboardDragState | null>;
}

export function useTimeGridDnd(
  opts: UseTimeGridDndOptions,
): UseTimeGridDndReturn {
  const dnd = useCalendarDnd({
    surfaceRef: opts.surfaceRef,
    columnsRef: opts.columnsRef,
    allDayColumnsRef: opts.allDayColumnsRef,
    days: opts.days,
    timeRange: opts.timeRange,
    pixelsPerHour: opts.pixelsPerHour,
    slotDuration: opts.slotDuration,
    timezone: computed(() => toValue(opts.timezone)),
    dstPolicy: opts.dstPolicy
      ? computed(() => toValue(opts.dstPolicy!))
      : undefined,
    timeGridTopBufferMinutes: opts.topBufferMinutes,
    canDrop: opts.canDrop
      ? (event, target) =>
          opts.canDrop!(event, { date: target.date, minutes: target.minutes })
      : undefined,
    onEventClick: (event, native) => {
      opts.onEventClick?.(event, native);
    },
    onEventDrop: (payload) => {
      opts.onEventDrop?.(payload as TimeGridEventDropPayload);
      opts.onAnnounce?.('committed', payload as TimeGridEventDropPayload);
    },
  });

  /**
   * Active keyboard-drag state. Mirrors the pointer-drag shape so
   * `workingEvents` / `isPreviewEvent` / `dragSourceSnapshot` can
   * read from EITHER source — the rendering pipeline doesn't care
   * which input modality started the drag. Set on the FIRST arrow
   * keystroke on a focused event; cleared on `Enter` (commit) /
   * `Escape` (cancel).
   */
  const keyboardDrag = ref<KeyboardDragState | null>(null);

  const workingEvents = computed<ReadonlyArray<CalendarEvent>>(() => {
    const events = toValue(opts.events);

    // Pointer drag wins if both are somehow active (shouldn't
    // happen in practice — pointer drag fully captures input).
    const dragged = dnd.draggedEvent.value;
    const target = dnd.dropTarget.value;
    const mode = dnd.dragMode.value;
    if (dragged && target && mode) {
      // Invalid pointer drop target: skip the layout-replay. Other
      // events stay where they are, the source phantom stays
      // visible at the original slot, and the ghost is rendered
      // separately with an invalid look.
      if (target.valid === false) return events;
      // Month-view drags don't drive the time-grid working set.
      if (mode === 'month') return events;
      // Pass the active dstPolicy so the preview event's instant
      // matches the eventual commit (Article 5: explicit policy on
      // every code path; preview vs commit divergence on a DST
      // overlap would silently lie to the user).
      const policy = opts.dstPolicy ? toValue(opts.dstPolicy) : 'compatible';
      const next = applyMoveToEvent(dragged, target, mode, policy);
      const previewEvent: CalendarEvent = {
        ...dragged,
        id: `${dragged.id}__preview`,
        start: next.start,
        end: next.end,
      };
      return [...events.filter((e) => e.id !== dragged.id), previewEvent];
    }

    // Keyboard drag: same layout-replay shape, just sourced from
    // kbd state instead of useCalendarDnd. canDrop is validated
    // at commit time (Enter), so we don't pre-veto the layout
    // here — the user always sees a preview wherever their arrow
    // keys take them.
    const kbd = keyboardDrag.value;
    if (kbd) {
      const previewEvent: CalendarEvent = {
        ...kbd.event,
        id: `${kbd.event.id}__preview`,
        start: kbd.next.start,
        end: kbd.next.end,
      };
      return [...events.filter((e) => e.id !== kbd.event.id), previewEvent];
    }

    return events;
  });

  function isPreviewEvent(id: string): boolean {
    const dragged = dnd.draggedEvent.value;
    if (dragged !== null && id === `${dragged.id}__preview`) return true;
    const kbd = keyboardDrag.value;
    if (kbd !== null && id === `${kbd.event.id}__preview`) return true;
    return false;
  }

  const dragSourceSnapshot = ref<TimedDragSourceSnapshot | null>(null);
  const dragAllDaySourceSnapshot = ref<AllDayDragSourceSnapshot | null>(null);

  // Capture on `isDragging` (post-threshold), not `draggedEvent`
  // (set on pointerdown). Otherwise a plain click on an event would
  // flash a source phantom under the original card before the user
  // has actually crossed the click-vs-drag threshold.
  watch(
    () => dnd.isDragging.value,
    (current, prev) => {
      if (current && !prev) {
        const mode = dnd.dragMode.value;
        const dragged = dnd.draggedEvent.value;
        if (!dragged) return;
        const events = toValue(opts.events);
        const tz = toValue(opts.timezone);
        if (
          mode === 'allDay' ||
          mode === 'allDay-resize-start' ||
          mode === 'allDay-resize-end'
        ) {
          const layoutNow = layoutAllDayBand(events, {
            days: opts.days.value,
            timezone: tz,
          });
          const me = layoutNow.find((b) => b.event.id === dragged.id);
          if (me) {
            dragAllDaySourceSnapshot.value = {
              startCol: me.startCol,
              endCol: me.endCol,
              lane: me.lane,
              laneCount: me.laneCount,
              clippedStart: me.clippedStart,
              clippedEnd: me.clippedEnd,
              event: dragged,
            };
          }
        } else {
          const sourceDay = eventStartDateInZone(dragged.start, tz);
          const layoutNow = layoutDayEvents(events, {
            day: sourceDay,
            timeRange: opts.timeRange.value as [number, number],
            timezone: tz,
          });
          const me = layoutNow.find((p) => p.event.id === dragged.id);
          if (me) {
            dragSourceSnapshot.value = {
              dayKey: sourceDay.toString(),
              lane: me.lane,
              laneCount: me.laneCount,
              startMinutes: me.startMinutes,
              endMinutes: me.endMinutes,
              event: dragged,
            };
          }
        }
      } else if (!current && prev) {
        dragSourceSnapshot.value = null;
        dragAllDaySourceSnapshot.value = null;
      }
    },
  );

  /**
   * Capture the source phantom when a keyboard drag begins (first
   * arrow keystroke). Mirrors the pointer-drag watcher above so
   * the dimmed "you came from here" overlay renders identically
   * regardless of input modality.
   */
  watch(
    () => keyboardDrag.value !== null,
    (current, prev) => {
      if (current && !prev) {
        const kbd = keyboardDrag.value;
        if (!kbd) return;
        const events = toValue(opts.events);
        const tz = toValue(opts.timezone);
        if (
          kbd.mode === 'allDay' ||
          kbd.mode === 'allDay-resize-start' ||
          kbd.mode === 'allDay-resize-end'
        ) {
          const layoutNow = layoutAllDayBand(events, {
            days: opts.days.value,
            timezone: tz,
          });
          const me = layoutNow.find((b) => b.event.id === kbd.event.id);
          if (me) {
            dragAllDaySourceSnapshot.value = {
              startCol: me.startCol,
              endCol: me.endCol,
              lane: me.lane,
              laneCount: me.laneCount,
              clippedStart: me.clippedStart,
              clippedEnd: me.clippedEnd,
              event: kbd.event,
            };
          }
        } else {
          const sourceDay = eventStartDateInZone(kbd.event.start, tz);
          const layoutNow = layoutDayEvents(events, {
            day: sourceDay,
            timeRange: opts.timeRange.value as [number, number],
            timezone: tz,
          });
          const me = layoutNow.find((p) => p.event.id === kbd.event.id);
          if (me) {
            dragSourceSnapshot.value = {
              dayKey: sourceDay.toString(),
              lane: me.lane,
              laneCount: me.laneCount,
              startMinutes: me.startMinutes,
              endMinutes: me.endMinutes,
              event: kbd.event,
            };
          }
        }
      } else if (!current && prev) {
        dragSourceSnapshot.value = null;
        dragAllDaySourceSnapshot.value = null;
      }
    },
  );

  const draggedDurationMinutes = computed<number | null>(() => {
    const ev = dnd.draggedEvent.value;
    if (!ev) return null;
    if (!isTimedEvent(ev)) return null;
    const slot = opts.slotDuration.value;
    if (!ev.end) return slot;
    const total = ev.start
      .toInstant()
      .until(ev.end.toInstant())
      .total({ unit: 'minute' });
    return Math.max(slot, total);
  });

  const invalidTimedGhost = computed<InvalidTimedGhost | null>(() => {
    if (!dnd.isDragging.value && !dnd.snappingBack.value) return null;
    const target = dnd.dropTarget.value;
    if (!target || target.valid !== false) return null;
    if (dnd.dragMode.value !== 'timed' || target.minutes === null) return null;
    const dur = draggedDurationMinutes.value;
    if (dur === null) return null;
    const [startHour] = opts.timeRange.value;
    return {
      dayKey: target.date,
      startMinutes: target.minutes - startHour * 60,
      durationMinutes: dur,
    };
  });

  const invalidAllDayGhost = computed<InvalidAllDayGhost | null>(() => {
    if (!dnd.isDragging.value && !dnd.snappingBack.value) return null;
    const target = dnd.dropTarget.value;
    if (!target || target.valid !== false) return null;
    if (dnd.dragMode.value !== 'allDay') return null;
    const snapshot = dragAllDaySourceSnapshot.value;
    if (!snapshot) return null;
    const span = snapshot.endCol - snapshot.startCol;
    const days = opts.days.value;
    const startCol = days.findIndex((d) => d.toString() === target.date);
    if (startCol < 0) return null;
    const endCol = Math.min(days.length - 1, startCol + span);
    return { startCol, endCol };
  });

  function onEventPointerdown(
    e: PointerEvent,
    event: CalendarEvent,
    start: (data: CalendarEvent) => (e: PointerEvent) => void,
  ): void {
    const el = e.currentTarget;
    if (el instanceof HTMLElement) el.focus({ preventScroll: true });
    start(event)(e);
  }

  /**
   * Compute the snap-target shape (date + optional minutes) from
   * the working `next` payload. Mirrors what the pointer-drag's
   * hit-test produces, so onEventDrop receives the same target
   * shape regardless of input modality.
   *
   * `tz` is the DISPLAY zone (used to project ZDT into the column
   * the user sees).
   */
  function targetFromNext(
    next: MoveResult,
    tz: string,
  ): {
    date: string;
    minutes: number | null;
    displayZone: string;
    disambiguation: null | 'gap' | 'overlap';
  } {
    if (next.start instanceof Temporal.PlainDate) {
      return {
        date: next.start.toString(),
        minutes: null,
        displayZone: tz,
        disambiguation: next.disambiguation ?? null,
      };
    }
    const z = next.start.withTimeZone(tz);
    return {
      date: z.toPlainDate().toString(),
      minutes: z.hour * 60 + z.minute,
      displayZone: tz,
      disambiguation: next.disambiguation ?? null,
    };
  }

  /**
   * Derive the next preview payload from `base` start/end + an
   * arrow keystroke. `base` is either the event's original
   * start/end (first arrow) or `keyboardDrag.next` (subsequent
   * arrows in the same keyboard-drag session). Returns `null` if
   * the key combination isn't supported for `event`'s type
   * (e.g. up/down on an all-day event).
   *
   * **Routes through `applyMoveToEvent`** so the active `dstPolicy`
   * is enforced uniformly — the keyboard path picks up gap/overlap
   * detection, source-zone preservation, and the same disambiguation
   * flag the mouse path produces. Article 5: one explicit policy,
   * one code path.
   *
   * Day-shift (ArrowLeft/Right) on timed events lands on the same
   * wall-clock time on the next/previous calendar day in the display
   * zone — that's the "10:00 Vienna stays 10:00 Vienna across DST"
   * promise from Article 5.
   */
  function deriveNextFromArrow(
    base: MoveResult,
    event: CalendarEvent,
    e: KeyboardEvent,
    slotMin: number,
  ): { next: MoveResult; mode: CalendarDragMode } | null {
    const isTimed = isTimedEvent(event);
    const isAllDay = isAllDayEvent(event);
    const displayZone = toValue(opts.timezone);
    const policy = opts.dstPolicy ? toValue(opts.dstPolicy) : 'compatible';

    // Build a synthetic CalendarEvent representing the working state
    // (the kbd-drag's accumulated `base`). applyMoveToEvent reads the
    // event's source zone(s) from this — so the synthetic carries the
    // ORIGINAL event's source zones via base.start/end.
    const workingEvent: CalendarEvent = {
      id: event.id,
      start: base.start,
      ...(base.end ? { end: base.end } : {}),
    } as CalendarEvent;

    // Shift+ArrowUp/Down on a timed event: resize the END side.
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && isTimed) {
      const baseEnd =
        (base.end as Temporal.ZonedDateTime | undefined) ??
        (base.start as Temporal.ZonedDateTime).add({ minutes: 30 });
      const endInDisplay = baseEnd.withTimeZone(displayZone);
      const delta = e.key === 'ArrowDown' ? slotMin : -slotMin;
      const newMinutesAbs =
        endInDisplay.hour * 60 + endInDisplay.minute + delta;
      const { date: newDate, minutes: newMinutes } = normalizeMinutes(
        endInDisplay.toPlainDate(),
        newMinutesAbs,
      );
      try {
        const next = applyMoveToEvent(
          workingEvent,
          { date: newDate, minutes: newMinutes, displayZone, valid: true },
          'timed-resize-end',
          policy,
        );
        return { next, mode: 'timed-resize-end' };
      } catch {
        return null; // policy='reject' on a DST gap/overlap
      }
    }
    // ArrowUp/Down without shift: move on a timed event.
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!isTimed) return null;
      const startInDisplay = (base.start as Temporal.ZonedDateTime).withTimeZone(
        displayZone,
      );
      const delta = e.key === 'ArrowDown' ? slotMin : -slotMin;
      const newMinutesAbs =
        startInDisplay.hour * 60 + startInDisplay.minute + delta;
      const { date: newDate, minutes: newMinutes } = normalizeMinutes(
        startInDisplay.toPlainDate(),
        newMinutesAbs,
      );
      try {
        const next = applyMoveToEvent(
          workingEvent,
          { date: newDate, minutes: newMinutes, displayZone, valid: true },
          'timed',
          policy,
        );
        return { next, mode: 'timed' };
      } catch {
        return null;
      }
    }
    // ArrowLeft/Right: shift by ±1 day in the DISPLAY zone, preserving
    // the wall-clock time. Suppressed in single-day view.
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (opts.days.value.length <= 1) return null;
      const dayDelta = e.key === 'ArrowRight' ? 1 : -1;
      if (isAllDay) {
        const baseStart = base.start as Temporal.PlainDate;
        const newDate = baseStart.add({ days: dayDelta });
        try {
          const next = applyMoveToEvent(
            workingEvent,
            { date: newDate.toString(), minutes: null, displayZone, valid: true },
            'allDay',
            policy,
          );
          return { next, mode: 'allDay' };
        } catch {
          return null;
        }
      }
      if (isTimed) {
        const startInDisplay = (
          base.start as Temporal.ZonedDateTime
        ).withTimeZone(displayZone);
        const newDate = startInDisplay.toPlainDate().add({ days: dayDelta });
        const minutes = startInDisplay.hour * 60 + startInDisplay.minute;
        try {
          const next = applyMoveToEvent(
            workingEvent,
            { date: newDate.toString(), minutes, displayZone, valid: true },
            'timed',
            policy,
          );
          return { next, mode: 'timed' };
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /** Roll minute-of-day overflow into a date offset. */
  function normalizeMinutes(
    day: Temporal.PlainDate,
    minutes: number,
  ): { date: string; minutes: number } {
    let d = day;
    let m = minutes;
    while (m < 0) {
      d = d.subtract({ days: 1 });
      m += 24 * 60;
    }
    while (m >= 24 * 60) {
      d = d.add({ days: 1 });
      m -= 24 * 60;
    }
    return { date: d.toString(), minutes: m };
  }

  function commitKeyboardDrag(): void {
    const kbd = keyboardDrag.value;
    if (!kbd) return;
    const tz = toValue(opts.timezone);
    if (opts.canDrop) {
      const target = targetFromNext(kbd.next, tz);
      if (!opts.canDrop(kbd.event, target)) {
        // Invalid commit — clear preview but don't fire onEventDrop.
        keyboardDrag.value = null;
        return;
      }
    }
    // C2 — kbd.next was produced by applyMoveToEvent on the last
    // arrow press (with a fresh policy read each time). We fire ONCE
    // per commit, constructing the payload from the cached MoveResult
    // — the math entry is still applyMoveToEvent, just on a different
    // call site than the mouse path. This is C2-equivalent because the
    // payload shape and disambiguation surface match buildDropPayload.
    const payload: TimeGridEventDropPayload = {
      event: kbd.event,
      original: {
        start: kbd.originalStart,
        ...(kbd.originalEnd !== undefined ? { end: kbd.originalEnd } : {}),
        displayZone: kbd.startDisplayZone,
      },
      next: kbd.next,
      target: targetFromNext(kbd.next, tz),
      native: null,
    };
    opts.onEventDrop?.(payload);
    opts.onAnnounce?.('committed', payload);
    keyboardDrag.value = null;
    // Re-focus the moved event after Vue re-renders. Moving across
    // day-columns / hours can unmount + remount the event card in a
    // different DOM position; we look it up by `data-event-id` and
    // refocus it.
    const eventId = kbd.event.id;
    nextTick(() => {
      const el = document.querySelector(
        `[data-event-id="${CSS.escape(eventId)}"]`,
      );
      if (el instanceof HTMLElement) el.focus();
    });
  }

  function onEventKeydown(e: KeyboardEvent, event: CalendarEvent): void {
    // Esc cancels an in-flight keyboard drag (without committing)
    // and otherwise blurs the focused event so arrow keys go back
    // to scrolling the page / surface.
    if (e.key === 'Escape') {
      if (keyboardDrag.value) {
        keyboardDrag.value = null;
        opts.onAnnounce?.('cancelled');
        e.preventDefault();
        return;
      }
      const el = e.currentTarget;
      if (el instanceof HTMLElement) el.blur();
      e.preventDefault();
      return;
    }

    // Enter commits an in-flight keyboard drag — same payload
    // shape as a pointer drop.
    if (e.key === 'Enter') {
      if (!keyboardDrag.value) return;
      e.preventDefault();
      commitKeyboardDrag();
      return;
    }

    // Arrow keys build / extend the keyboard-drag preview. The
    // preview event swaps into `workingEvents` so the layout
    // reflows + the `--ghost` variant renders, mirroring pointer
    // drag UX.
    if (
      e.key !== 'ArrowUp' &&
      e.key !== 'ArrowDown' &&
      e.key !== 'ArrowLeft' &&
      e.key !== 'ArrowRight'
    ) {
      return;
    }
    const slotMin = opts.slotDuration.value;
    const base: MoveResult = keyboardDrag.value
      ? keyboardDrag.value.next
      : ({
          start: event.start,
          ...(event.end ? { end: event.end } : {}),
        } as MoveResult);
    const result = deriveNextFromArrow(base, event, e, slotMin);
    if (!result) {
      // `deriveNextFromArrow` returns null when the move is impossible
      // (single-day view + arrow-left/right) OR when `dstPolicy='reject'`
      // catches a DST gap/overlap on the resulting wall-time. Either
      // way the user pressed a key and got nothing — fire 'cancelled'
      // so SR users hear the rejection instead of silence.
      opts.onAnnounce?.('cancelled');
      return;
    }
    e.preventDefault();
    // Snapshot the display zone on the FIRST arrow keystroke (when
    // we transition into a kbd-drag). Subsequent arrows reuse the
    // existing snapshot so an in-flight `.timezone()` toggle doesn't
    // mid-flight rewrite the original-zone field on commit.
    const existing = keyboardDrag.value;
    const startDisplayZone = existing?.startDisplayZone ?? toValue(opts.timezone);
    const originalStart = existing?.originalStart ?? event.start;
    const originalEnd = existing?.originalEnd ?? event.end;
    keyboardDrag.value = {
      event,
      next: result.next,
      mode: result.mode,
      startDisplayZone,
      originalStart,
      ...(originalEnd ? { originalEnd } : {}),
    };
    // After staging mutation, re-focus the ghost. The original
    // event card was unmounted (replaced by a synthetic preview),
    // its DOM node is gone, and focus would otherwise fall to
    // <body> — which means the next arrow keystroke is dropped on
    // the floor (no `keydown` listener on the body). The ghost
    // carries `kbdActive=true` while the kbd-drag is in flight,
    // so it's tabbable + has the keydown handler bound — focusing
    // it keeps the state machine reachable for the next arrow.
    nextTick(() => {
      const ghost = document.querySelector<HTMLElement>(
        '.coar-time-grid-event--ghost[tabindex="0"], .coar-time-grid-all-day-bar--ghost[tabindex="0"]',
      );
      if (ghost) ghost.focus({ preventScroll: true });
    });
  }

  return {
    dnd,
    workingEvents,
    dragSourceSnapshot,
    dragAllDaySourceSnapshot,
    invalidTimedGhost,
    invalidAllDayGhost,
    isPreviewEvent,
    onEventPointerdown,
    onEventKeydown,
    draggedDurationMinutes,
    keyboardDrag,
  };
}
