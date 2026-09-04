/**
 * Configuration layer of the builder — every setter that only
 * writes `state` (universal config, navigation refs, view-specific
 * knobs, sources, engine).
 *
 * The builder is ONE class from the consumer's point of view
 * (`CalendarBuilder`); it is implemented as a chain of layers by
 * concern so each file stays readable:
 *
 *   CalendarBuilderConfig   — this file: state + config setters
 *   CalendarBuilderHandlers — renderers + event handlers
 *   CalendarBuilder         — api, navigation, pipelines, watchers
 *
 * Setters that touch the loader / series pipelines (`events`,
 * `eventsLoader`, `series`, `seriesLoader`, `recurrenceEngine`) go
 * through the abstract hooks below; the top layer owns the pipelines.
 * Imports flow one way — this layer knows nothing about `CalendarBuilder`.
 */

import type { MaybeRefOrGetter, Ref } from 'vue';
import { toValue } from 'vue';
import type {
  AllDayBandMode,
  CalendarDayMode,
  CalendarEvent,
  CalendarMonthDensity,
  CalendarView,
  DayOfWeek,
  EventTextContrastPolicy,
  RecurringSeries,
  Temporal,
  TimeGridRangeSpec,
} from '../core';
import type { CalendarDensity, DstPolicy, EventsLoader, SeriesLoader, TimeRange } from './types';
import type { RecurrenceEngine } from '../recurrence/types';
import type { CalendarBuilderState } from './calendar-builder-state';
import { asWritableRef } from './internal/window-utils';

