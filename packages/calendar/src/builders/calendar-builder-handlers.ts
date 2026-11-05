/**
 * Handlers layer of the builder — reactive consumer functions (C7)
 * and the interaction handlers the views fire.
 *
 * Sits between `CalendarBuilderConfig` (state + config setters) and
 * `CalendarBuilder` (api, pipelines). Every setter here stores the
 * function verbatim on `state`; the views read it on every
 * invocation, never capture it at setup.
 */

import type { TimeSelectionPolicy } from '../core';
import type {
  BackgroundsFn,
  CanDropFn,
  DateClickHandler,
  DateDoubleClickHandler,
  DayHeaderRenderer,
  EventClickHandler,
  EventDoubleClickHandler,
  EventDropHandler,
  EventHoverHandler,
  EventHoverLeaveHandler,
  EventRenderer,
  RangeChangeHandler,
  TimeClickHandler,
  TimeDoubleClickHandler,
  TimeRangeSelectHandler,
} from './types';
import { CalendarBuilderConfig } from './calendar-builder-config';

export abstract class CalendarBuilderHandlers<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> extends CalendarBuilderConfig<TMeta> {
  // ─── Reactive functions (C7) ───────────────────────────────

  /**
   * Drop validator. Read on EVERY hit-test (C7 + D4 — no library-
   * side memoization). If you do expensive work in here, memoize
   * client-side; the library reading fresh state is the correct
   * behaviour and intentionally not cached.
   *
   * @example
   * ```ts
   * // Consumer-side memoization for expensive checks:
   * const memoized = computed(() => {
   *   const rules = expensivelyCompiledRules.value;
   *   return (event, target) => rules.matches(event, target);
   * });
   * builder.canDrop(memoized.value);
   * ```
   */
  canDrop(fn: CanDropFn<TMeta>): this {
    this.state.canDrop = fn;
    return this;
  }

  eventRenderer(r: EventRenderer<TMeta>): this {
    this.state.eventRenderer = r;
    return this;
  }

  dayHeaderRenderer(r: DayHeaderRenderer): this {
    this.state.dayHeaderRenderer = r;
    return this;
  }

  /**
   * What hover, click and drag select (`timeRangeSelect`): a function
   * of the pointer's minute of the day, the day's events and the slot
   * grid that returns a range in minutes, or `null` for nothing. Read
   * on every pointer move (C7). Default `defaultSelectionPolicy()`;
   * `gapOrDurationPolicy({ minutes: 60 })` selects the gap between two
   * events or an hour.
   */
  selectionPolicy(policy: TimeSelectionPolicy<TMeta>): this {
    this.state.selectionPolicy = policy;
    return this;
  }

  /**
   * Background bands per day on week / work week / day: ranges
   * (`tint`, `hatch`, `outline`; behind or above the events) and lines
   * at a time — working hours, opening hours, limits. Called for every
   * visible day on render (C7); return `[]` or `null` for none.
   * Bands never take pointer events.
   */
  backgrounds(fn: BackgroundsFn): this {
    this.state.backgrounds = fn;
    return this;
  }

  // ─── Handlers ──────────────────────────────────────────────

  onEventClick(h: EventClickHandler<TMeta>): this {
    this.state.onEventClick = h;
    return this;
  }

  onEventDoubleClick(h: EventDoubleClickHandler<TMeta>): this {
    this.state.onEventDoubleClick = h;
    return this;
  }

  /**
   * Fires on `pointerenter` over an event element in any view.
   * Pair with `useOverlay()` (from `@cocoar/vue-ui`) to anchor a
   * popover at `payload.native.currentTarget`. The library does
   * NOT apply hover delay — consumer wraps the handler if a delay
   * is wanted.
   */
  onEventHover(h: EventHoverHandler<TMeta>): this {
    this.state.onEventHover = h;
    return this;
  }

  /** Companion to `onEventHover` — fires on `pointerleave`. */
  onEventHoverLeave(h: EventHoverLeaveHandler<TMeta>): this {
    this.state.onEventHoverLeave = h;
    return this;
  }

  onEventDrop(h: EventDropHandler<TMeta>): this {
    this.state.onEventDrop = h;
    return this;
  }

  onDateClick(h: DateClickHandler): this {
    this.state.onDateClick = h;
    return this;
  }

  onTimeClick(h: TimeClickHandler): this {
    this.state.onTimeClick = h;
    return this;
  }

  /**
   * Double-click on an empty day cell (month grid, all-day band).
   * Desktop "double-click creates" convention; the single-click
   * handlers keep firing for the two clicks that precede it, so a
   * host that selects on click and creates on double-click needs no
   * timer of its own.
   */
  onDateDoubleClick(h: DateDoubleClickHandler): this {
    this.state.onDateDoubleClick = h;
    return this;
  }

  /** Double-click on an empty time slot (week / work-week / day). */
  onTimeDoubleClick(h: TimeDoubleClickHandler): this {
    this.state.onTimeDoubleClick = h;
    return this;
  }

  onRangeChange(h: RangeChangeHandler): this {
    this.state.onRangeChange = h;
    return this;
  }

  /**
   * A time range was selected (`timeRangeSelect`): by a drag, or by a
   * click / tap taking the policy's proposal. A click fires
   * `onTimeClick` first, then this; a drag fires only this. Escape
   * during a drag cancels without a call.
   */
  onTimeRangeSelect(h: TimeRangeSelectHandler): this {
    this.state.onTimeRangeSelect = h;
    return this;
  }
}
