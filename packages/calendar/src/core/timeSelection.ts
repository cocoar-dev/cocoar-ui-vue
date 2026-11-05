/**
 * Time-range selection on the time grids (`builder.timeRangeSelect`):
 * the policy contract and the helpers to write one.
 *
 * The calendar owns the interaction (hover, click, drag, long press)
 * and the drawing; WHAT a pointer position selects is the policy's
 * call. A policy is a pure function in **minutes of the day** (wall
 * time in the display zone, `0` = midnight, `1440` = the next
 * midnight), so it reads and tests like plain arithmetic:
 *
 * ```ts
 * builder.selectionPolicy(gapOrDurationPolicy({ minutes: 60 }));
 * ```
 *
 * The calendar turns the policy's minutes into `ZonedDateTime`s for
 * `onTimeRangeSelect` (`minuteOfDayToZoned`).
 */

import { Temporal } from './temporal';
import type { CalendarEvent } from './types';
import { layoutDayEvents } from './timeGridLayout';
import type { DstPolicy } from './temporal';

/** A range in minutes of the day, end exclusive. */
export interface MinuteRange {
  start: number;
  end: number;
}

/** A timed event of the day, projected to minutes of the day. */
export interface TimeSelectionBusy<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  start: number;
  end: number;
  event: CalendarEvent<TMeta>;
}

/** What a policy gets for one pointer position. */
export interface TimeSelectionContext<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * `'hover'`: what a click would select (drawn under a mouse);
   * `'click'`: the click / tap itself; `'drag'`: a range being dragged
   * from `anchorMinute` to `minute`.
   */
  phase: 'hover' | 'click' | 'drag';
  /** The day of the selection (the day pressed, while dragging). */
  date: Temporal.PlainDate;
  /** Minute of the day under the pointer, unsnapped. */
  minute: number;
  /** `'drag'` only: minute of the day where the press started, unsnapped. */
  anchorMinute?: number;
  /** `builder.slotDuration()`, minutes. */
  slotDuration: number;
  /** The visible time range of the day (`builder.timeRange()`), minutes of the day. */
  bounds: MinuteRange;
  /** The day's timed events, sorted by start, clipped to the day. */
  busy: ReadonlyArray<TimeSelectionBusy<TMeta>>;
}

/**
 * Decides what a pointer position selects: a range in minutes of the
 * day, or `null` for nothing (nothing drawn, no hook).
 */
export type TimeSelectionPolicy<TMeta extends Record<string, unknown> = Record<string, unknown>> = (
  ctx: TimeSelectionContext<TMeta>,
) => MinuteRange | null;

const DAY_MINUTES = 24 * 60;
const FULL_DAY: MinuteRange = { start: 0, end: DAY_MINUTES };

/** `minute` rounded to the nearest multiple of `slot`. */
export function snapToSlot(minute: number, slot: number): number {
  if (slot <= 0) return minute;
  return Math.round(minute / slot) * slot;
}

function clamp(value: number, range: MinuteRange): number {
  return Math.min(range.end, Math.max(range.start, value));
}

/**
 * The timed events of `day`, as minutes of that day in `timezone`
 * (multi-day events clipped at midnight), sorted by start. All-day
 * events are not busy time.
 */
