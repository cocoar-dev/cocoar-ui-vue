/**
 * `useMonthDnd` — month-view-specific DnD glue.
 *
 * Wraps `useCalendarDnd` for the month grid and packages the
 * stateful glue that was previously inline in `<CoarMonthView>`:
 *
 *   - `workingEvents`        — events list with the dragged event
 *                              swapped for a synthetic preview at
 *                              the target cell, so the layout pass
 *                              reflows pills + bars around the
 *                              proposed move.
 *   - `dragSourceSnapshot`   — captured at drag-start so the
 *                              original cell can keep showing a
 *                              dimmed phantom while the live
 *                              layout has moved on.
 *   - `invalidMonthGhost`    — geometry for the row-level red ghost
 *                              when `canDrop` vetoes the target,
 *                              for multi-day-bar drags.
 *   - `isPreviewId`          — predicate the template uses to flip
 *                              pills / bars into ghost variant.
 *   - `isInvalidPillTarget`  — used by the cell template to splice
 *                              the invalid ghost into the correct
 *                              cell's flex pill column (so the
 *                              dashed red outline stays inside the
 *                              cell box at the rightmost column).
 *   - `onMonthEventPointerdown` — focuses the event card before
 *                              delegating to `dnd.startMonthDrag`.
 *                              Needed because `useCoarDrag.startDrag`
 *                              calls `event.preventDefault()`.
 *   - `onMonthEventKeydown`  — arrow-key keyboard moves with
 *                              shift+arrow resize for all-day
 *                              events, plus `canDrop` validation
 *                              and re-focus after Vue re-renders.
 *
 * Pure-function math (`applyMoveToEvent`, hit-tests) still lives
 * in `useCalendarDnd` for now — Phase 7.7 will move it to
 * `core/dnd/`.
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
  layoutMonthGrid,
  isAllDayEvent,
  isTimedEvent,
  type CalendarEvent,
} from '../core';

/**
 * Month drop payload — alias for the canonical `EventDropPayload`
 * shape from core/dnd/move-math. Kept for backward-compatible import
 * paths; new code should use `EventDropPayload` directly.
 */
export type MonthEventDropPayload = EventDropPayload;

export interface MonthDragSourceSnapshot {
  /** Pill ranges per cell-day-key the dragged event occupied. */
  pillCells: ReadonlyArray<string>;
  /** Multi-day bar ranges per row, if applicable. */
  bars: ReadonlyArray<{
    rowIndex: number;
    startCol: number;
    endCol: number;
    lane: number;
    clippedStart: boolean;
    clippedEnd: boolean;
  }>;
  event: CalendarEvent;
}

export interface InvalidMonthGhost {
  rowIndex: number;
  startCol: number;
  endCol: number;
  isBar: boolean;
}

export interface UseMonthDndOptions {
  /** Source events. */
  events: MaybeRefOrGetter<ReadonlyArray<CalendarEvent>>;
  /** 42 dates for the visible month grid (6×7, top-left first). */
  gridDates:
    | ComputedRef<ReadonlyArray<Temporal.PlainDate>>
    | Ref<ReadonlyArray<Temporal.PlainDate>>;
  /** Element used as the month-grid hit-test reference. */
  gridRef: Ref<HTMLElement | null>;
  /** Effective IANA timezone for instant ↔ date math. */
  timezone: MaybeRefOrGetter<string>;
  /** DST disambiguation policy (Article 5). Default `'compatible'`. */
  dstPolicy?: MaybeRefOrGetter<DstPolicy>;
  /** Drop validator. Returning false marks the target invalid. */
  canDrop?: (
    event: CalendarEvent,
    target: { date: string; minutes: number | null },
  ) => boolean;
  /** User clicked an event without crossing the drag threshold. */
  onEventClick?: (event: CalendarEvent, native: PointerEvent | null) => void;
  /** A drag completed (or a keyboard move fired). */
  onEventDrop?: (payload: MonthEventDropPayload) => void;
  /**
   * Optional screen-reader announcer hook. Called after every
   * commit (mouse drop OR keyboard Enter) and after every cancel
   * (keyboard Escape).
   */
  onAnnounce?: (
    kind: 'committed' | 'cancelled',
    payload?: MonthEventDropPayload,
  ) => void;
}

