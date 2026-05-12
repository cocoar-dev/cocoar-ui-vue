/**
 * `CalendarBuilder` — the only builder class.
 *
 * One class, one source of truth, one writer for `_visibleRange`. No
 * sub-builder factories: every setter (events / date / view / timezone /
 * locale / timeRange / slotDuration / maxEventsPerCell / agendaLengthDays /
 * handlers / renderers, …) lives on the same builder.
 *
 * **Reactivity contract (C7).**
 *
 *   - **Read-only config** (timezone, locale, dstPolicy, render
 *     callbacks, handlers, view-specific knobs) is held as
 *     `MaybeRefOrGetter<T>`. Composables and components read via
 *     `toValue(state.X)` at every invocation, never captured at
 *     setup. Mutating the builder mid-session takes effect on the
 *     next render / drop.
 *
 *   - **Navigation state** (view + date) is held as `Ref<T>`
 *     (never `MaybeRefOrGetter`). Reason: `api.next/prev/goTo/setView`
 *     mutate it, so it MUST be writable. Setters that receive a Ref
 *     keep the binding two-way; setters that receive a plain value
 *     wrap it into a fresh internal ref. Setters that receive a
 *     function-getter throw — getters are read-only by definition
 *     and would silently lose `api.next()`-style writes.
 *
 * **Loader pipeline (C5 single _visibleRange writer).**
 *
 * `useViewWindow` (the only writer of `_visibleRange`) calls
 * `_setVisibleRange(window)` on every range change. The builder
 * checks the cache (key = `view|tz|start|end`); on hit it surfaces
 * results immediately, on miss it schedules a 50ms-debounced loader
 * call. The loading counter is an integer (not a boolean) so multi-
 * panel sub-views with overlapping fetches don't flicker the
 * `loading` ref.
 *
 * **Why a Map<string, CalendarEvent[]> cache?** Identity-aware so
 * `.timezone()` switches don't leak previous-zone events into the
 * new view (Article 4: same `'2026-04-13'` is a different 24h slice
 * in `Pacific/Kiritimati` vs `America/Los_Angeles` — the cache must
 * track that).
 */

import {
  type EffectScope,
  type MaybeRefOrGetter,
  type Ref,
  type ShallowRef,
  effectScope,
  isRef,
  ref,
  shallowReactive,
  shallowRef,
  toValue,
  watch,
} from 'vue';
import {
  type CalendarEvent,
  type CalendarView,
  type DayOfWeek,
  type RecurringSeries,
  type ViewWindow,
  DEFAULT_WORK_DAYS,
  Temporal,
  detectBrowserTimezone,
  navigateCursor,
  validateCalendarEvent,
} from '../core';
import {
  SET_VISIBLE_RANGE,
  INVALIDATE_LOADER_CACHE,
} from './calendar-builder-internals';
import type {
  CalendarDensity,
  CanDropFn,
  DateClickHandler,
  DayHeaderRenderer,
  DstPolicy,
  EventClickHandler,
  EventDoubleClickHandler,
  EventDropHandler,
  EventRenderer,
  EventsLoader,
  MoreClickHandler,
  RangeChangeHandler,
  SeriesLoader,
  TimeClickHandler,
  TimeRange,
} from './types';
import type { RecurrenceEngine } from '../recurrence/types';

/** Debounce window for `eventsLoader` invocations. */
const LOADER_DEBOUNCE_MS = 50;

/** Process-level guard for the audit-session-5-N1 onMoreClick warn. */
let _warnedOnMoreClick = false;

/**
 * Cache key for a `ViewWindow` in a specific display zone.
 *
 * View AND timezone are both part of the key so a `.timezone()`
 * switch doesn't leak previous-zone events into the new view (C5 +
 * Article 4: cross-zone bucketing differs by display zone — the
 * cache must too). Locale + DstPolicy are intentionally NOT in the
 * key — they affect rendering, not which events fall in the window.
 */
function windowKey(w: ViewWindow): string {
  return `${w.view}|${w.timezone}|${w.start}|${w.end}`;
}

/**
 * Window equality — used to skip redundant `_setVisibleRange` calls
 * (a re-render that produces an identical-shape window shouldn't
 * fire `onRangeChange` twice).
 */
function windowsEqual(a: ViewWindow | null, b: ViewWindow | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return (
    a.view === b.view &&
    a.start === b.start &&
    a.end === b.end &&
    a.timezone === b.timezone
  );
}

/**
 * Convert a `ViewWindow` (display-zone anchored, ISO-string bounds)
 * to a `RecurrenceExpansionWindow` (Temporal ZDT bounds).
 *
 * `start`/`end` may be either an ISO date (`'YYYY-MM-DD'`) for date-
 * granular views (month/week/day/agenda) or an ISO datetime
 * (`'YYYY-MM-DDTHH:MM:SS'`) for sub-hour time-grid views. Both are
 * anchored in `window.timezone`.
 */
function viewWindowToExpansionWindow(window: ViewWindow): {
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
} {
  return {
    start: parseWindowBound(window.start, window.timezone),
    end: parseWindowBound(window.end, window.timezone),
  };
}

