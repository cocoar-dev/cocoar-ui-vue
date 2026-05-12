/**
 * Public type surface for the `CalendarBuilder` API.
 *
 * These types are the contract consumers see. Every shape here is
 * pinned by an article-conformance invariant — see C1–C8, sourced from
 * the article series at `tech-articles/DateAndTime/`.
 *
 * The library never accepts ISO strings, native `Date`, floating
 * `Temporal.PlainDateTime`, `Temporal.Instant`, `Temporal.PlainTime`
 * on event start/end — only `Temporal.ZonedDateTime` (timed, carries
 * source IANA zone) or `Temporal.PlainDate` (all-day, zone-less).
 * The boundary is enforced by `validateCalendarEvent` in `core/types.ts`.
 */

import type { Component, VNode } from 'vue';
import type { Temporal } from '../core';
import type {
  AllDayBar,
  CalendarEvent,
  CalendarView,
  MonthCellPill,
  MonthMultiDayBar,
  PositionedEvent,
  ViewWindow,
} from '../core';

// ─── DST policy (C4) ──────────────────────────────────────────────

/**
 * Re-export of `DstPolicy`. Single source of truth lives in
 * `../core/temporal.ts` (audit Session 2, finding #14 closure: three
 * identical declarations across files were a drift hazard). Re-
 * exported here so consumers can `import { DstPolicy } from '@cocoar/vue-calendar'`
 * without a deep path.
 *
 * Semantics (Article 5 — "you need to decide, and your code needs to
 * handle it explicitly"):
 *   - `'compatible'` — gaps shift forward; overlaps pick earlier.
 *   - `'reject'`     — throw on gap (drop suppressed by the pipeline).
 *   - `'earlier'`    — pick earlier in an overlap.
 *   - `'later'`      — pick later in an overlap.
 */
export type { DstPolicy } from '../core/temporal';

// ─── Loader ───────────────────────────────────────────────────────

/**
 * Calendar-managed events loader. The calendar calls this whenever
 * the visible window changes and caches results per-window so
 * navigating back to a previously-seen window doesn't re-fetch.
 *
 * Mutually exclusive with `events()`: setting one drops the other.
 */
export type EventsLoader<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = (window: ViewWindow) =>
  | CalendarEvent<TMeta>[]
  | Promise<CalendarEvent<TMeta>[]>;

// ─── Recurring series loader ──────────────────────────────────────

import type { RecurringSeries } from '../core/types';

/**
 * Calendar-managed recurring-series loader. Called whenever the
 * visible window changes; results are expanded by the configured
 * recurrence engine and cached per-window. Apps that fetch series
 * from a backend per-range use this; apps with a fixed-in-memory
 * series array use `builder.series(...)` instead.
 *
 * Mutually exclusive with `series()`: setting one drops the other.
 *
 * Composes with `events()` / `eventsLoader()` — the calendar merges
 * non-recurring events with the expanded recurring occurrences in
 * `getVisibleEvents()`.
 */
export type SeriesLoader<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = (window: ViewWindow) =>
  | RecurringSeries<TMeta>[]
  | Promise<RecurringSeries<TMeta>[]>;

// ─── Renderers ────────────────────────────────────────────────────

/** Layout payload passed to a renderer alongside the event itself.
 *  C8 variant discriminators match the layout-class names used by
 *  the views: `positioned` (time-grid timed event), `allDayBar`
 *  (time-grid all-day strip), `monthPill` (single-day month cell),
 *  `monthBar` (multi-day month bar). */
export type EventLayoutCtx<TMeta extends Record<string, unknown> = Record<string, unknown>> =
  | { kind: 'positioned'; layout: PositionedEvent<TMeta> }
  | { kind: 'allDayBar'; layout: AllDayBar<TMeta> }
  | { kind: 'monthBar'; layout: MonthMultiDayBar<TMeta> }
  | { kind: 'monthPill'; layout: MonthCellPill<TMeta> };

export interface EventRendererCtx<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  event: CalendarEvent<TMeta>;
  view: CalendarView;
  /** Present for variant-specific layouts; absent for the universal
   *  `eventRenderer` fallback that fires across all views. */
  layout?: EventLayoutCtx<TMeta>;
}

/**
 * Renderer for an event. Three forms supported by the same setter:
 *   - a Vue component → instantiated for every event with
 *     `EventRendererCtx` flowing through props;
 *   - a function returning a component → choose component per event
 *     (e.g. by `event.meta.type`);
 *   - a function returning a VNode → fully custom render.
 *
 * Slot priority: a `<template #event>` slot on `<CoarCalendar>`
 * overrides the builder renderer (Vue convention).
 */
export type EventRenderer<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> =
  | Component
  | ((ctx: EventRendererCtx<TMeta>) => Component | VNode);

/** Renderer for a per-day column header (week / month). */
export type DayHeaderRenderer =
  | Component
  | ((ctx: {
      date: Temporal.PlainDate;
      isToday: boolean;
      isWeekend: boolean;
    }) => Component | VNode);

// ─── Handlers ─────────────────────────────────────────────────────

export type EventClickHandler<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = (payload: { event: CalendarEvent<TMeta>; native: PointerEvent }) => void;

export type EventDoubleClickHandler<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = (payload: { event: CalendarEvent<TMeta>; native: MouseEvent }) => void;