/**
 * Snapshot of the in-flight keyboard-drag state. Drives the same
 * preview-ghost / source-phantom rendering pipeline as a pointer
 * drag — the visuals don't care which input modality started
 * the drag.
 */
export interface KeyboardDragState {
  event: CalendarEvent;
  /** Working start/end after applying the arrow-key moves so far. */
  next: MoveResult;
  mode: CalendarDragMode;
  /** Display zone snapshotted on first arrow keystroke. */
  startDisplayZone: string;
  /** Event start at first arrow keystroke (in case consumer
   *  mutates event mid-drag). */
  originalStart: Temporal.ZonedDateTime | Temporal.PlainDate;
  originalEnd?: Temporal.ZonedDateTime | Temporal.PlainDate;
}

export interface UseMonthDndReturn {
  dnd: UseCalendarDndReturn;
  workingEvents: ComputedRef<ReadonlyArray<CalendarEvent>>;
  dragSourceSnapshot: Ref<MonthDragSourceSnapshot | null>;
  invalidMonthGhost: ComputedRef<InvalidMonthGhost | null>;
  isPreviewId: (id: string) => boolean;
  isInvalidPillTarget: (day: Temporal.PlainDate) => boolean;
  onMonthEventPointerdown: (e: PointerEvent, event: CalendarEvent) => void;
  onMonthEventKeydown: (e: KeyboardEvent, event: CalendarEvent) => void;
  /** Active keyboard-drag state, or `null` when no kbd-drag is in flight. */
  keyboardDrag: Ref<KeyboardDragState | null>;
}