function parseWindowBound(iso: string, timezone: string): Temporal.ZonedDateTime {
  // ISO datetime form (`YYYY-MM-DDTHH:MM:SS`) — has 'T' separator.
  if (iso.includes('T')) {
    return Temporal.PlainDateTime.from(iso).toZonedDateTime(timezone, {
      disambiguation: 'compatible',
    });
  }
  // ISO date form (`YYYY-MM-DD`) — anchor at midnight in the zone.
  return Temporal.PlainDate.from(iso).toZonedDateTime(timezone);
}

/**
 * Wrap a plain value or `Ref<T>` into a `Ref<T>`. Throws on getters
 * (functions) — navigation state must be writable, getters are
 * read-only.
 */
function asWritableRef<T>(input: Ref<T> | T, label: string): Ref<T> {
  if (typeof input === 'function') {
    throw new TypeError(
      `[CalendarBuilder.${label}] navigation setters require a Ref or a plain value, never a getter function. api.next() / setView() must be able to write back. Pass \`ref(...)\` if you want two-way binding.`,
    );
  }
  if (isRef(input)) return input as Ref<T>;
  return ref(input) as Ref<T>;
}

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
  density: MaybeRefOrGetter<CalendarDensity>;
  /** Intl date style (C6 — independent of timeStyle / hour12).
   *  Locale-derived when undefined (Article 9). */
  dateStyle: MaybeRefOrGetter<'short' | 'medium' | 'long' | 'full' | undefined>;
  /** Intl time style (C6). */
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
  recurrenceEngine:
    | RecurrenceEngine
    | (() => RecurrenceEngine)
    | null;
  /** Subset of CalendarView the view-switcher offers. */
  availableViews: MaybeRefOrGetter<readonly CalendarView[]>;
  // ── View-specific (flat — D2 / handoff trade-off) ──────────────
  timeRange: MaybeRefOrGetter<TimeRange>;
  slotDuration: MaybeRefOrGetter<number>;
  pixelsPerHour: MaybeRefOrGetter<number>;
  maxEventsPerCell: MaybeRefOrGetter<number>;
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
  onEventDrop: EventDropHandler<TMeta> | null;
  onDateClick: DateClickHandler | null;
  onTimeClick: TimeClickHandler | null;
  onMoreClick: MoreClickHandler<TMeta> | null;
  onRangeChange: RangeChangeHandler | null;
}

/**
 * Imperative + reactive surface returned alongside the builder.
 */
export interface CalendarApi<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
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
  /** Wired in Session 3 (component-side). No-op until then. */
  scrollToTime(time: Temporal.PlainTime): void;
  /** Wired in Session 3 (component-side). No-op until then. */
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

// ─── Class ───────────────────────────────────────────────────────

