/**
 * `useBoardDnd` — moving events and selecting days on a board.
 *
 * Moves run through the one drop pipeline (`buildDropPayload`, C2).
 * Where a drop lands is `boardDropTarget` in the core; this composable
 * adds the pointer: hit-testing by geometry, because a bar sits above
 * the cells rather than inside one.
 *
 * Internal — not exported from the package barrel.
 */

import { onBeforeUnmount, shallowRef, type Ref } from 'vue';
import {
  Temporal,
  boardDropTarget,
  type BoardLayoutRow,
  type BoardRow,
  type CalendarEvent,
} from '../core';
import { DstResolutionError, buildDropPayload, type DstPolicy } from '../core/dnd/move-math';
import type { CanDropFn, EventDropPayload } from '../builders/types';
import { afterFollowingClick, TAP_SLOP_PX } from './surfaceTap';
import { useCoarDrag } from './useCoarDrag';
import { LONG_PRESS_MS } from './useTimeSelection';

const DRAG_THRESHOLD_PX = 5;

export interface BoardHit {
  rowIndex: number;
  col: number;
}

/** The cell under a point, from the rendered rows; `null` outside them. */
export function hitTestBoard(root: HTMLElement, x: number, y: number): BoardHit | null {
  for (const rowEl of root.querySelectorAll<HTMLElement>('[data-row-index]')) {
    const rect = rowEl.getBoundingClientRect();
    if (y < rect.top || y >= rect.bottom) continue;
    const body = rowEl.querySelector<HTMLElement>('.coar-calendar-board__body');
    const columns = rowEl.querySelectorAll('.coar-calendar-board__cell').length;
    if (!body || columns === 0) return null;
    const bodyRect = body.getBoundingClientRect();
    if (bodyRect.width <= 0 || x < bodyRect.left || x >= bodyRect.right) return null;
    return {
      rowIndex: Number(rowEl.dataset.rowIndex),
      col: Math.floor(((x - bodyRect.left) / bodyRect.width) * columns),
    };
  }
  return null;
}

interface DragData<TMeta extends Record<string, unknown>> {
  event: CalendarEvent<TMeta>;
  row: BoardRow<TMeta>;
  grabOffsetDays: number;
  native: PointerEvent;
}

export interface BoardDropState {
  rowIndex: number;
  col: number;
  valid: boolean;
}

export interface UseBoardDndOptions<TMeta extends Record<string, unknown>> {
  rootEl: Ref<HTMLElement | null>;
  layout: () => ReadonlyArray<BoardLayoutRow<TMeta>>;
  timezone: () => string;
  dstPolicy: () => DstPolicy;
  canDrop: () => CanDropFn<TMeta> | null;
  onDrop: (payload: EventDropPayload<TMeta>) => void;
  onClick: (event: CalendarEvent<TMeta>, native: PointerEvent) => void;
}

