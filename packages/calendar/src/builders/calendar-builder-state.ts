/**
 * The builder's reactive state shape, its defaults, and the
 * imperative `CalendarApi` surface.
 *
 * Pure data contracts — no behaviour. `CalendarBuilderState` is the
 * single source of truth every view reads (C7: `toValue()` for
 * `MaybeRefOrGetter` fields, `.value` for the writable navigation
 * refs, functions stored verbatim and called at the read site).
 * `createCalendarBuilderState` pins every default in one place so a
 * reader can audit "what does an untouched builder do?" without
 * following the class hierarchy.
 */

import { ref, shallowReactive, type MaybeRefOrGetter, type Ref, type ShallowRef } from 'vue';
import {
  type AllDayBandMode,
  type CalendarDayMode,
  type CalendarEvent,
  type CalendarMonthDensity,
  type CalendarView,
  type DayOfWeek,
  type EventTextContrastPolicy,
  type RecurringSeries,
  type ViewWindow,
  DEFAULT_ALL_DAY_MAX_VISIBLE_LANES,
  DEFAULT_WORK_DAYS,
  Temporal,
} from '../core';
import type {
  CalendarDensity,
  CanDropFn,
  DateClickHandler,
  DateDoubleClickHandler,
  DayHeaderRenderer,
  DstPolicy,
  EventClickHandler,
  EventDoubleClickHandler,
  EventDropHandler,
  EventHoverHandler,
  EventHoverLeaveHandler,
  EventRenderer,
  EventsLoader,
  MoreClickHandler,
  RangeChangeHandler,
  SeriesLoader,
  TimeClickHandler,
  TimeDoubleClickHandler,
  TimeRange,
} from './types';
import type { RecurrenceEngine } from '../recurrence/types';

// ─── Reactive state shape ─────────────────────────────────────────

/**
 * Reactive state owned by a `CalendarBuilder`. All reads go through
 * `toValue()` for `MaybeRefOrGetter<T>` fields and `.value` for
 * `Ref<T>` fields. Function fields (canDrop / handlers / renderers)
 * are stored verbatim and called at the read site.
 */