/**
 * Fired on `pointerenter` over an event element in any view.
 *
 * The classic use is wiring `useOverlay()` (from `@cocoar/vue-ui`)
 * to show a popover anchored at the event's DOM element —
 * `native.currentTarget` is the event-element node and can be passed
 * directly as the overlay anchor. The library deliberately does NOT
 * apply hover delay / debouncing; consumers wanting a "hover for
 * 200 ms before opening" pattern wrap the handler themselves.
 *
 * For touch / pen pointers, `pointerenter` fires on the press, not
 * on a sustained hover — so this handler doubles as a long-press
 * surface on tablets if paired with a delay.
 */
export type EventHoverHandler<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = (payload: { event: CalendarEvent<TMeta>; native: PointerEvent }) => void;

/**
 * Fired on `pointerleave` from an event element. Companion to
 * `EventHoverHandler` — consumers typically close their popover here.
 */
export type EventHoverLeaveHandler<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = (payload: { event: CalendarEvent<TMeta>; native: PointerEvent }) => void;

/**
 * Drop payload — the result of a successful drag/resize/keyboard
 * operation, after `applyMoveToEvent` resolved the new endpoints
 * against the active `DstPolicy`.
 *
 * Three invariants are enforced by the type:
 *
 *   - **C3 — source zone preserved per-endpoint.** `next.start` and
 *     `next.end` carry their own `timeZoneId` independently.
 *     Cross-zone events (e.g. Tokyo → Vienna flight) keep both ends
 *     in their original zones unless the user moved that specific
 *     endpoint — in which case the moved endpoint is reported in ITS
 *     OWN source zone, never collapsed to the display zone.
 *
 *   - **C5 — display zone vs source zone are separate.**
 *     `original.displayZone` and `target.displayZone` capture the zone
 *     the user's eyes saw at drag-start and at drop. They may differ
 *     (mid-drag `.timezone()` toggle). `next.start.timeZoneId`
 *     captures source zone — the article-4 "store intent" value.
 *
 *   - **C4 — DST disambiguation is reported.**
 *     `target.disambiguation` is `'gap'` if the wall-time landed in a
 *     spring-forward gap, `'overlap'` for a fall-back overlap, `null`
 *     for clean drops. Resolution is governed by the active policy.
 */
export interface EventDropPayload<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  event: CalendarEvent<TMeta>;
  original: {
    /** Source zone preserved (C3) — pre-drag value. */
    start: Temporal.ZonedDateTime | Temporal.PlainDate;
    /** Source zone preserved (C3) — pre-drag value, may differ from
     *  `start.timeZoneId` for cross-zone events. */
    end?: Temporal.ZonedDateTime | Temporal.PlainDate;
    /** Display zone snapshotted at drag-start (C5). */
    displayZone: string;
  };
  next: {
    /** Source zone preserved per-endpoint (C3). */
    start: Temporal.ZonedDateTime | Temporal.PlainDate;
    /** Source zone preserved per-endpoint (C3). */
    end?: Temporal.ZonedDateTime | Temporal.PlainDate;
  };
  target: {
    /** ISO date of the day the user dropped on, IN THE DISPLAY ZONE. */
    date: string;
    /** Minute-of-day in the display zone, or `null` for all-day /
     *  month-cell drops. */
    minutes: number | null;
    /** The display zone the calendar was rendering in at drop time
     *  (C5). May differ from `original.displayZone` if the user
     *  toggled timezone mid-drag. */
    displayZone: string;
    /** DST disambiguation outcome (C4). `null` for clean drops. */
    disambiguation: 'gap' | 'overlap' | null;
  };
  native: PointerEvent | null;
}

export type EventDropHandler<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = (payload: EventDropPayload<TMeta>) => void;

export type DateClickHandler = (payload: {
  date: Temporal.PlainDate;
  native: PointerEvent;
}) => void;

export type TimeClickHandler = (payload: {
  date: Temporal.PlainDate;
  time: Temporal.PlainTime;
  native: PointerEvent;
}) => void;

export type MoreClickHandler<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = (payload: {
  date: Temporal.PlainDate;
  events: CalendarEvent<TMeta>[];
  native: PointerEvent;
}) => void;

export type RangeChangeHandler = (window: ViewWindow) => void;

// ─── Drop validator (C7: read on every check, never captured) ─────

/**
 * Drop-target context handed to `canDrop` validators.
 *
 * `displayZone` was added in Session 2 (audit finding #8 closure):
 * without it, consumers writing rules like "no drops in business
 * hours of the user's local zone" had to close over `state.timezone`
 * separately — works because of C7 but hides which zone the
 * `date+minutes` is anchored in. Now explicit.
 */
export interface CanDropTarget {
  /** ISO date `'YYYY-MM-DD'` of the drop slot, IN THE DISPLAY ZONE. */
  date: string;
  /** Minute-of-day in the display zone, or `null` for all-day /
   *  month-cell drops. */
  minutes: number | null;
  /** The display zone the calendar was rendering in when the
   *  hit-test fired. */
  displayZone: string;
}

export type CanDropFn<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> = (event: CalendarEvent<TMeta>, target: CanDropTarget) => boolean;

// ─── Builder configuration shapes ─────────────────────────────────

/** Visual density. */
export type CalendarDensity = 'compact' | 'comfortable' | 'spacious';

/** Time-grid time range. Both bounds are minute-of-day, inclusive. */
export interface TimeRange {
  /** Minute-of-day, inclusive (e.g. `0` for midnight, `6 * 60` for 06:00). */
  startMinutes: number;
  /** Minute-of-day, inclusive (e.g. `22 * 60` for 22:00). */
  endMinutes: number;
}