export abstract class CalendarBuilderConfig<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Reactive state — single source of truth (C7 read site). */
  readonly state: CalendarBuilderState<TMeta>;

  protected constructor(state: CalendarBuilderState<TMeta>) {
    this.state = state;
  }

  // ─── Hooks implemented by the top layer ────────────────────────
  /** C1 boundary validation (memoized per event object). Throws on the first bad event. */
  protected abstract _validateEvents(events: ReadonlyArray<CalendarEvent<TMeta>>): void;
  /** The loader source changed — its cache is stale. */
  protected abstract _resetLoaderCache(): void;
  /** The series source changed — drop the series cache; `rerun` re-expands the current window. */
  protected abstract _invalidateSeries(rerun: boolean): void;
  /** The recurrence engine changed — forget the resolved instance and re-expand. */
  protected abstract _resetRecurrenceEngine(): void;

  // ─── Universal config (C1, C5, C6, C4) ───────────────────────
  /**
   * Bind the event source. Mutually exclusive with `eventsLoader()` —
   * clears a previously-set loader and its cache. Only
   * `Temporal.ZonedDateTime` (timed) / `Temporal.PlainDate` (all-day)
   * are accepted on start/end; anything else throws (C1).
   */
  events(source: MaybeRefOrGetter<CalendarEvent<TMeta>[]>): this {
    this.state.events = source;
    if (this.state.eventsLoader !== null) {
      this.state.eventsLoader = null;
      this._resetLoaderCache();
    }
    // Sync validation at the call site so consumers see invalid
    // shapes IMMEDIATELY (not after the next render flush via the
    // watcher). Throws bubble to whoever called `.events(...)`, which
    // is the consumer's setup code — exactly where they want the error.
    const initial = toValue(source);
    if (initial) this._validateEvents(initial);
    return this;
  }

  /**
   * Bind a calendar-managed loader, called per visible-window change
   * and cached per `(view, timezone, start, end)`. Mutually exclusive
   * with `events()`.
   */
  eventsLoader(loader: EventsLoader<TMeta>): this {
    this.state.eventsLoader = loader;
    if (this.state.events !== null) {
      this.state.events = null;
    }
    // New loader → cache is stale.
    this._resetLoaderCache();
    return this;
  }

  /**
   * Phase 4 — bind a recurring-series source. Reactive: expansion
   * re-runs whenever the source or the visible range changes.
   * Composes with `events()` / `eventsLoader()` (merged in
   * `getVisibleEvents()`); mutually exclusive with `seriesLoader()`.
   * Uses `recurrenceEngine()` if set, else the lazy default; the
   * `dstPolicy()` applies to every expanded occurrence.
   */
  series(source: MaybeRefOrGetter<RecurringSeries<TMeta>[]>): this {
    this.state.series = source;
    if (this.state.seriesLoader !== null) {
      this.state.seriesLoader = null;
    }
    // The reactive series watcher (top layer) fires post-flush and
    // triggers expansion. Deliberately NO re-run here — the watcher is
    // the single trigger point for source-induced expansion.
    this._invalidateSeries(false);
    return this;
  }

  /**
   * Phase 4 — bind a calendar-managed recurring-series loader.
   * Called per visible-range change; results expanded by the
   * configured engine and cached per-window. Mutually exclusive with
   * `series()`.
   */
  seriesLoader(loader: SeriesLoader<TMeta>): this {
    this.state.seriesLoader = loader;
    if (this.state.series !== null) {
      this.state.series = null;
    }
    this._invalidateSeries(true);
    return this;
  }

  /** C5 — Display zone (IANA). Source zones on individual events
   *  remain independent and per-endpoint preserved (C3). */
  timezone(tz: MaybeRefOrGetter<string>): this {
    this.state.timezone = tz;
    return this;
  }

  locale(loc: MaybeRefOrGetter<string>): this {
    this.state.locale = loc;
    return this;
  }

  firstDayOfWeek(d: MaybeRefOrGetter<DayOfWeek>): this {
    this.state.firstDayOfWeek = d;
    return this;
  }

  /**
   * Working-day set for the `'workWeek'` view. 0 = Sun … 6 = Sat.
   * Default is Mon–Fri. Reactive — changing it while a workWeek
   * view is active reflows the rendered columns.
   */
  workDays(d: MaybeRefOrGetter<readonly DayOfWeek[]>): this {
    this.state.workDays = d;
    return this;
  }

  /** Tint Saturday and Sunday cells in month views. */
  shadeWeekends(enabled: MaybeRefOrGetter<boolean>): this {
    this.state.shadeWeekends = enabled;
    return this;
  }

  /**
   * Contrast policy for the automatic black/white text on event
   * surfaces: `'wcag'` (WCAG 2 ratio, default) or `'apca'` (WCAG 3
   * draft; picks white on saturated mid-tones like `#e03131` where
   * WCAG 2 narrowly picks black). A per-event `meta.textColor` wins
   * over either policy.
   */
  eventTextContrast(policy: MaybeRefOrGetter<EventTextContrastPolicy>): this {
    this.state.eventTextContrast = policy;
    return this;
  }

  /**
   * Cap the all-day band (week / work-week / day) at `n` lanes —
   * default 3, like the system calendar. Beyond that, the last
   * visible lane carries per-day "+N" markers; a click expands the
   * band, a collapse control folds it back. `null` shows every lane.
   */
  allDayMaxVisibleLanes(n: MaybeRefOrGetter<number | null>): this {
    this.state.allDayMaxVisibleLanes = n;
    return this;
  }

  /**
   * Unobscured width (px) below which an overlapped Day / Week card
   * switches to the compact anatomy — one end-truncated title line, no
   * location, no time. Default 112 like iOS; `0` disables the switch.
   */
  timedEventDetailMinWidth(px: MaybeRefOrGetter<number>): this {
    this.state.timedEventDetailMinWidth = px;
    return this;
  }

  /**
   * How much height the all-day band claims (the hour axis starts
   * below it, so every height change moves the whole grid):
   * `'fitsContent'` (default) follows the content, `'alwaysOneLane'`
   * removes the 0↔1 jump, `'reservesCap'` is always
   * `allDayMaxVisibleLanes` tall so the axis never moves between days.
   */
  allDayBandMode(mode: MaybeRefOrGetter<AllDayBandMode>): this {
    this.state.allDayBandMode = mode;
    return this;
  }

  /**
   * Touch paging on week / work-week / day: a horizontal pan moves the
   * grid with the finger and pages on release past a quarter of the
   * width or on a fast flick. A touch that never moves is a tap and
   * reaches `onTimeClick` on release; mouse and pen are unchanged.
   * Default on; honours `prefers-reduced-motion`.
   */
  swipeNavigation(enabled: MaybeRefOrGetter<boolean>): this {
    this.state.swipeNavigation = enabled;
    return this;
  }

  /**
   * Warm the caches for the previous / next time-grid page so the
   * neighbour pages drawn during a swipe carry their events. Default
   * on; one extra fetch per neighbour in loader mode.
   */
  prefetchNeighbours(enabled: MaybeRefOrGetter<boolean>): this {
    this.state.prefetchNeighbours = enabled;
    return this;
  }

  density(d: MaybeRefOrGetter<CalendarDensity>): this {
    this.state.density = d;
    return this;
  }

  monthDensity(density: MaybeRefOrGetter<CalendarMonthDensity>): this {
    this.state.monthDensity = density;
    return this;
  }

  dayMode(mode: MaybeRefOrGetter<CalendarDayMode>): this {
    this.state.dayMode = mode;
    return this;
  }

  /**
   * The `day` view's columns and paging as one spec — `anchor`, `span`
   * (days or `'responsive'`), `filter` (all / `workDays`), `step` (days
   * per page or `'span'`); Week and Work week are fixed presets of it.
   * `null` restores the `dayMode` presets.
   */
  timeGridRange(spec: MaybeRefOrGetter<TimeGridRangeSpec | null>): this {
    this.state.timeGridRange = spec;
    return this;
  }

  /** C6 — independent of timeStyle / hour12. */
  dateStyle(s: MaybeRefOrGetter<'short' | 'medium' | 'long' | 'full'>): this {
    this.state.dateStyle = s;
    return this;
  }

  /** C6 — independent of dateStyle / hour12. */
  timeStyle(s: MaybeRefOrGetter<'short' | 'medium' | 'long'>): this {
    this.state.timeStyle = s;
    return this;
  }

  /**
   * C6 — independent of locale. `undefined` lets Intl derive from
   * locale (default); `true` / `false` overrides explicitly.
   */
  hour12(h: MaybeRefOrGetter<boolean | undefined>): this {
    this.state.hour12 = h;
    return this;
  }

  /**
   * C4 — DST disambiguation policy. Read by every wall-time → instant
   * conversion in the drop pipeline. Default `'compatible'`.
   */
  dstPolicy(p: MaybeRefOrGetter<DstPolicy>): this {
    this.state.dstPolicy = p;
    return this;
  }

  /**
   * Recurrence engine for this builder's `expandSeries` calls (default:
   * the lazy rrule-temporal adapter; the factory form is the SSR
   * escape). **Set once at construction** — a swap does not cancel or
   * re-route in-flight expansions.
   */
  recurrenceEngine(engineOrFactory: RecurrenceEngine | (() => RecurrenceEngine)): this {
    this.state.recurrenceEngine = engineOrFactory;
    // Bust the resolved-engine cache + invalidate series cache so a
    // subsequent visible-range change re-expands with the new engine.
    this._resetRecurrenceEngine();
    return this;
  }

  // ─── Navigation (writable Refs) ─────────────────────────────

  /**
   * Active view. Setter accepts a `Ref<CalendarView>` (two-way
   * binding) or a plain value (wrapped into an internal ref).
   * Function-getters are rejected — `api.setView` must be able to
   * write back.
   */
  view(v: Ref<CalendarView> | CalendarView): this {
    this.state.view = asWritableRef(v, 'view');
    return this;
  }

  availableViews(views: MaybeRefOrGetter<readonly CalendarView[]>): this {
    this.state.availableViews = views;
    return this;
  }

  /**
   * Cursor date. Setter accepts a `Ref<PlainDate>` or a plain
   * `PlainDate`; function-getters rejected (api.next/prev/goTo
   * must write).
   */
  date(d: Ref<Temporal.PlainDate> | Temporal.PlainDate): this {
    this.state.date = asWritableRef(d, 'date');
    return this;
  }

  // ─── View-specific (D2 — flat surface; no-ops for other views) ──

  /** Time-grid view setting (`day` / `week`). */
  timeRange(r: MaybeRefOrGetter<TimeRange>): this {
    this.state.timeRange = r;
    return this;
  }

  slotDuration(minutes: MaybeRefOrGetter<number>): this {
    this.state.slotDuration = minutes;
    return this;
  }

  pixelsPerHour(px: MaybeRefOrGetter<number>): this {
    this.state.pixelsPerHour = px;
    return this;
  }

  /** Month view setting — pills before "+N more". */
  maxEventsPerCell(n: MaybeRefOrGetter<number>): this {
    this.state.maxEventsPerCell = n;
    return this;
  }

  /** Responsive day view: minimum number of full day columns. */
  dayColumnCount(n: MaybeRefOrGetter<number>): this {
    this.state.dayColumnCount = n;
    return this;
  }

  /** Responsive day view: target width used to derive additional columns. */
  dayColumnMinWidth(px: MaybeRefOrGetter<number>): this {
    this.state.dayColumnMinWidth = px;
    return this;
  }

  /** Agenda view setting — number of days the linear list covers. */
  agendaLengthDays(n: MaybeRefOrGetter<number>): this {
    this.state.agendaLengthDays = n;
    return this;
  }

  /** Agenda view setting — show day headers even when no events. */
  showEmptyDays(b: MaybeRefOrGetter<boolean>): this {
    this.state.showEmptyDays = b;
    return this;
  }

  /** Days the `'timeline'` view spans starting from the cursor. Default 60. */
  timelineRangeDays(n: MaybeRefOrGetter<number>): this {
    this.state.timelineRangeDays = n;
    return this;
  }

  /** Horizontal pixel density of the `'timeline'` view (pixels per day). Default 56. */
  timelinePixelsPerDay(p: MaybeRefOrGetter<number>): this {
    this.state.timelinePixelsPerDay = p;
    return this;
  }

  /** Event-row height in the `'timeline'` view, in pixels. Default 32. */
  timelineRowHeight(h: MaybeRefOrGetter<number>): this {
    this.state.timelineRowHeight = h;
    return this;
  }

  /** Left-pane label width in the `'timeline'` view, in pixels. Default 200. */
  timelineLabelWidth(w: MaybeRefOrGetter<number>): this {
    this.state.timelineLabelWidth = w;
    return this;
  }
}
