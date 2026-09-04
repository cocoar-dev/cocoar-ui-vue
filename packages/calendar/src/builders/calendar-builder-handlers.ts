/**
 * Handlers layer of the builder — reactive consumer functions (C7)
 * and the interaction handlers the views fire.
 *
 * Sits between `CalendarBuilderConfig` (state + config setters) and
 * `CalendarBuilder` (api, pipelines). Every setter here stores the
 * function verbatim on `state`; the views read it on every
 * invocation, never capture it at setup.
 */

import type {
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
  MoreClickHandler,
  RangeChangeHandler,
  TimeClickHandler,
  TimeDoubleClickHandler,
} from './types';
import { CalendarBuilderConfig } from './calendar-builder-config';

/** Process-level guard for the onMoreClick dev-warn (once per page). */
let _warnedOnMoreClick = false;

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

  /**
   * `onMoreClick` is wired by month-view's "+N more" overflow
   * surface, which is not yet drawn. The setter is honoured today
   * (handler stored on state, read-on-fire), but the overflow
   * trigger is not implemented in `<CoarMonthView>`. A one-shot
   * dev-warn surfaces the gap so consumers don't ship features that
   * never fire.
   */
  onMoreClick(h: MoreClickHandler<TMeta>): this {
    this.state.onMoreClick = h;
    if (!_warnedOnMoreClick) {
      _warnedOnMoreClick = true;
      if (typeof console !== 'undefined') {
        console.warn(
          '[CalendarBuilder.onMoreClick] handler registered, but the "+N more" overflow surface is not yet wired in <CoarMonthView>. The handler will start firing once month-view overflow ships in Session 3.5+. Until then, this setter is typed-but-dead.',
        );
      }
    }
    return this;
  }

  onRangeChange(h: RangeChangeHandler): this {
    this.state.onRangeChange = h;
    return this;
  }
}