export interface CalendarBuilderState<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  // ── Universal config (read-only, MaybeRefOrGetter) ─────────────
  events: MaybeRefOrGetter<CalendarEvent<TMeta>[]> | null;
  eventsLoader: EventsLoader<TMeta> | null;
  /**
   * Recurring-series source (Phase 4). Reactive — expansion re-runs
   * when the source changes or the visible range changes.
   * Mutually exclusive with `seriesLoader`.
   */
  series: MaybeRefOrGetter<RecurringSeries<TMeta>[]> | null;
  /**
   * Calendar-managed recurring-series loader (Phase 4). Called per
   * visible-range change; results are expanded by the configured
   * engine and cached per-window key. Mutually exclusive with `series`.
   */
  seriesLoader: SeriesLoader<TMeta> | null;
  /** Display zone (C5). Defaults to the browser's IANA zone. */
  timezone: MaybeRefOrGetter<string>;
  locale: MaybeRefOrGetter<string>;
  /** Locale-derived when undefined (Article 9 — defaults are not decisions). */
  firstDayOfWeek: MaybeRefOrGetter<DayOfWeek | undefined>;
  /**
   * Days that count as "working days" for the `'workWeek'` view.
   * 0 = Sun … 6 = Sat. Default is Mon–Fri (`[1, 2, 3, 4, 5]`).
   * Empty array yields an empty workWeek (rendered as "no working
   * days configured" — UI concern, not a runtime error).
   *
   * Article 9: this is an explicit decision — the locale gets a
   * vote on `firstDayOfWeek` but NOT on which weekdays are
   * working days (varies by country/industry independently of
   * BCP-47).
   */
  workDays: MaybeRefOrGetter<readonly DayOfWeek[]>;
  /** Tint Saturday and Sunday cells in month views. Enabled by default. */
  shadeWeekends: MaybeRefOrGetter<boolean>;
  /**
   * How the black/white text colour on event surfaces is chosen when
   * the event supplies no `meta.textColor`. `'wcag'` (default) keeps
   * the historical behaviour; `'apca'` fixes saturated mid-tones.
   */
  eventTextContrast: MaybeRefOrGetter<EventTextContrastPolicy>;
  /**
   * Lanes the all-day band shows before it folds the rest behind
   * per-day "+N" markers (week / work-week / day). `null` = unlimited.
   */
  allDayMaxVisibleLanes: MaybeRefOrGetter<number | null>;
  /** How much height the all-day band claims — see `AllDayBandMode`. */
  allDayBandMode: MaybeRefOrGetter<AllDayBandMode>;
  /**
   * Touch paging on the time grids: a horizontal pan moves the grid
   * with the finger and pages on release. Mouse / pen unaffected.
   */
  swipeNavigation: MaybeRefOrGetter<boolean>;
  density: MaybeRefOrGetter<CalendarDensity>;
  /** Apple-style month presentation. Default `details` preserves the classic web grid. */
  monthDensity: MaybeRefOrGetter<CalendarMonthDensity>;
  /** One fixed day or a width-driven 1…7-day surface. */
  dayMode: MaybeRefOrGetter<CalendarDayMode>;
  /** Intl date style (C6 — independent of timeStyle / hour12).
   *  Locale-derived when undefined (Article 9). */
  dateStyle: MaybeRefOrGetter<'short' | 'medium' | 'long' | 'full' | undefined>;
  /** Intl time style (C6). Locale-derived when undefined (Article 9). */
  timeStyle: MaybeRefOrGetter<'short' | 'medium' | 'long' | undefined>;
  /** 12h vs 24h clock (C6 — independent of locale). */
  hour12: MaybeRefOrGetter<boolean | undefined>;
  /** DST disambiguation policy (C4). Default `'compatible'`. */
  dstPolicy: MaybeRefOrGetter<DstPolicy>;
  /**
   * Recurrence engine (Phase 4 §A8). One of:
   *   - `RecurrenceEngine` instance — eager.
   *   - `() => RecurrenceEngine` factory — SSR-friendly lazy.
   *   - `null` — defer to the lazy default (rrule-temporal adapter
   *     loaded via dynamic import on first `expandSeries` call).
   *
   * Intentionally NOT `MaybeRefOrGetter`: mid-session swap has no
   * sensible semantics (in-flight requests, worker lifecycle). Set
   * once at construction.
   */
  recurrenceEngine: RecurrenceEngine | (() => RecurrenceEngine) | null;
  /** Subset of CalendarView the view-switcher offers. */
  availableViews: MaybeRefOrGetter<readonly CalendarView[]>;
  // ── View-specific (flat — D2 / handoff trade-off) ──────────────
  timeRange: MaybeRefOrGetter<TimeRange>;
  slotDuration: MaybeRefOrGetter<number>;
  pixelsPerHour: MaybeRefOrGetter<number>;
  maxEventsPerCell: MaybeRefOrGetter<number>;
  /** Minimum number of adjacent columns in the responsive day view. */
  dayColumnCount: MaybeRefOrGetter<number>;
  /** Target width of one responsive day column in CSS pixels. */
  dayColumnMinWidth: MaybeRefOrGetter<number>;
  agendaLengthDays: MaybeRefOrGetter<number>;
  showEmptyDays: MaybeRefOrGetter<boolean>;
  /**
   * Number of days the `'timeline'` view spans starting from the
   * cursor. Default 60 (~two months — fits sprint-planning horizons
   * without overwhelming the horizontal scroll).
   */
  timelineRangeDays: MaybeRefOrGetter<number>;
  /**
   * Horizontal pixel density of the `'timeline'` view's time axis.
   * Default 56 — a localized "DD. Mon" label (e.g. "15. Juni") fits
   * on one line at the default font size. Bump to 80 for hour-
   * granularity layout, drop to 24 for quarter-zoomed sprint
   * overviews.
   */
  timelinePixelsPerDay: MaybeRefOrGetter<number>;
  /**
   * Height of each event row in the `'timeline'` view, in pixels.
   * Default 32 — matches the default density's pill height.
   */
  timelineRowHeight: MaybeRefOrGetter<number>;
  /**
   * Width of the left label-pane in the `'timeline'` view, in pixels.
   * Default 200 — wide enough for most event titles without
   * crowding the time-grid.
   */
  timelineLabelWidth: MaybeRefOrGetter<number>;
  // ── Navigation state (writable Refs) ──────────────────────────
  /** Active view. Held as Ref so api.setView can write back. */
  view: Ref<CalendarView>;
  /** Cursor date. Held as Ref so api.next/prev/goTo can write back. */
  date: Ref<Temporal.PlainDate>;
  // ── Reactive functions (C7 — read on every invocation) ─────────
  canDrop: CanDropFn<TMeta> | null;
  eventRenderer: EventRenderer<TMeta> | null;
  dayHeaderRenderer: DayHeaderRenderer | null;
  // ── Handlers ──────────────────────────────────────────────────
  onEventClick: EventClickHandler<TMeta> | null;
  onEventDoubleClick: EventDoubleClickHandler<TMeta> | null;
  onEventHover: EventHoverHandler<TMeta> | null;
  onEventHoverLeave: EventHoverLeaveHandler<TMeta> | null;
  onEventDrop: EventDropHandler<TMeta> | null;
  onDateClick: DateClickHandler | null;
  onTimeClick: TimeClickHandler | null;
  onDateDoubleClick: DateDoubleClickHandler | null;
  onTimeDoubleClick: TimeDoubleClickHandler | null;
  onMoreClick: MoreClickHandler<TMeta> | null;
  onRangeChange: RangeChangeHandler | null;
}

// ─── Defaults ─────────────────────────────────────────────────────

/**
 * The state of an untouched builder. `detectedZone` is the display
 * zone the builder resolved at construction (C5 default; consumers
 * SHOULD call `.timezone(...)` explicitly — Article 9).
 *
 * Navigation refs are created up-front so `view` and `date` are
 * always writable Refs. `date` is initialised in the DETECTED zone so
 * the cursor's first day matches what the user sees, not whatever
 * the JS engine's system zone happens to be (Docker / TZ env
 * mismatches).
 */