export function busyMinutesOn<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  events: ReadonlyArray<CalendarEvent<TMeta>>,
  day: Temporal.PlainDate,
  timezone: string,
): TimeSelectionBusy<TMeta>[] {
  return layoutDayEvents(events, { day, timeRange: [0, 24], timezone })
    .map((p) => ({ start: p.startMinutes, end: p.endMinutes, event: p.event }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * The free range around `minute`: from the end of the event before it
 * (else `bounds.start`) to the start of the next one (else
 * `bounds.end`). `null` when `minute` lies inside an event.
 */
export function freeRangeAt(
  busy: ReadonlyArray<MinuteRange>,
  minute: number,
  bounds: MinuteRange = FULL_DAY,
): MinuteRange | null {
  const m = clamp(minute, bounds);
  let start = bounds.start;
  let end = bounds.end;
  for (const b of busy) {
    if (b.end <= b.start) continue;
    if (m >= b.start && m < b.end) return null;
    if (b.end <= m) start = Math.max(start, b.end);
    else end = Math.min(end, b.start);
  }
  return end > start ? { start, end } : null;
}

/**
 * The calendar's default policy. Hover / click: the slot under the
 * pointer (the same slot `onTimeClick` reports). Drag: both ends
 * snapped to the slot grid, events ignored.
 */
export function defaultSelectionPolicy<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>(): TimeSelectionPolicy<TMeta> {
  return (ctx) => {
    const slot = ctx.slotDuration;
    if (ctx.phase === 'drag') {
      const a = clamp(snapToSlot(ctx.anchorMinute ?? ctx.minute, slot), ctx.bounds);
      const c = clamp(snapToSlot(ctx.minute, slot), ctx.bounds);
      const range = { start: Math.min(a, c), end: Math.max(a, c) };
      return range.end > range.start ? range : null;
    }
    const start = clamp(Math.floor(ctx.minute / slot) * slot, ctx.bounds);
    const end = Math.min(ctx.bounds.end, start + slot);
    return end > start ? { start, end } : null;
  };
}

export interface GapOrDurationPolicyOptions {
  /** Length of a click selection where no gap applies, minutes. */
  minutes: number;
  /**
   * `false` (default): a selection never covers an event — clicks on
   * an event select nothing, drags stop at the neighbouring events.
   * `true`: events are ignored (`minutes` from the pointer, drags
   * anywhere).
   */
  overlap?: boolean;
}

/**
 * Booking-style policy:
 *
 * - **Hover / click between two events:** the whole gap.
 * - **Otherwise:** `minutes` from the pointer's time rounded to the
 *   slot grid, at most up to the next event. A start less than one
 *   slot after an event's end joins that end directly.
 * - **On an event:** nothing.
 * - **Drag:** both ends snapped to the slot grid, limited to the free
 *   range around where the press started.
 *
 * With `overlap: true` events are ignored: `minutes` from the rounded
 * time, drags as in `defaultSelectionPolicy`.
 */
export function gapOrDurationPolicy<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>(options: GapOrDurationPolicyOptions): TimeSelectionPolicy<TMeta> {
  const length = Math.max(1, options.minutes);
  const fallback = defaultSelectionPolicy<TMeta>();
  return (ctx) => {
    const slot = ctx.slotDuration;
    const bounds = ctx.bounds;
    if (options.overlap) {
      if (ctx.phase === 'drag') return fallback(ctx);
      let start = clamp(snapToSlot(ctx.minute, slot), bounds);
      if (start >= bounds.end) start = clamp(Math.floor(ctx.minute / slot) * slot, bounds);
      const end = Math.min(bounds.end, start + length);
      return end > start ? { start, end } : null;
    }

    if (ctx.phase === 'drag') {
      const anchor = ctx.anchorMinute ?? ctx.minute;
      const free = freeRangeAt(ctx.busy, anchor, bounds);
      if (!free) return null;
      const a = clamp(snapToSlot(anchor, slot), free);
      const c = clamp(snapToSlot(ctx.minute, slot), free);
      const range = { start: Math.min(a, c), end: Math.max(a, c) };
      return range.end > range.start ? range : null;
    }

    const free = freeRangeAt(ctx.busy, ctx.minute, bounds);
    if (!free) return null;
    // Between two events: the whole gap.
    const afterEvent = ctx.busy.some((b) => b.end === free.start);
    const beforeEvent = ctx.busy.some((b) => b.start === free.end);
    if (afterEvent && beforeEvent) return free;
    // Otherwise `length` from the rounded time; rounding up into the
    // next event falls back to rounding down.
    let start = snapToSlot(ctx.minute, slot);
    if (start >= free.end) start = Math.floor(ctx.minute / slot) * slot;
    start = Math.max(free.start, start);
    // Less than one slot after an event: join it.
    if (afterEvent && start - free.start < slot) start = free.start;
    const end = Math.min(free.end, start + length);
    return end > start ? { start, end } : null;
  };
}

/**
 * `minute` of `date` as a `ZonedDateTime` in `timezone` (`1440` = the
 * next midnight). Wall times in a spring-forward gap resolve by
 * `dstPolicy`; `'reject'` returns `null` there.
 */
export function minuteOfDayToZoned(
  date: Temporal.PlainDate,
  minute: number,
  timezone: string,
  dstPolicy: DstPolicy = 'compatible',
): Temporal.ZonedDateTime | null {
  const whole = Math.round(minute);
  const day = whole >= DAY_MINUTES ? date.add({ days: Math.floor(whole / DAY_MINUTES) }) : date;
  const m = whole >= DAY_MINUTES ? whole % DAY_MINUTES : Math.max(0, whole);
  const wall = day.toPlainDateTime(
    Temporal.PlainTime.from({ hour: Math.floor(m / 60), minute: m % 60 }),
  );
  try {
    return wall.toZonedDateTime(timezone, { disambiguation: dstPolicy });
  } catch {
    return null;
  }
}