export class CalendarBuilder<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Reactive state — single source of truth (C7 read site). */
  readonly state: CalendarBuilderState<TMeta>;

  /** Imperative + reactive surface. */
  readonly api: CalendarApi<TMeta>;

  // ── Internal writable refs (api exposes as readonly) ──────────
  private readonly _loading = ref(false);
  private readonly _visibleRange = shallowRef<ViewWindow | null>(null);
  private readonly _gridReady = ref(false);
  /** Active view's scroll-to-time delegate. View registers on mount
   *  via `_setScrollToTime(fn)` and clears on unmount. */
  private _scrollToTimeImpl: ((time: Temporal.PlainTime) => void) | undefined;
  /** Active view's scroll-to-date delegate. */
  private _scrollToDateImpl: ((date: Temporal.PlainDate) => void) | undefined;

  // ── Loader cache + flight tracking ────────────────────────────
  /** Map<windowKey, events>. Wrapped in shallowRef so cache swaps
   *  trigger reactivity for `getVisibleEvents`. */
  private readonly _loaderCache = shallowRef(
    new Map<string, CalendarEvent<TMeta>[]>(),
  );
  /** In-flight loader counter — `loading.value = (counter > 0)`.
   *  Counter (not boolean) so concurrent fetches don't race the flag. */
  private _inFlight = 0;
  /** Pending debounced loader handle — cleared on subsequent
   *  `_setVisibleRange` calls within the debounce window. */
  private _debounceHandle: ReturnType<typeof setTimeout> | null = null;
  /**
   * Generation counter — bumped on `refresh()` so an in-flight loader
   * whose result arrives AFTER an invalidation is discarded instead
   * of poisoning the cache.
   */
  private _generation = 0;

  // ── Recurring-series cache + flight tracking (Phase 4) ─────────
  /** Map<windowKey, expanded events>. Same key shape as _loaderCache.
   *  Holds occurrences expanded from `state.series` / `state.seriesLoader`. */
  private readonly _seriesCache = shallowRef(
    new Map<string, CalendarEvent<TMeta>[]>(),
  );
  /** Bumped on series invalidation. Independent of `_generation` so
   *  series and events caches don't fight over the same counter. */
  private _seriesGeneration = 0;
  /** Resolved engine instance (lazy-constructed from
   *  `state.recurrenceEngine`). `null` means "use the lazy default
   *  inside expandSeries". */
  private _resolvedEngine: RecurrenceEngine | null = null;
  /** Window keys with a pending series expansion. Prevents duplicate
   *  dispatches when series-watcher and [SET_VISIBLE_RANGE] both fire
   *  for the same window in close succession. */
  private readonly _inFlightSeriesKeys = new Set<string>();
  /** Memoized lazy import of `expandSeries`. Dynamic-import keeps
   *  the recurrence runtime out of the main bundle for apps that
   *  don't use series — the chunk only loads on first
   *  `_runSeriesExpansion` call. Per Phase 4 §A1 topology rule. */
  private _expandSeriesFnPromise:
    | Promise<typeof import('../recurrence/index').expandSeries>
    | null = null;

  /** Effect scope for builder-owned watchers (audit fix #1 — events
   *  source watcher). Cleaned up if/when a `.dispose()` is added in
   *  Phase 4+; currently builders live for the page lifetime. */
  private readonly _scope: EffectScope = effectScope(true);

  /** Tracks event-array references already validated, so re-renders
   *  don't re-walk them. Per-event-object validation; consumers who
   *  recreate event objects on every render pay the validation cost
   *  every render (cheap — a few `instanceof` checks). */
  private readonly _validatedEventObjects = new WeakSet<object>();

  private constructor() {
    // Audit fix #3 — capture the detection outcome ONCE at construction
    // and warn loudly per-builder (not per-process) if the browser
    // can't tell us its zone. Consumer who never calls `.timezone(...)`
    // on this builder gets the warn at construction; the warn includes
    // the setter name to call.
    const detectedZone = detectBrowserTimezone();
    if (typeof console !== 'undefined' && detectedZone === 'UTC') {
      // detectBrowserTimezone falls back to 'UTC' when Intl is
      // unavailable. That's almost never what the user actually
      // wants — Article 9: defaults that hide decisions bite later.
      console.error(
        '[CalendarBuilder] Browser timezone detection failed and silently fell back to UTC. ' +
          'This builder will render every event in UTC unless you call ' +
          '`builder.timezone("Europe/Vienna")` (or similar IANA zone) explicitly. ' +
          'If you intentionally want UTC, call `.timezone("UTC")` to silence this error.',
      );
    }

    // Navigation refs — created up-front so the state object's `view`
    // and `date` are always writable Refs. Audit fix #15: initialise
    // `date` in the DETECTED display zone so the cursor's first day
    // matches what the user sees, not whatever the JS engine's system
    // zone happens to be (Docker / TZ env mismatches).
    const internalView = ref<CalendarView>('month');
    const internalDate = ref<Temporal.PlainDate>(
      Temporal.Now.plainDateISO(detectedZone),
    );

    this.state = shallowReactive<CalendarBuilderState<TMeta>>({
      events: null,
      eventsLoader: null,
      series: null,
      seriesLoader: null,
      // C5 default. Consumers SHOULD call `.timezone(...)` explicitly
      // to make the choice visible at the call site (Article 9).
      timezone: detectedZone,
      locale: 'en-US',
      // Article 9 — `undefined` so detectFirstDayOfWeekFromLocale(locale)
      // resolves at the view layer. Avoid baking implicit decisions.
      firstDayOfWeek: undefined,
      // Mon–Fri default for the workWeek view; consumers running 6-day
      // (Mon–Sat) or 4-day (Mon–Thu) operations override via
      // `builder.workDays(...)`.
      workDays: DEFAULT_WORK_DAYS,
      density: 'comfortable',
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
      availableViews: ['month', 'week', 'workWeek', 'day', 'agenda', 'timeline'],
      timeRange: { startMinutes: 0, endMinutes: 24 * 60 - 1 },
      slotDuration: 30,
      // Default of 60. Time-grid columns end up 1440 px tall
      // for a full 24h window — leaves room for the now-marker, focus
      // halos, and resize handles without crowding.
      pixelsPerHour: 60,
      maxEventsPerCell: 3,
      agendaLengthDays: 30,
      showEmptyDays: false,
      timelineRangeDays: 60,
      timelinePixelsPerDay: 56,
      timelineRowHeight: 32,
      timelineLabelWidth: 200,
      view: internalView,
      date: internalDate,
      canDrop: null,
      eventRenderer: null,
      dayHeaderRenderer: null,
      onEventClick: null,
      onEventDoubleClick: null,
      onEventDrop: null,
      onDateClick: null,
      onTimeClick: null,
      onMoreClick: null,
      onRangeChange: null,
    });

    this.api = {
      loading: this._loading as Readonly<Ref<boolean>>,
      visibleRange: this._visibleRange as Readonly<
        ShallowRef<ViewWindow | null>
      >,
      gridReady: this._gridReady as Readonly<Ref<boolean>>,
      goTo: (d) => this._goTo(d),
      goToToday: () => this._goToToday(),
      next: () => this._navigate(+1),
      prev: () => this._navigate(-1),
      setView: (v) => this._setView(v),
      // The scroll-to-X methods are wired by the active view component
      // via `_setScrollToTime` / `_setScrollToDate` (registered on
      // mount, cleared on unmount). Until wired, dev-warn so consumer
      // tests calling api.scrollToTime don't false-pass.
      scrollToTime: (time) => {
        if (this._scrollToTimeImpl) this._scrollToTimeImpl(time);
        else this._warnScrollNotWired('scrollToTime');
      },
      scrollToDate: (date) => {
        if (this._scrollToDateImpl) this._scrollToDateImpl(date);
        else this._warnScrollNotWired('scrollToDate');
      },
      refresh: () => this._refresh(),
      refreshRange: (w) => this._refreshRange(w),
      getVisibleRange: () => this._visibleRange.value,
      getVisibleEvents: () => this._getVisibleEvents(),
    };

    // Audit fix #1 — events-source watcher. Whenever state.events
    // changes, validate every event in the source array. Reference-
    // identity memoization via WeakSet so a re-render of the same
    // array doesn't re-walk it; new event objects are validated once.
    //
    // **Audit Session 3 #6 HIGH fix:** flush is `'post'` (was `'sync'`)
    // so a thrown validation error doesn't propagate into arbitrary
    // consumer reactive contexts. Sync validation lives in the
    // `events()` setter for immediate feedback at the call site;
    // this watcher only catches downstream changes (e.g. consumer
    // pushes a new event into a reactive array post-mount), and
    // those errors are logged to console.error rather than thrown
    // (we'd be inside Vue's render flush — throwing here can corrupt
    // unrelated effects).
    this._scope.run(() => {
      watch(
        () => (this.state.events ? toValue(this.state.events) : null),
        (events) => {
          if (!events) return;
          try {
            this._validateEvents(events);
          } catch (e) {
            console.error(
              '[CalendarBuilder] reactive event-source change failed validation:',
              e,
            );
          }
        },
        { immediate: false, flush: 'post' },
      );

      // Phase 4 — reactive series source watcher. Mutating the source
      // ref (or replacing the array) bumps the series generation +
      // invalidates the cache so the next visible-range read sees
      // fresh expansion. We do NOT auto-trigger expansion here:
      // visible-range is the canonical trigger (no point re-expanding
      // for a window we're not rendering). When _visibleRange is
      // already set, kick off expansion immediately so reactive UIs
      // see the change without needing to navigate.
      // Initial-set guard: when state.series transitions from null
      // to a value, do NOT trigger from the watcher — the consumer's
      // `[SET_VISIBLE_RANGE]` call (driven by `useViewWindow`) is the
      // single shot that handles the initial expansion. Without this
      // guard, the initial set races SET_VISIBLE_RANGE and leaks an
      // in-flight chain.
      watch(
        () => (this.state.series ? toValue(this.state.series) : null),
        (next, prev) => {
          if (next === null) return;
          if (prev === null) return;
          this._seriesCache.value = new Map();
          this._seriesGeneration += 1;
          this._inFlightSeriesKeys.clear();
          const w = this._visibleRange.value;
          if (w) this._runSeriesExpansion(w);
        },
        { immediate: false, flush: 'post' },
      );

      // Phase 4 — reactive dstPolicy watcher. Different policy can
      // produce different expansion results (e.g. 'reject' throws);
      // invalidate cache so the next read re-runs through dst-resolve.
      watch(
        () => toValue(this.state.dstPolicy),
        () => {
          this._seriesCache.value = new Map();
          this._seriesGeneration += 1;
    this._inFlightSeriesKeys.clear();
          const w = this._visibleRange.value;
          if (w) this._runSeriesExpansion(w);
        },
        { immediate: false, flush: 'post' },
      );
    });
  }

  /** Factory — keep `new` private so the only entry point is
   *  `useCalendar()`. */
  static create<
    TMeta extends Record<string, unknown> = Record<string, unknown>,
  >(): CalendarBuilder<TMeta> {
    return new CalendarBuilder<TMeta>();
  }

  // ─── Universal config (C1, C5, C6, C4) ───────────────────────

  /**
   * Bind the event source. Mutually exclusive with `eventsLoader()`
   * — calling this clears any previously-set loader and drops the
   * cache (cache only makes sense for loader mode).
   *
   * The library accepts ONLY `Temporal.ZonedDateTime` (timed) or
   * `Temporal.PlainDate` (all-day) on event start/end. Strings,
   * `Date`, floating `PlainDateTime` etc. throw at index-insert via
   * `validateCalendarEvent` (C1).
   */
  events(source: MaybeRefOrGetter<CalendarEvent<TMeta>[]>): this {
    this.state.events = source;
    if (this.state.eventsLoader !== null) {
      this.state.eventsLoader = null;
      this._loaderCache.value = new Map();
    }
    // Audit Session 3 #6 fix — sync validation at the call site so
    // consumers see invalid shapes IMMEDIATELY (not after the next
    // render flush via the watcher). Throws bubble to whoever called
    // `.events(...)`, which is the consumer's setup code — exactly
    // where they want the error.
    const initial = toValue(source);
    if (initial) this._validateEvents(initial);
    return this;
  }

  /**
   * Bind a calendar-managed loader. Called whenever the visible
   * window changes; results cached per `(view, timezone, start, end)`
   * so navigation back to a previously-seen window doesn't re-fetch.
   * Mutually exclusive with `events()`.
   */
  eventsLoader(loader: EventsLoader<TMeta>): this {
    this.state.eventsLoader = loader;
    if (this.state.events !== null) {
      this.state.events = null;
    }
    // New loader → cache is stale.
    this._loaderCache.value = new Map();
    return this;
  }

  /**
   * Phase 4 — bind a recurring-series source. Reactive: expansion
   * re-runs whenever the source changes or the visible range changes.
   *
   * Composes with `events()` / `eventsLoader()`; `getVisibleEvents()`
   * returns the merged set. Mutually exclusive with `seriesLoader()`
   * (one or the other, not both).
   *
   * Expansion uses the engine from `recurrenceEngine()` if set, else
   * the lazy default rrule-temporal adapter. DST policy from
   * `dstPolicy()` applies uniformly to every expanded occurrence.
   */
  series(source: MaybeRefOrGetter<RecurringSeries<TMeta>[]>): this {
    this.state.series = source;
    if (this.state.seriesLoader !== null) {
      this.state.seriesLoader = null;
    }
    this._seriesCache.value = new Map();
    this._seriesGeneration += 1;
    this._inFlightSeriesKeys.clear();
    // The reactive series watcher (set up in the constructor) fires
    // post-flush and triggers expansion. We deliberately do NOT call
    // `_runSeriesExpansion` here to avoid double-firing — the watcher
    // is the single trigger point for series-source-induced
    // expansion.
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
    this._seriesCache.value = new Map();
    this._seriesGeneration += 1;
    this._inFlightSeriesKeys.clear();
    const w = this._visibleRange.value;
    if (w) this._runSeriesExpansion(w);
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

  density(d: MaybeRefOrGetter<CalendarDensity>): this {
    this.state.density = d;
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
   * Phase 4 §A8 — recurrence engine.
   *
   * Bind a specific engine for `expandSeries` calls associated with
   * this builder. Without this call, the lazy default
   * (rrule-temporal adapter) is used.
   *
   * The factory form is the SSR escape: pass
   * `() => new SyncOnlyRecurrenceEngine()` so the engine is
   * constructed only when actually needed (SSR with non-recurring
   * events doesn't trigger construction).
   *
   * Use cases:
   *   - Custom engines: implement the `RecurrenceEngine` interface
   *     in consumer code (e.g. server-side pre-expansion, alternate
   *     RRULE parser, mock for tests).
   *   - SSR: pass a factory form to defer engine construction to
   *     the first client-side call.
   *   - Tests: pass a mock engine for deterministic output.
   *
   * **Set once at construction.** Mid-session swap has no sensible
   * semantics (in-flight requests, worker lifecycle, cache coherency)
   * — calling this method after a series expansion has been
   * dispatched does NOT cancel or re-route in-flight calls.
   */
  recurrenceEngine(
    engineOrFactory: RecurrenceEngine | (() => RecurrenceEngine),
  ): this {
    this.state.recurrenceEngine = engineOrFactory;
    // Bust the resolved-engine cache + invalidate series cache so a
    // subsequent visible-range change re-expands with the new engine.
    this._resolvedEngine = null;
    this._seriesCache.value = new Map();
    this._seriesGeneration += 1;
    this._inFlightSeriesKeys.clear();
    const w = this._visibleRange.value;
    if (w) this._runSeriesExpansion(w);
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

  // ─── View-specific (D2 — flat surface) ─────────────────────
  // Calling these while an incompatible view is active is a no-op
  // at runtime (Session 3 adds the dev-warn).

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
   * Audit Session 5 N1 — `onMoreClick` is wired by month-view's
   * "+N more" overflow surface, which is a Session 3.5+ visual
   * polish item. The setter is honoured today (handler stored on
   * state, read-on-fire), but the overflow trigger is not yet
   * implemented in `<CoarMonthView>`. A one-shot dev-warn surfaces
   * the gap so consumers don't ship features that never fire.
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

  // ─── Internal: navigation impl ─────────────────────────────

  private _goTo(d: Temporal.PlainDate): void {
    this.state.date.value = d;
  }

  private _goToToday(): void {
    const tz = toValue(this.state.timezone);
    this.state.date.value = Temporal.Now.plainDateISO(tz);
  }

  private _navigate(direction: 1 | -1): void {
    const view = this.state.view.value;
    const cursor = this.state.date.value;
    const agendaDays = toValue(this.state.agendaLengthDays);
    const timelineDays = toValue(this.state.timelineRangeDays);
    this.state.date.value = navigateCursor(
      view,
      cursor,
      direction === 1 ? 'next' : 'prev',
      agendaDays,
      timelineDays,
    );
  }

  private _setView(v: CalendarView): void {
    // Audit Session 3 #14 fix — validate against availableViews so
    // setView('year') doesn't silently land on a "View not implemented"
    // dead screen. Dev-warn (not throw) — consumers may legitimately
    // pre-set view before calling availableViews.
    const allowed = toValue(this.state.availableViews);
    if (!allowed.includes(v)) {
      if (typeof console !== 'undefined') {
        console.warn(
          `[CalendarBuilder.api.setView] view='${v}' is not in availableViews=[${allowed.join(', ')}]. Setting anyway, but the active view-switcher won't show it and the body may render an "unsupported" placeholder. Add it to availableViews(...) or pick from the allowed set.`,
        );
      }
    }
    this.state.view.value = v;
  }

  // ─── Internal: visible-range writer (symbol-keyed; see #2 fix) ──

  /**
   * SOLE writer of `_visibleRange`. Called by `useViewWindow` only.
   *
   * **Audit fix #2 (Session 2):** symbol-keyed instead of
   * underscore-prefixed-public so consumers cannot forge windows by
   * calling `builder._setVisibleRange(...)` from outside. The symbol
   * is exported from `calendar-builder-internals.ts` which is
   * intentionally NOT in `index.ts`'s public surface.
   *
   * Side effects:
   *   1. Updates the readonly `api.visibleRange` ref.
   *   2. Fires the consumer's `onRangeChange` handler (deduped via
   *      window-equality check — no-op if the window didn't change).
   *   3. Schedules a debounced loader call if `eventsLoader` is set
   *      and the cache doesn't already have this window.
   *
   * @internal symbol-keyed; reachable only via the internal symbol.
   */
  [SET_VISIBLE_RANGE](window: ViewWindow | null): void {
    if (windowsEqual(this._visibleRange.value, window)) return;
    this._visibleRange.value = window;
    if (window) {
      const handler = this.state.onRangeChange;
      if (handler) {
        try {
          handler(window);
        } catch (e) {
          // Don't let consumer handler errors break the calendar.
          console.error('[CalendarBuilder] onRangeChange handler threw:', e);
        }
      }
      this._maybeScheduleLoad(window);
      // Phase 4 — trigger recurring-series expansion for the new
      // window if a source is configured.
      this._runSeriesExpansion(window);
    }
  }

  /**
   * Invalidate the entire loader cache. Called by `api.refresh()`.
   * Bumps the generation counter so any in-flight loader resolves
   * into the void instead of poisoning fresh data.
   *
   * @internal symbol-keyed; reachable only via the internal symbol.
   */
  [INVALIDATE_LOADER_CACHE](): void {
    this._loaderCache.value = new Map();
    this._generation += 1;
    // Phase 4 — invalidate recurring-series cache too so refresh()
    // re-fetches both pipelines uniformly.
    this._seriesCache.value = new Map();
    this._seriesGeneration += 1;
    this._inFlightSeriesKeys.clear();
    const w = this._visibleRange.value;
    if (w) this._runSeriesExpansion(w);
  }

  // ─── Internal: loader pipeline ─────────────────────────────

  private _maybeScheduleLoad(window: ViewWindow): void {
    const loader = this.state.eventsLoader;
    if (!loader) return;
    const key = windowKey(window);
    if (this._loaderCache.value.has(key)) return; // cache hit
    if (this._debounceHandle !== null) clearTimeout(this._debounceHandle);
    this._debounceHandle = setTimeout(() => {
      this._debounceHandle = null;
      this._runLoader(window);
    }, LOADER_DEBOUNCE_MS);
  }

  private _runLoader(window: ViewWindow): void {
    const loader = this.state.eventsLoader;
    if (!loader) return;
    const key = windowKey(window);
    const generation = this._generation;
    this._inFlight += 1;
    this._loading.value = true;
    Promise.resolve()
      .then(() => loader(window))
      .then((events) => {
        // Discard if `refresh()` (or another invalidation) ran while
        // we were fetching — the answer would be poisoning fresh data.
        if (generation !== this._generation) return;
        // Audit fix #1 — validate loader results before caching. If
        // any event is invalid, the call throws and we treat it as a
        // rejection (not cached, error logged below).
        this._validateEvents(events);
        const next = new Map(this._loaderCache.value);
        next.set(key, events);
        this._loaderCache.value = next;
      })
      .catch((e) => {
        console.error(
          `[CalendarBuilder] eventsLoader rejected for window ${key}:`,
          e,
        );
        // NOT cached on error — next visit re-attempts.
      })
      .finally(() => {
        this._inFlight -= 1;
        if (this._inFlight <= 0) {
          this._inFlight = 0;
          this._loading.value = false;
        }
      });
  }

  /**
   * Audit fix #1 — validate every event in `events` against C1 at the
   * runtime boundary. WeakSet-memoized per-event-object so repeated
   * renders of the same array don't pay the cost.
   *
   * Throws on the first bad event with `validateCalendarEvent`'s
   * error (which names the event id). Loader path catches this in
   * the `.catch` and logs without caching; events-source path lets
   * it propagate so the consumer's render fails loudly (Article 9 —
   * silent partial-render hiding bad data is the worse outcome).
   */
  private _validateEvents(events: ReadonlyArray<CalendarEvent<TMeta>>): void {
    for (const event of events) {
      if (typeof event !== 'object' || event === null) {
        throw new TypeError(
          `[CalendarBuilder] events array contains a non-object entry: ${String(event)}. Each entry must be a CalendarEvent.`,
        );
      }
      if (this._validatedEventObjects.has(event)) continue;
      validateCalendarEvent(event as CalendarEvent);
      this._validatedEventObjects.add(event);
    }
  }

  private _warnedScrollMethods = new Set<string>();

  /**
   * Audit fix #16 — `scrollTo*` is wired by component mount in
   * Session 3. Until then, calling it is a no-op; in dev we log
   * once-per-method so consumer e2e tests don't false-pass.
   */
  private _warnScrollNotWired(method: 'scrollToTime' | 'scrollToDate'): void {
    if (this._warnedScrollMethods.has(method)) return;
    this._warnedScrollMethods.add(method);
    if (typeof console !== 'undefined') {
      console.warn(
        `[CalendarBuilder.api.${method}] not wired yet — components ship in Session 3. This call is a no-op. Once <CoarCalendar> mounts, ${method} will work; remove this call or move it to after-mount.`,
      );
    }
  }

  private _refresh(): void {
    this[INVALIDATE_LOADER_CACHE]();
    const window = this._visibleRange.value;
    if (window) this._maybeScheduleLoad(window);
  }

  private _refreshRange(window: ViewWindow): void {
    // Drop any cache entries whose window key matches the SAME view +
    // timezone + (start <= window.end AND end >= window.start). For
    // string-only ISO dates this is a lex compare which works on
    // ISO-8601 by construction.
    const next = new Map<string, CalendarEvent<TMeta>[]>();
    let dirty = false;
    for (const [key, events] of this._loaderCache.value.entries()) {
      const [v, tz, start, end] = key.split('|');
      const intersects =
        v === window.view &&
        tz === window.timezone &&
        start < window.end &&
        end > window.start;
      if (intersects) {
        dirty = true;
        continue;
      }
      next.set(key, events);
    }
    if (dirty) {
      this._loaderCache.value = next;
      this._generation += 1;
    }
    // Phase 4 — same intersection invalidation for the series cache.
    const nextSeries = new Map<string, CalendarEvent<TMeta>[]>();
    let seriesDirty = false;
    for (const [key, events] of this._seriesCache.value.entries()) {
      const [v, tz, start, end] = key.split('|');
      const intersects =
        v === window.view &&
        tz === window.timezone &&
        start < window.end &&
        end > window.start;
      if (intersects) {
        seriesDirty = true;
        continue;
      }
      nextSeries.set(key, events);
    }
    if (seriesDirty) {
      this._seriesCache.value = nextSeries;
      this._seriesGeneration += 1;
    this._inFlightSeriesKeys.clear();
    }
    const current = this._visibleRange.value;
    if (current) {
      const cur = windowKey(current);
      if (!this._loaderCache.value.has(cur)) {
        this._maybeScheduleLoad(current);
      }
      if (!this._seriesCache.value.has(cur)) {
        this._runSeriesExpansion(current);
      }
    }
  }

  // ─── Internal: events accessor ─────────────────────────────

  private _getVisibleEvents(): CalendarEvent<TMeta>[] {
    // Non-recurring events first.
    const nonRecurring = this._getNonRecurringEvents();
    // Then recurring events expanded for the current window.
    const recurring = this._getRecurringEvents();
    if (recurring.length === 0) return nonRecurring;
    if (nonRecurring.length === 0) return recurring;
    return nonRecurring.concat(recurring);
  }

  private _getNonRecurringEvents(): CalendarEvent<TMeta>[] {
    // Mode 1: events() source — return the full source array.
    const source = this.state.events;
    if (source !== null) {
      const list = toValue(source) ?? [];
      return list;
    }
    // Mode 2: loader cache — return entries for the current window
    // if we have them, else empty (the loader will populate on next
    // invocation).
    const window = this._visibleRange.value;
    if (window) {
      const cached = this._loaderCache.value.get(windowKey(window));
      if (cached) return cached;
    }
    return [];
  }

  private _getRecurringEvents(): CalendarEvent<TMeta>[] {
    const window = this._visibleRange.value;
    if (!window) return [];
    const cached = this._seriesCache.value.get(windowKey(window));
    return cached ?? [];
  }

  // ─── Internal: recurring-series expansion (Phase 4) ────────────

  /**
   * Resolve the configured engine, lazy-constructing factory form
   * once. Returns `undefined` when no engine is configured —
   * `expandSeries` falls back to its own lazy default
   * (rrule-temporal) in that case.
   */
  private _resolveEngine(): RecurrenceEngine | undefined {
    if (this._resolvedEngine) return this._resolvedEngine;
    const setting = this.state.recurrenceEngine;
    if (typeof setting === 'function') {
      this._resolvedEngine = setting();
      return this._resolvedEngine;
    }
    if (setting) {
      this._resolvedEngine = setting;
      return this._resolvedEngine;
    }
    return undefined;
  }

  /**
   * Trigger a recurring-series expansion for `window`. No-op if no
   * series source is configured. Cache hit short-circuits.
   *
   * Async by design (the engine interface is async). Result lands in
   * `_seriesCache` on success; consumers read via
   * `getVisibleEvents()` which reactively re-renders when the cache
   * shallowRef updates.
   *
   * Generation-guarded: a result that arrives after `refresh()` /
   * source-replacement is discarded so it doesn't poison fresh data.
   */
  private _runSeriesExpansion(window: ViewWindow): void {
    if (this.state.series === null && this.state.seriesLoader === null) {
      // No source — nothing to expand.
      return;
    }
    const key = windowKey(window);
    if (this._seriesCache.value.has(key)) return; // cache hit
    // Race-safety: if another expansion for the same window is
    // already in flight, no-op. Avoids double-fire when
    // [SET_VISIBLE_RANGE] and the series-watcher both trigger for
    // the same window in close succession.
    if (this._inFlightSeriesKeys.has(key)) return;
    this._inFlightSeriesKeys.add(key);
    const generation = this._seriesGeneration;
    this._inFlight += 1;
    this._loading.value = true;

    Promise.resolve()
      .then(() => this._readSeriesForWindow(window))
      .then(async (series) => {
        if (generation !== this._seriesGeneration) return;
        if (series.length === 0) {
          // Cache empty result so we don't re-attempt for this window.
          const next = new Map(this._seriesCache.value);
          next.set(key, []);
          this._seriesCache.value = next;
          return;
        }
        const expansionWindow = viewWindowToExpansionWindow(window);
        const dstPolicy = toValue(this.state.dstPolicy);
        const engine = this._resolveEngine();
        const expandFn = await this._loadExpandSeries();
        const expanded = await Promise.all(
          series.map((s) =>
            expandFn(s, expansionWindow, dstPolicy, engine),
          ),
        );
        if (generation !== this._seriesGeneration) return;
        const all = expanded.flat();
        // Validate each expanded event so consumer renderers don't
        // see invalid shapes (engine bug containment).
        this._validateEvents(all);
        const next = new Map(this._seriesCache.value);
        next.set(key, all);
        this._seriesCache.value = next;
      })
      .catch((e) => {
        console.error(
          `[CalendarBuilder] recurring-series expansion failed for window ${key}:`,
          e,
        );
        // Not cached on error — next visible-range change re-attempts.
      })
      .finally(() => {
        this._inFlightSeriesKeys.delete(key);
        this._inFlight -= 1;
        if (this._inFlight <= 0) {
          this._inFlight = 0;
          this._loading.value = false;
        }
      });
  }

  private async _loadExpandSeries(): Promise<
    typeof import('../recurrence/index').expandSeries
  > {
    if (this._expandSeriesFnPromise) return this._expandSeriesFnPromise;
    this._expandSeriesFnPromise = import('../recurrence/index').then(
      (mod) => mod.expandSeries,
    );
    return this._expandSeriesFnPromise;
  }

  private async _readSeriesForWindow(
    window: ViewWindow,
  ): Promise<RecurringSeries<TMeta>[]> {
    if (this.state.series !== null) {
      return toValue(this.state.series) ?? [];
    }
    if (this.state.seriesLoader !== null) {
      const result = this.state.seriesLoader(window);
      return Promise.resolve(result);
    }
    return [];
  }

  // ─── Internal: cache + flight peeks (test hooks) ──────────

  /**
   * Snapshot of the loader cache keys for diagnostics / tests.
   * Not part of the public API surface.
   *
   * @internal
   */
  _debug_cacheKeys(): string[] {
    return Array.from(this._loaderCache.value.keys());
  }

  /**
   * Current in-flight counter for diagnostics / tests.
   *
   * @internal
   */
  _debug_inFlight(): number {
    return this._inFlight;
  }

  // ── View-component registration channels (Phase C) ────────────
  //
  // The active view component registers its scroll delegates and grid-
  // ready signal via these methods on mount, and clears them on unmount.
  // Naming intentionally `_set*` so consumers don't reach for it directly: consumers do
  // not call these directly (the `@internal` JSDoc is informational —
  // structural enforcement via `index.ts` not exporting these channels).

  /** @internal */
  _setScrollToTime(fn: ((time: Temporal.PlainTime) => void) | undefined): void {
    this._scrollToTimeImpl = fn;
  }
  /** @internal */
  _setScrollToDate(fn: ((date: Temporal.PlainDate) => void) | undefined): void {
    this._scrollToDateImpl = fn;
  }
  /** @internal */
  _setGridReady(ready: boolean): void {
    this._gridReady.value = ready;
  }
}