export function useBoardDnd<TMeta extends Record<string, unknown>>(
  opts: UseBoardDndOptions<TMeta>,
) {
  const dropState = shallowRef<BoardDropState | null>(null);
  const draggedId = shallowRef<string | null>(null);
  let pending: ReturnType<typeof resolve> = null;

  function resolve(data: DragData<TMeta>, x: number, y: number) {
    const root = opts.rootEl.value;
    const hit = root ? hitTestBoard(root, x, y) : null;
    if (!hit) return null;
    const entry = opts.layout()[hit.rowIndex];
    const date = entry?.cells[hit.col]?.date;
    if (!entry || !date) return null;
    const landed = boardDropTarget({
      event: data.event,
      row: entry.row,
      date,
      sourceRow: data.row,
      grabOffsetDays: data.grabOffsetDays,
      timezone: opts.timezone(),
    });
    if (!landed) return null;
    const displayZone = opts.timezone();
    const canDrop = opts.canDrop();
    const valid = canDrop
      ? canDrop(data.event, {
          date: landed.date,
          minutes: landed.minutes,
          displayZone,
          rowKey: entry.row.key,
        })
      : true;
    return { hit, mode: landed.mode, target: { ...landed, displayZone, valid, rowKey: entry.row.key } };
  }

  function track(data: DragData<TMeta>, x: number, y: number): void {
    pending = resolve(data, x, y);
    draggedId.value = data.event.id;
    dropState.value = pending ? { ...pending.hit, valid: pending.target.valid } : null;
  }

  function clear(): void {
    pending = null;
    draggedId.value = null;
    dropState.value = null;
  }

  function isSamePlace(data: DragData<TMeta>, landed: NonNullable<typeof pending>): boolean {
    if (landed.target.rowKey !== data.row.key) return false;
    const again = boardDropTarget({
      event: data.event,
      row: data.row,
      date: data.event.start instanceof Temporal.PlainDate
        ? data.event.start.add({ days: data.grabOffsetDays })
        : data.event.start
            .withTimeZone(opts.timezone())
            .toPlainDate()
            .add({ days: data.grabOffsetDays }),
      sourceRow: data.row,
      grabOffsetDays: data.grabOffsetDays,
      timezone: opts.timezone(),
    });
    return again?.date === landed.target.date && again?.minutes === landed.target.minutes;
  }

  const drag = useCoarDrag<DragData<TMeta>>({
    surfaceRef: opts.rootEl,
    autoScroll: null,
    dragThreshold: DRAG_THRESHOLD_PX,
    onDragMove: (ctx) => track(ctx.data, ctx.pointer.x, ctx.pointer.y),
    onDragEnd: (ctx) => {
      const { data } = ctx;
      if (!ctx.crossedThreshold) {
        clear();
        if (data.native.pointerType === 'touch' || data.native.pointerType === 'pen') {
          afterFollowingClick(() => opts.onClick(data.event, data.native));
        } else {
          opts.onClick(data.event, data.native);
        }
        return;
      }
      track(data, ctx.pointer.x, ctx.pointer.y);
      const landed = pending;
      clear();
      if (!landed || !landed.target.valid || isSamePlace(data, landed)) return;
      try {
        const payload = buildDropPayload(
          opts.dstPolicy(),
          data.event,
          {
            start: data.event.start,
            ...(data.event.end !== undefined ? { end: data.event.end } : {}),
            displayZone: opts.timezone(),
          },
          { ...landed.target, sourceRowKey: data.row.key },
          landed.mode,
          data.native,
        );
        opts.onDrop(payload as unknown as EventDropPayload<TMeta>);
      } catch (error) {
        // `dstPolicy: 'reject'` on a DST gap: the drop does not happen.
        if (!(error instanceof DstResolutionError)) throw error;
      }
    },
    onDragCancel: clear,
  });

  function onEventPointerdown(
    e: PointerEvent,
    event: CalendarEvent<TMeta>,
    row: BoardRow<TMeta>,
    grabDate: Temporal.PlainDate | null,
  ): void {
    const first =
      event.start instanceof Temporal.PlainDate
        ? event.start
        : event.start.withTimeZone(opts.timezone()).toPlainDate();
    const grabOffsetDays = grabDate ? first.until(grabDate, { largestUnit: 'days' }).days : 0;
    drag.startDrag({ event, row, grabOffsetDays, native: e })(e);
  }

  /** The day of a bar's column under the pointer at the start of a drag. */
  function dayUnderPointer(e: PointerEvent): Temporal.PlainDate | null {
    const root = opts.rootEl.value;
    const hit = root ? hitTestBoard(root, e.clientX, e.clientY) : null;
    return hit ? (opts.layout()[hit.rowIndex]?.cells[hit.col]?.date ?? null) : null;
  }

  return { dropState, draggedId, isDragging: drag.isDragging, onEventPointerdown, dayUnderPointer };
}

// ─── Selecting days ──────────────────────────────────────────────────

