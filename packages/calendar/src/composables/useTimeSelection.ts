/**
 * `useTimeSelection` — time-range selection on a time grid
 * (`builder.timeRangeSelect`, `builder.hoverIndicator`).
 *
 *   - **Hover** (mouse, hovering pen): the time under the pointer for the
 *     axis marker, and what a click would select (the policy's `'hover'`
 *     answer) for the preview block. Over an event: time only.
 *   - **Mouse press on free space:** a release within `DRAG_THRESHOLD_PX`
 *     is a click — the surface's own click (`onTimeClick`) and then the
 *     policy's `'click'` range; beyond it the press is a drag from the
 *     anchor, its range the policy's `'drag'` answer, reported on release.
 *     Escape cancels without a call. The day stays the one pressed; only
 *     the time axis follows the pointer.
 *   - **Touch / pen press:** scrolling and paging stay native. A tap is a
 *     click (through the surface's tap path), a long press
 *     (`LONG_PRESS_MS` without moving) starts a drag: the surface's own
 *     gesture is released (`onClaim`), scrolling is blocked until the
 *     finger lifts.
 *
 * Locating goes through the grid's `TimedAxisAdapter`, the same one the
 * drag runtime uses, so columns and rows behave alike. Days lie edge to
 * edge on both axes, so the pointer always belongs to the nearest day.
 *
 * Internal — not exported from the package barrel.
 */

import { computed, onBeforeUnmount, shallowRef, toValue, type ComputedRef } from 'vue';
import {
  Temporal,
  busyMinutesOn,
  defaultSelectionPolicy,
  minuteOfDayToZoned,
  snapToSlot,
  type CalendarEvent,
  type MinuteRange,
  type TimeSelectionBusy,
  type TimeSelectionContext,
} from '../core';
import type { CalendarBuilder } from '../builders/calendar-builder';
import type { TimedAxisAdapter } from './useCalendarDnd';
import { afterFollowingClick, TAP_SLOP_PX } from './surfaceTap';
import { originatesFromEvent } from '../components/internal/originatesFromEvent';

/** Mouse travel (px) after which a press is a drag, not a click. */
export const DRAG_THRESHOLD_PX = 4;
/** Touch / pen hold (ms) that starts a selection drag. */
export const LONG_PRESS_MS = 500;

export interface UseTimeSelectionOptions<TMeta extends Record<string, unknown>> {
  builder: CalendarBuilder<TMeta>;
  axis: TimedAxisAdapter;
  /** `[startHour, endHour]` of the rendered range. */
  timeRange: ComputedRef<readonly [number, number]>;
  slotDuration: ComputedRef<number>;
  timezone: ComputedRef<string>;
  /** The live events (not the drag preview). */
  events: () => ReadonlyArray<CalendarEvent<TMeta>>;
  /** A long press took a touch pointer: stop the surface's own gesture on it. */
  onClaim?: (pointerId: number) => void;
}

/** What the grid draws in a day: the hover proposal or the dragged range. */
export interface DaySelection extends MinuteRange {
  phase: 'hover' | 'drag';
}

interface Press {
  pointerId: number;
  touch: boolean;
  date: Temporal.PlainDate;
  anchor: number;
  current: number;
  x: number;
  y: number;
  dragging: boolean;
  /** A long press took the pointer; its tap no longer counts. */
  claimed: boolean;
  down: PointerEvent;
}