export function createCalendarBuilderState<TMeta extends Record<string, unknown>>(
  detectedZone: string,
): CalendarBuilderState<TMeta> {
  return shallowReactive<CalendarBuilderState<TMeta>>({
    events: null,
    eventsLoader: null,
    series: null,
    seriesLoader: null,
    timezone: detectedZone,
    locale: 'en-US',
    // Article 9 — `undefined` so detectFirstDayOfWeekFromLocale(locale)
    // resolves at the view layer. Avoid baking implicit decisions.
    firstDayOfWeek: undefined,
    // Mon–Fri default for the workWeek view; consumers running 6-day
    // (Mon–Sat) or 4-day (Mon–Thu) operations override via
    // `builder.workDays(...)`.
    workDays: DEFAULT_WORK_DAYS,
    shadeWeekends: true,
    eventTextContrast: 'wcag',
    allDayMaxVisibleLanes: DEFAULT_ALL_DAY_MAX_VISIBLE_LANES,
    allDayBandMode: 'fitsContent',
    swipeNavigation: true,
    density: 'comfortable',
    monthDensity: 'details',
    dayMode: 'single',
    // Article 9 defaults — undefined lets Intl pick locale-appropriate.
    dateStyle: undefined,
    timeStyle: undefined,
    // C6: undefined → Intl derives from locale. Setting `true`/`false`
    // explicitly overrides.
    hour12: undefined,
    // C4 default: matches Temporal's. Explicit so views never
    // silently fall back.
    dstPolicy: 'compatible',
    // Phase 4 §A8 — defer to lazy default rrule-temporal until
    // consumer explicitly picks a different engine.
    recurrenceEngine: null,
    // Same primary set as the iOS shell. Timeline remains an explicit
    // opt-in for planning screens instead of crowding the default switcher.
    availableViews: ['year', 'month', 'monthList', 'week', 'workWeek', 'day', 'agenda'],
    timeRange: { startMinutes: 0, endMinutes: 24 * 60 - 1 },
    slotDuration: 30,
    // Default of 60. Time-grid columns end up 1440 px tall
    // for a full 24h window — leaves room for the now-marker, focus
    // halos, and resize handles without crowding.
    pixelsPerHour: 60,
    maxEventsPerCell: 3,
    dayColumnCount: 1,
    dayColumnMinWidth: 220,
    agendaLengthDays: 30,
    showEmptyDays: false,
    timelineRangeDays: 60,
    timelinePixelsPerDay: 56,
    timelineRowHeight: 32,
    timelineLabelWidth: 200,
    view: ref<CalendarView>('month'),
    date: ref<Temporal.PlainDate>(Temporal.Now.plainDateISO(detectedZone)),
    canDrop: null,
    eventRenderer: null,
    dayHeaderRenderer: null,
    onEventClick: null,
    onEventDoubleClick: null,
    onEventHover: null,
    onEventHoverLeave: null,
    onEventDrop: null,
    onDateClick: null,
    onTimeClick: null,
    onDateDoubleClick: null,
    onTimeDoubleClick: null,
    onMoreClick: null,
    onRangeChange: null,
  });
}

// ─── Imperative api ───────────────────────────────────────────────

/**
 * Imperative + reactive surface returned alongside the builder.
 */
export interface CalendarApi<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  // ── Readonly reactive surface ──────────────────────────────────
  /** `true` while at least one `eventsLoader` invocation is in flight. */
  readonly loading: Readonly<Ref<boolean>>;
  /** Currently rendered window. `null` before first paint. */
  readonly visibleRange: Readonly<ShallowRef<ViewWindow | null>>;
  /** `true` once the active view's grid has reported ready. */
  readonly gridReady: Readonly<Ref<boolean>>;
  // ── Imperative navigation ─────────────────────────────────────
  goTo(date: Temporal.PlainDate): void;
  goToToday(): void;
  next(): void;
  prev(): void;
  setView(view: CalendarView): void;
  setMonthDensity(density: CalendarMonthDensity): void;
  setDayMode(mode: CalendarDayMode): void;
  /** Wired by the active view on mount. Dev-warns (once) until then. */
  scrollToTime(time: Temporal.PlainTime): void;
  /** Wired by the active view on mount. Dev-warns (once) until then. */
  scrollToDate(date: Temporal.PlainDate): void;
  // ── Data + cache ──────────────────────────────────────────────
  /** Invalidate the entire loader cache and re-fetch the current window. */
  refresh(): void;
  /** Invalidate any cached entries that intersect `window` and re-fetch
   *  if the current window intersects. */
  refreshRange(window: ViewWindow): void;
  /** Synchronous read of the current window. `null` before first paint. */
  getVisibleRange(): ViewWindow | null;
  /** Snapshot of events visible in the current window — from
   *  `events()` source if set, else the loader cache (or empty if no
   *  cache hit yet). */
  getVisibleEvents(): CalendarEvent<TMeta>[];
}