export interface BoardRangeSelection {
  rowKey: string;
  /** First and last day, inclusive. */
  start: Temporal.PlainDate;
  end: Temporal.PlainDate;
  native: PointerEvent;
}

export interface BoardSelectionState {
  rowIndex: number;
  fromCol: number;
  toCol: number;
}

export interface UseBoardSelectionOptions<TMeta extends Record<string, unknown>> {
  rootEl: Ref<HTMLElement | null>;
  layout: () => ReadonlyArray<BoardLayoutRow<TMeta>>;
  enabled: () => boolean;
  /** A touch held long enough: the swipe gives the pointer up. */
  onTakePointer: (pointerId: number) => void;
  onDateClick: (date: Temporal.PlainDate, native: PointerEvent) => void;
  onSelect: (selection: BoardRangeSelection) => void;
}

/**
 * Drag across cells of one row to select days: at once with a mouse,
 * after a long press with touch, so a swipe still pages.
 */
export function useBoardSelection<TMeta extends Record<string, unknown>>(
  opts: UseBoardSelectionOptions<TMeta>,
) {
  const selection = shallowRef<BoardSelectionState | null>(null);
  let stopTracking: (() => void) | null = null;

  const blockScroll = (e: Event) => e.preventDefault();

  function reach(rowIndex: number, fromCol: number, toCol: number): number {
    // A selection stops at a column without a day.
    const cells = opts.layout()[rowIndex]?.cells ?? [];
    const step = toCol >= fromCol ? 1 : -1;
    let col = fromCol;
    while (col !== toCol && cells[col + step]?.date) col += step;
    return col;
  }

  function onCellPointerdown(
    e: PointerEvent,
    rowIndex: number,
    col: number,
  ): boolean {
    if (!opts.enabled() || e.button !== 0) return false;
    const date = opts.layout()[rowIndex]?.cells[col]?.date;
    if (!date) return false;
    stopTracking?.();
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const id = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let selecting = !touch;
    let moved = false;
    if (selecting) selection.value = { rowIndex, fromCol: col, toCol: col };

    const timer = touch
      ? setTimeout(() => {
          selecting = true;
          opts.onTakePointer(id);
          selection.value = { rowIndex, fromCol: col, toCol: col };
          document.addEventListener('touchmove', blockScroll, { passive: false });
        }, LONG_PRESS_MS)
      : null;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (Math.abs(ev.clientX - startX) > TAP_SLOP_PX || Math.abs(ev.clientY - startY) > TAP_SLOP_PX) {
        moved = true;
        if (!selecting && timer !== null) clearTimeout(timer);
      }
      if (!selecting) return;
      const root = opts.rootEl.value;
      const hit = root ? hitTestBoard(root, ev.clientX, ev.clientY) : null;
      if (hit?.rowIndex === rowIndex) {
        selection.value = { rowIndex, fromCol: col, toCol: reach(rowIndex, col, hit.col) };
      }
    };
    const stop = () => {
      if (timer !== null) clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      document.removeEventListener('touchmove', blockScroll);
      stopTracking = null;
      selection.value = null;
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      const wasSelecting = selecting;
      const state = selection.value;
      stop();
      if (wasSelecting && state && state.toCol !== state.fromCol) {
        const entry = opts.layout()[rowIndex];
        const a = entry?.cells[Math.min(state.fromCol, state.toCol)]?.date;
        const b = entry?.cells[Math.max(state.fromCol, state.toCol)]?.date;
        if (entry && a && b) opts.onSelect({ rowKey: entry.row.key, start: a, end: b, native: ev });
        return;
      }
      if (moved) return;
      if (touch) afterFollowingClick(() => opts.onDateClick(date, e));
      else opts.onDateClick(date, e);
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId === id) stop();
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') stop();
    };
    stopTracking = stop;
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    return true;
  }

  onBeforeUnmount(() => stopTracking?.());

  return { selection, onCellPointerdown };
}