export function useTimeSelection<TMeta extends Record<string, unknown>>(
  opts: UseTimeSelectionOptions<TMeta>,
) {
  const state = opts.builder.state;
  const enabled = () => toValue(state.timeRangeSelect);
  const hoverEnabled = () => toValue(state.hoverIndicator);

  const hover = shallowRef<{ date: Temporal.PlainDate; minute: number; onEvent: boolean } | null>(
    null,
  );
  const press = shallowRef<Press | null>(null);

  const bounds = computed<MinuteRange>(() => ({
    start: opts.timeRange.value[0] * 60,
    end: opts.timeRange.value[1] * 60,
  }));

  // Busy minutes per day, recomputed lazily when events or zone change.
  const busyCache = computed(() => {
    opts.events();
    void opts.timezone.value;
    return new Map<string, TimeSelectionBusy<TMeta>[]>();
  });
  function busyFor(date: Temporal.PlainDate): TimeSelectionBusy<TMeta>[] {
    const cache = busyCache.value;
    const key = date.toString();
    let busy = cache.get(key);
    if (!busy) {
      busy = busyMinutesOn(opts.events(), date, opts.timezone.value);
      cache.set(key, busy);
    }
    return busy;
  }

  const fallbackPolicy = defaultSelectionPolicy<TMeta>();
  function ask(
    phase: TimeSelectionContext['phase'],
    date: Temporal.PlainDate,
    minute: number,
    anchorMinute?: number,
  ): MinuteRange | null {
    const policy = state.selectionPolicy ?? fallbackPolicy;
    const range = policy({
      phase,
      date,
      minute,
      anchorMinute,
      slotDuration: opts.slotDuration.value,
      bounds: bounds.value,
      busy: busyFor(date),
    });
    if (!range || !(range.end > range.start)) return null;
    return range;
  }

  /** Minute of the day under a client point, inside the visible range. */
  function clampMinute(minute: number): number {
    const b = bounds.value;
    return Math.min(b.end - 0.001, Math.max(b.start, minute));
  }
  function locate(e: PointerEvent): { date: Temporal.PlainDate; minute: number } | null {
    const loc = opts.axis.locate(e.clientX, e.clientY);
    if (!loc) return null;
    return { date: loc.day, minute: clampMinute(bounds.value.start + loc.minutesFromGridStart) };
  }
  function minuteAlongAxis(e: PointerEvent): number {
    if (opts.axis.minutesAt) {
      return clampMinute(bounds.value.start + opts.axis.minutesAt(e.clientX, e.clientY));
    }
    return locate(e)?.minute ?? press.value?.current ?? bounds.value.start;
  }

  function emit(
    source: 'click' | 'drag',
    date: Temporal.PlainDate,
    range: MinuteRange,
    native: PointerEvent,
  ): void {
    const handler = state.onTimeRangeSelect;
    if (!handler) return;
    const zone = opts.timezone.value;
    const policy = toValue(state.dstPolicy);
    const start = minuteOfDayToZoned(date, range.start, zone, policy);
    const end = minuteOfDayToZoned(date, range.end, zone, policy);
    if (!start || !end) return;
    handler({ date, start, end, source, native });
  }

  // ─── Hover ────────────────────────────────────────────────────────

  /** Bind to the surface's `pointermove` (columns / rows body). */
  function onPointermove(e: PointerEvent): void {
    if (press.value) return;
    if (e.pointerType === 'touch' || (!enabled() && !hoverEnabled())) {
      if (hover.value) hover.value = null;
      return;
    }
    const at = locate(e);
    hover.value = at ? { ...at, onEvent: originatesFromEvent(e) } : null;
  }
  /** Bind to the surface's `pointerleave`. */
  function onPointerleave(): void {
    if (!press.value) hover.value = null;
  }

  // ─── Press ────────────────────────────────────────────────────────

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  function onWindowMove(e: PointerEvent): void {
    const p = press.value;
    if (!p || e.pointerId !== p.pointerId) return;
    if (p.touch && !p.claimed) {
      // Before the long press fired, travel means scroll / swipe.
      if (Math.abs(e.clientX - p.x) > TAP_SLOP_PX || Math.abs(e.clientY - p.y) > TAP_SLOP_PX) {
        end();
      }
      return;
    }
    const current = minuteAlongAxis(e);
    const dragging =
      p.dragging ||
      Math.abs(e.clientX - p.x) > DRAG_THRESHOLD_PX ||
      Math.abs(e.clientY - p.y) > DRAG_THRESHOLD_PX;
    press.value = { ...p, current, dragging };
  }

  function onWindowUp(e: PointerEvent): void {
    const p = press.value;
    if (!p || e.pointerId !== p.pointerId) return;
    end();
    if (p.touch) {
      if (!p.claimed) return; // a tap: the surface's tap path reports it
      const dragged = ask('drag', p.date, p.current, p.anchor);
      const range = dragged ?? ask('click', p.date, p.anchor);
      if (range) afterFollowingClick(() => emit(dragged ? 'drag' : 'click', p.date, range, e));
      return;
    }
    if (p.dragging) {
      const range = ask('drag', p.date, p.current, p.anchor);
      if (range) emit('drag', p.date, range, e);
      return;
    }
    clickSelect(p, p.down);
  }

  function onWindowCancel(e: PointerEvent): void {
    if (press.value && e.pointerId === press.value.pointerId) end();
  }
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && press.value) {
      e.preventDefault();
      end();
    }
  }
  /** No text selection while a mouse press is held. */
  function onSelectstart(e: Event): void {
    e.preventDefault();
  }
  /** After a long press: the finger drags the range, not the page. */
  function onTouchmove(e: TouchEvent): void {
    if (press.value?.claimed && e.cancelable) e.preventDefault();
  }
  function onContextmenu(e: Event): void {
    if (press.value?.touch) e.preventDefault();
  }

  function attach(touch: boolean): void {
    window.addEventListener('pointermove', onWindowMove, true);
    window.addEventListener('pointerup', onWindowUp, true);
    window.addEventListener('pointercancel', onWindowCancel, true);
    window.addEventListener('keydown', onKeydown, true);
    if (touch) {
      window.addEventListener('touchmove', onTouchmove, { capture: true, passive: false });
      window.addEventListener('contextmenu', onContextmenu, true);
    } else {
      window.addEventListener('selectstart', onSelectstart, true);
    }
  }
  function detach(): void {
    window.removeEventListener('pointermove', onWindowMove, true);
    window.removeEventListener('pointerup', onWindowUp, true);
    window.removeEventListener('pointercancel', onWindowCancel, true);
    window.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('touchmove', onTouchmove, true);
    window.removeEventListener('contextmenu', onContextmenu, true);
    window.removeEventListener('selectstart', onSelectstart, true);
  }

  /** End the press without a call (release handled by the caller, Escape, cancel). */
  function end(): void {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    detach();
    press.value = null;
  }

  /** The click semantics of a press: the surface's click, then the policy's range. */
  let surfaceClick: (() => void) | null = null;
  function clickSelect(p: Press, native: PointerEvent): void {
    const click = surfaceClick;
    surfaceClick = null;
    click?.();
    const range = ask('click', p.date, p.anchor);
    if (range) emit('click', p.date, range, native);
  }

  /**
   * Feed a `pointerdown` on free space (not on an event); the day comes
   * from the axis. `click` is the surface's own click (`onTimeClick`).
   *
   * Returns the click for the surface's tap path — unchanged when
   * selection is off, wrapped (+ the policy's range, skipped after a
   * long press) for touch / pen — or `null` when a mouse press now
   * belongs to the selection, which runs `click` itself on release.
   */
  function onSurfacePointerdown(e: PointerEvent, click: () => void): (() => void) | null {
    if (!enabled() || typeof window === 'undefined') return click;
    if (press.value) return null;
    if (e.button !== 0 && e.pointerType !== 'touch') return click;
    const at = locate(e);
    if (!at) return click;
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const p: Press = {
      pointerId: e.pointerId,
      touch,
      date: at.date,
      anchor: at.minute,
      current: at.minute,
      x: e.clientX,
      y: e.clientY,
      dragging: false,
      claimed: false,
      down: e,
    };
    press.value = p;
    hover.value = null;
    attach(touch);
    if (!touch) {
      surfaceClick = click;
      return null;
    }
    // `press` is replaced on every move; the tap closure needs a flag
    // that outlives it.
    const token = { claimed: false };
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      const cur = press.value;
      if (!cur || cur.pointerId !== p.pointerId) return;
      token.claimed = true;
      press.value = { ...cur, claimed: true, dragging: true };
      opts.onClaim?.(p.pointerId);
    }, LONG_PRESS_MS);
    return () => {
      // The tap path runs after release; a long press already reported.
      if (token.claimed) return;
      click();
      const range = ask('click', p.date, p.anchor);
      if (range) emit('click', p.date, range, e);
    };
  }

  onBeforeUnmount(end);

  // ─── What to draw ─────────────────────────────────────────────────

  /** The range being dragged (also right after a long press). */
  const dragSelection = computed<(MinuteRange & { date: Temporal.PlainDate }) | null>(() => {
    const p = press.value;
    if (!p || !p.dragging) return null;
    const range =
      ask('drag', p.date, p.current, p.anchor) ?? (p.touch ? ask('click', p.date, p.anchor) : null);
    return range ? { ...range, date: p.date } : null;
  });

  /** The hover proposal (mouse / pen, not over an event, nothing pressed). */
  const hoverSelection = computed<(MinuteRange & { date: Temporal.PlainDate }) | null>(() => {
    const h = hover.value;
    if (!h || h.onEvent || press.value || !enabled()) return null;
    const range = ask('hover', h.date, h.minute);
    return range ? { ...range, date: h.date } : null;
  });

  function selectionFor(date: Temporal.PlainDate): DaySelection | null {
    const drag = dragSelection.value;
    if (drag)
      return drag.date.equals(date) ? { start: drag.start, end: drag.end, phase: 'drag' } : null;
    const h = hoverSelection.value;
    if (h && h.date.equals(date)) return { start: h.start, end: h.end, phase: 'hover' };
    return null;
  }

  /** Snapped minute of the day under the pointer, for the hover indicator. */
  const hoverMinute = computed<number | null>(() => {
    const h = hover.value;
    if (!h || press.value || !hoverEnabled()) return null;
    const b = bounds.value;
    return Math.min(b.end, Math.max(b.start, snapToSlot(h.minute, opts.slotDuration.value)));
  });

  return {
    onPointermove,
    onPointerleave,
    onSurfacePointerdown,
    selectionFor,
    dragSelection,
    hoverMinute,
    /** A press is being dragged (mouse past the threshold, or after a long press). */
    selecting: computed(() => press.value?.dragging === true),
    cancel: end,
  };
}