export function useMonthDnd(opts: UseMonthDndOptions): UseMonthDndReturn {
  const dnd = useCalendarDnd({
    surfaceRef: opts.gridRef,
    monthGridRef: opts.gridRef,
    monthGridDates: opts.gridDates,
    timezone: computed(() => toValue(opts.timezone)),
    dstPolicy: opts.dstPolicy
      ? computed(() => toValue(opts.dstPolicy!))
      : undefined,
    canDrop: opts.canDrop
      ? (event, target) =>
          opts.canDrop!(event, { date: target.date, minutes: target.minutes })
      : undefined,
    onEventClick: (event, native) => {
      opts.onEventClick?.(event, native);
    },
    onEventDrop: (payload) => {
      opts.onEventDrop?.(payload as MonthEventDropPayload);
      opts.onAnnounce?.('committed', payload as MonthEventDropPayload);
    },
  });

  /**
   * Active keyboard-drag state. Mirrors the pointer-drag shape so
   * `workingEvents` / `isPreviewId` / `dragSourceSnapshot` can
   * read from EITHER source. Set on the FIRST arrow keystroke on
   * a focused event; cleared on `Enter` (commit) / `Escape`
   * (cancel).
   */
  const keyboardDrag = ref<KeyboardDragState | null>(null);

  /**
   * Events list with the dragged event replaced by a synthetic
   * "preview" event at the target cell. The layout pass then sees
   * the proposed move — pills shift to the target cell, multi-day
   * bars span the new date range, and the source-cell layout
   * reflows as if the event were already gone (the original
   * visual is preserved separately via `dragSourceSnapshot`).
   */
  const workingEvents = computed<ReadonlyArray<CalendarEvent>>(() => {
    const events = toValue(opts.events);

    // Pointer drag wins if both are somehow active.
    const dragged = dnd.draggedEvent.value;
    const target = dnd.dropTarget.value;
    const mode = dnd.dragMode.value;
    if (dragged && target && mode) {
      // Invalid: skip reflow. Other events keep their slots; the
      // invalid ghost is rendered separately at the pointer cell.
      if (target.valid === false) return events;
      // Only month-view modes drive the month layout reflow.
      if (
        mode !== 'month' &&
        mode !== 'month-resize-start' &&
        mode !== 'month-resize-end'
      ) {
        return events;
      }
      // Article 5: pass the active dstPolicy so the preview event's
      // instant matches the eventual commit on DST gaps / overlaps.
      const policy = opts.dstPolicy ? toValue(opts.dstPolicy) : 'compatible';
      const next = applyMoveToEvent(dragged, target, mode, policy);
      const preview: CalendarEvent = {
        ...dragged,
        id: `${dragged.id}__preview`,
        start: next.start,
        end: next.end,
      };
      return [...events.filter((e) => e.id !== dragged.id), preview];
    }

    // Keyboard drag: same layout-replay shape, just sourced from
    // kbd state. canDrop is validated at commit time (Enter), so
    // the user always sees a preview wherever their arrow keys
    // take them.
    const kbd = keyboardDrag.value;
    if (kbd) {
      const preview: CalendarEvent = {
        ...kbd.event,
        id: `${kbd.event.id}__preview`,
        start: kbd.next.start,
        end: kbd.next.end,
      };
      return [...events.filter((e) => e.id !== kbd.event.id), preview];
    }

    return events;
  });

  function isPreviewId(id: string): boolean {
    const dragged = dnd.draggedEvent.value;
    if (dragged !== null && id === `${dragged.id}__preview`) return true;
    const kbd = keyboardDrag.value;
    if (kbd !== null && id === `${kbd.event.id}__preview`) return true;
    return false;
  }

  /**
   * Source snapshot captured at drag-start so the original cell
   * can keep showing a dimmed phantom while the live layout (run
   * with the proposed move) no longer carries an entry there.
   */
  const dragSourceSnapshot = ref<MonthDragSourceSnapshot | null>(null);

  // Capture on `isDragging` (post-threshold), not `draggedEvent`
  // (set on pointerdown). Otherwise a plain click on an event
  // would flash a phantom + ghost the instant the pointer goes
  // down, before the user has actually moved past the
  // click-vs-drag threshold — they'd see drag feedback for what
  // they intended as a click.
  watch(
    () => dnd.isDragging.value,
    (current, prev) => {
      const mode = dnd.dragMode.value;
      const isMonthMode =
        mode === 'month' ||
        mode === 'month-resize-start' ||
        mode === 'month-resize-end';
      if (current && !prev && isMonthMode) {
        const dragged = dnd.draggedEvent.value;
        if (!dragged) return;
        const events = toValue(opts.events);
        const snap = layoutMonthGrid(events, {
          gridDates: opts.gridDates.value,
          timezone: toValue(opts.timezone),
        });
        const pillCells: string[] = [];
        const bars: Array<MonthDragSourceSnapshot['bars'][number]> = [];
        for (let r = 0; r < snap.weekRows.length; r++) {
          const row = snap.weekRows[r];
          for (const [k, pills] of row.cellPills) {
            if (pills.some((p) => p.event.id === dragged.id)) pillCells.push(k);
          }
          for (const bar of row.multiDayBars) {
            if (bar.event.id === dragged.id) {
              bars.push({
                rowIndex: r,
                startCol: bar.startCol,
                endCol: bar.endCol,
                lane: bar.lane,
                clippedStart: bar.clippedStart,
                clippedEnd: bar.clippedEnd,
              });
            }
          }
        }
        dragSourceSnapshot.value = { pillCells, bars, event: dragged };
      } else if (!current && prev) {
        dragSourceSnapshot.value = null;
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
        const snap = layoutMonthGrid(events, {
          gridDates: opts.gridDates.value,
          timezone: toValue(opts.timezone),
        });
        const pillCells: string[] = [];
        const bars: Array<MonthDragSourceSnapshot['bars'][number]> = [];
        for (let r = 0; r < snap.weekRows.length; r++) {
          const row = snap.weekRows[r];
          for (const [k, pills] of row.cellPills) {
            if (pills.some((p) => p.event.id === kbd.event.id)) pillCells.push(k);
          }
          for (const bar of row.multiDayBars) {
            if (bar.event.id === kbd.event.id) {
              bars.push({
                rowIndex: r,
                startCol: bar.startCol,
                endCol: bar.endCol,
                lane: bar.lane,
                clippedStart: bar.clippedStart,
                clippedEnd: bar.clippedEnd,
              });
            }
          }
        }
        dragSourceSnapshot.value = { pillCells, bars, event: kbd.event };
      } else if (!current && prev) {
        dragSourceSnapshot.value = null;
      }
    },
  );

  /**
   * Invalid ghost geometry (when `canDrop` vetoes the target cell).
   * Single-day pills and multi-day bars share one box per drop.
   */
  const invalidMonthGhost = computed<InvalidMonthGhost | null>(() => {
    if (!dnd.isDragging.value && !dnd.snappingBack.value) return null;
    const target = dnd.dropTarget.value;
    if (!target || target.valid !== false || dnd.dragMode.value !== 'month') {
      return null;
    }
    const snap = dragSourceSnapshot.value;
    if (!snap) return null;
    const dates = opts.gridDates.value;
    const idx = dates.findIndex((d) => d.toString() === target.date);
    if (idx < 0) return null;
    const rowIndex = Math.floor(idx / 7);
    const startCol = idx % 7;
    const isBar = snap.bars.length > 0;
    if (isBar) {
      const span = snap.bars[0].endCol - snap.bars[0].startCol;
      const endCol = Math.min(6, startCol + span);
      return { rowIndex, startCol, endCol, isBar: true };
    }
    return { rowIndex, startCol, endCol: startCol, isBar: false };
  });

  /**
   * True when `day` is the cell currently flagged as an invalid
   * drop target AND the dragged event would render as a single-
   * day pill (not a multi-day bar). Used by the cell template to
   * splice an extra "invalid" pill into the cell's flex column —
   * same layout path as the valid ghost, so the dashed red
   * outline stays inside the cell box and never gets clipped at
   * the rightmost column.
   */
  function isInvalidPillTarget(day: Temporal.PlainDate): boolean {
    const ghost = invalidMonthGhost.value;
    if (!ghost || ghost.isBar) return false;
    const idx = ghost.rowIndex * 7 + ghost.startCol;
    const target = opts.gridDates.value[idx];
    return target ? Temporal.PlainDate.compare(day, target) === 0 : false;
  }

  /**
   * See note in `CoarTimeGrid` — explicit focus on pointerdown so
   * the event card receives keyboard focus despite
   * `useCoarDrag.startDrag` calling `event.preventDefault()`.
   */
  function onMonthEventPointerdown(
    e: PointerEvent,
    event: CalendarEvent,
  ): void {
    const el = e.currentTarget;
    if (el instanceof HTMLElement) el.focus({ preventScroll: true });
    dnd.startMonthDrag(event)(e);
  }

  /**
   * Compute the snap-target shape (date + null minutes for month
   * view) from the working `next` payload.
   */
  function targetFromNext(
    next: MoveResult,
    tz: string,
  ): {
    date: string;
    minutes: null;
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
    return {
      date: next.start.withTimeZone(tz).toPlainDate().toString(),
      minutes: null,
      displayZone: tz,
      disambiguation: next.disambiguation ?? null,
    };
  }

  /**
   * Derive the next preview payload from `base` start/end + an
   * arrow keystroke. Routes through `applyMoveToEvent` so the active
   * `dstPolicy` is honored on every kbd move (mirrors mouse path).
   */
  function deriveNextFromArrow(
    base: MoveResult,
    event: CalendarEvent,
    e: KeyboardEvent,
  ): { next: MoveResult; mode: CalendarDragMode } | null {
    const displayZone = toValue(opts.timezone);
    const policy = opts.dstPolicy ? toValue(opts.dstPolicy) : 'compatible';
    // Up / Down jump one full week-row in the month grid; Left /
    // Right step a single day.
    const dayDelta =
      e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowLeft'
          ? -1
          : e.key === 'ArrowDown'
            ? 7
            : -7;

    const workingEvent: CalendarEvent = {
      id: event.id,
      start: base.start,
      ...(base.end ? { end: base.end } : {}),
    } as CalendarEvent;

    if (isAllDayEvent(event)) {
      const baseStart = base.start as Temporal.PlainDate;
      const baseEnd = base.end as Temporal.PlainDate | undefined;
      if (e.shiftKey && baseEnd) {
        // Resize end to baseEnd+dayDelta exclusive: the LAST visible day
        // is baseEnd-1+dayDelta. applyMoveToEvent's allDay-resize-end
        // takes the last-visible-day and adds 1 internally.
        const newLastVisible = baseEnd.subtract({ days: 1 }).add({ days: dayDelta });
        try {
          const next = applyMoveToEvent(
            workingEvent,
            { date: newLastVisible.toString(), minutes: null, displayZone, valid: true },
            'allDay-resize-end',
            policy,
          );
          return { next, mode: 'month-resize-end' };
        } catch {
          return null;
        }
      }
      const newStart = baseStart.add({ days: dayDelta });
      try {
        const next = applyMoveToEvent(
          workingEvent,
          { date: newStart.toString(), minutes: null, displayZone, valid: true },
          'allDay',
          policy,
        );
        return { next, mode: 'month' };
      } catch {
        return null;
      }
    }
    if (isTimedEvent(event)) {
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
        return { next, mode: 'month' };
      } catch {
        return null;
      }
    }
    return null;
  }

  function commitKeyboardDrag(): void {
    const kbd = keyboardDrag.value;
    if (!kbd) return;
    const tz = toValue(opts.timezone);
    if (opts.canDrop) {
      const target = targetFromNext(kbd.next, tz);
      if (!opts.canDrop(kbd.event, target)) {
        // Invalid: clear preview without firing onEventDrop.
        keyboardDrag.value = null;
        return;
      }
    }
    // C2 — kbd.next produced by applyMoveToEvent on each arrow press
    // (fresh policy read each time). Fire ONCE per commit; payload
    // shape matches buildDropPayload's output.
    const payload: MonthEventDropPayload = {
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
    // NOTE: when the moved pill lands in a cell that's already
    // overflowing (scroll area), focus may be lost — no DOM node
    // visible to refocus. Acceptable for now; the proper fix is
    // to ensure the focused / moved event is always part of the
    // visible-pill slice.
    const eventId = kbd.event.id;
    nextTick(() => {
      const el = document.querySelector(
        `[data-event-id="${CSS.escape(eventId)}"]`,
      );
      if (el instanceof HTMLElement) el.focus();
    });
  }

  /**
   * Keyboard-driven move for month-view events. Pfeil-Tasten
   * staging a preview without committing; Enter commits the
   * accumulated preview; Escape cancels. Mirrors mouse-drag UX.
   *
   * Up / Down jump one full week-row; Left / Right step a single
   * day. Shift + Arrow grows / shrinks the end date for multi-day
   * all-day events.
   */
  function onMonthEventKeydown(e: KeyboardEvent, event: CalendarEvent): void {
    // Esc cancels an in-flight kbd drag, otherwise blurs.
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
    // Enter commits an in-flight kbd drag.
    if (e.key === 'Enter') {
      if (!keyboardDrag.value) return;
      e.preventDefault();
      commitKeyboardDrag();
      return;
    }
    if (
      e.key !== 'ArrowLeft' &&
      e.key !== 'ArrowRight' &&
      e.key !== 'ArrowUp' &&
      e.key !== 'ArrowDown'
    ) {
      return;
    }
    const base: MoveResult = keyboardDrag.value
      ? keyboardDrag.value.next
      : ({
          start: event.start,
          ...(event.end ? { end: event.end } : {}),
        } as MoveResult);
    const result = deriveNextFromArrow(base, event, e);
    if (!result) {
      // Phase 8.13-CG: rejection (DST gap with policy='reject', or
      // unsupported key combination) — announce so SR users hear it.
      opts.onAnnounce?.('cancelled');
      return;
    }
    e.preventDefault();
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
    // pill / bar was unmounted (replaced by a synthetic preview),
    // its DOM node is gone, and focus would otherwise fall to
    // <body> — the next arrow keystroke would be lost. The ghost
    // carries `kbdActive=true` so it's tabbable + has the keydown
    // handler bound; focusing it keeps the state machine reachable.
    nextTick(() => {
      const ghost = document.querySelector<HTMLElement>(
        '.coar-month-pill--ghost[tabindex="0"], .coar-month-bar--ghost[tabindex="0"]',
      );
      if (ghost) ghost.focus({ preventScroll: true });
    });
  }

  return {
    dnd,
    workingEvents,
    dragSourceSnapshot,
    invalidMonthGhost,
    isPreviewId,
    isInvalidPillTarget,
    onMonthEventPointerdown,
    onMonthEventKeydown,
    keyboardDrag,
  };
}
