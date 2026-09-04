/**
 * `CalendarBuilder` — the only builder class.
 *
 * One class, one source of truth, one writer for `_visibleRange`. No
 * sub-builder factories: every setter (events / date / view / timezone /
 * locale / timeRange / slotDuration / handlers / renderers, …) lives on
 * the same builder. It is implemented as a chain of layers by concern
 * so each file stays readable — `CalendarBuilderConfig` (state +
 * config setters) → `CalendarBuilderHandlers` (renderers + handlers)
 * → this file (api, navigation, pipelines, watchers). Consumers only
 * ever see `CalendarBuilder`.
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
 * `[SET_VISIBLE_RANGE](window)` on every range change. The builder
 * fires `onRangeChange`, hands the window to the events loader
 * (`internal/loader-pipeline.ts`: cache hit → no-op, miss → debounced
 * fetch) and to the recurring-series expansion
 * (`internal/series-pipeline.ts`). Both caches share one in-flight
 * counter behind `api.loading`.
 */

import {
  type EffectScope,
  type Ref,
  type ShallowRef,
  effectScope,
  ref,
  shallowRef,
  toValue,
  watch,
} from 'vue';
import {
  type CalendarDayMode,
  type CalendarEvent,
  type CalendarMonthDensity,
  type CalendarView,
  type ViewWindow,
  Temporal,
  detectBrowserTimezone,
} from '../core';
import {
  SET_VISIBLE_RANGE,
  INVALIDATE_LOADER_CACHE,
  PREFETCH_WINDOWS,
} from './calendar-builder-internals';
import { CalendarBuilderHandlers } from './calendar-builder-handlers';
import { createCalendarBuilderState, type CalendarApi } from './calendar-builder-state';
import { windowsEqual } from './internal/window-utils';
import { goToToday, navigate, setDayMode, setMonthDensity, setView } from './internal/navigation';
import { LoadingTracker } from './internal/loading-tracker';
import { EventValidator } from './internal/event-validation';
import { LoaderPipeline } from './internal/loader-pipeline';
import { SeriesPipeline } from './internal/series-pipeline';
import { eventsForWindow } from './internal/events-for-window';
import { createRangeLabel } from './internal/range-label';

export type { CalendarApi, CalendarBuilderState } from './calendar-builder-state';

// ─── Class ───────────────────────────────────────────────────────

export class CalendarBuilder<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> extends CalendarBuilderHandlers<TMeta> {
  /** Imperative + reactive surface. */
  readonly api: CalendarApi<TMeta>;

  // ── Internal writable refs (api exposes as readonly) ──────────
  private readonly _visibleRange = shallowRef<ViewWindow | null>(null);
  private readonly _gridReady = ref(false);
  /** Active view's scroll delegates. Registered on mount, cleared on unmount. */
  private _scrollToTimeImpl: ((time: Temporal.PlainTime) => void) | undefined;
  private _scrollToDateImpl: ((date: Temporal.PlainDate) => void) | undefined;
  private readonly _warnedScrollMethods = new Set<string>();

  // ── Pipelines ─────────────────────────────────────────────────
  private readonly _loading = new LoadingTracker();
  private readonly _validator = new EventValidator<TMeta>();
  private readonly _loader: LoaderPipeline<TMeta>;
  private readonly _series: SeriesPipeline<TMeta>;

  /** Effect scope for builder-owned watchers. Builders live for the page lifetime. */
  private readonly _scope: EffectScope = effectScope(true);

  private constructor() {
    const detectedZone = detectBrowserTimezone();
    super(createCalendarBuilderState<TMeta>(detectedZone));
    // Warn loudly per-builder (not per-process) if the browser can't
    // tell us its zone. `detectBrowserTimezone` falls back to 'UTC'
    // when Intl is unavailable — almost never what the user wants
    // (Article 9: defaults that hide decisions bite later).
    if (typeof console !== 'undefined' && detectedZone === 'UTC') {
      console.error(
        '[CalendarBuilder] Browser timezone detection failed and silently fell back to UTC. ' +
          'This builder will render every event in UTC unless you call ' +
          '`builder.timezone("Europe/Vienna")` (or similar IANA zone) explicitly. ' +
          'If you intentionally want UTC, call `.timezone("UTC")` to silence this error.',
      );
    }

    this._loader = new LoaderPipeline<TMeta>({
      loader: () => this.state.eventsLoader,
      validator: this._validator,
      loading: this._loading,
    });
    this._series = new SeriesPipeline<TMeta>({
      series: () => this.state.series,
      seriesLoader: () => this.state.seriesLoader,
      engineSetting: () => this.state.recurrenceEngine,
      dstPolicy: () => toValue(this.state.dstPolicy),
      validator: this._validator,
      loading: this._loading,
    });

    this.api = {
      loading: this._loading.loading as Readonly<Ref<boolean>>,
      visibleRange: this._visibleRange as Readonly<ShallowRef<ViewWindow | null>>,
      gridReady: this._gridReady as Readonly<Ref<boolean>>,
      rangeLabel: this._scope.run(() => createRangeLabel(this.state, this._visibleRange))!,
      goTo: (d) => this._goTo(d),
      goToToday: () => this._goToToday(),
      next: () => this._navigate(+1),
      prev: () => this._navigate(-1),
      setView: (v) => this._setView(v),
      setMonthDensity: (density) => this._setMonthDensity(density),
      setDayMode: (mode) => this._setDayMode(mode),
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
      getVisibleEvents: () =>
        eventsForWindow(this.state, this._loader, this._series, this._visibleRange.value),
      getEventsForWindow: (w) => eventsForWindow(this.state, this._loader, this._series, w),
    };

    this._scope.run(() => this._installWatchers());
  }

  /** Factory — `new` is private so the only entry point is `useCalendar()`. */
  static create<
    TMeta extends Record<string, unknown> = Record<string, unknown>,
  >(): CalendarBuilder<TMeta> {
    return new CalendarBuilder<TMeta>();
  }

  // ─── Watchers ─────────────────────────────────────────────────

  private _installWatchers(): void {
    // Events-source watcher. Whenever state.events changes, validate
    // every event in the source array (memoized per object).
    //
    // Flush is `'post'` so a thrown validation error doesn't propagate
    // into arbitrary consumer reactive contexts. Sync validation lives
    // in the `events()` setter for immediate feedback at the call
    // site; this watcher only catches downstream changes (e.g. a
    // consumer pushes a new event into a reactive array post-mount),
    // and those errors are logged rather than thrown (we'd be inside
    // Vue's render flush — throwing here can corrupt unrelated effects).
    watch(
      () => (this.state.events ? toValue(this.state.events) : null),
      (events) => {
        if (!events) return;
        try {
          this._validateEvents(events);
        } catch (e) {
          console.error('[CalendarBuilder] reactive event-source change failed validation:', e);
        }
      },
      { immediate: false, flush: 'post' },
    );

    // Reactive series-source watcher. Mutating the source ref (or
    // replacing the array) invalidates the cache so the next
    // visible-range read sees fresh expansion; when a range is already
    // visible, re-expand immediately so reactive UIs see the change
    // without navigating. Initial-set guard: the null → value
    // transition is handled by `[SET_VISIBLE_RANGE]` (driven by
    // `useViewWindow`) — triggering here too would race it.
    watch(
      () => (this.state.series ? toValue(this.state.series) : null),
      (next, prev) => {
        if (next === null) return;
        if (prev === null) return;
        this._invalidateSeries(true);
      },
      { immediate: false, flush: 'post' },
    );

    // Reactive dstPolicy watcher. A different policy can produce
    // different expansion results (e.g. 'reject' throws); invalidate
    // so the next read re-runs through dst-resolve.
    watch(
      () => toValue(this.state.dstPolicy),
      () => this._invalidateSeries(true),
      { immediate: false, flush: 'post' },
    );
  }

  // ─── Hooks for the config layer ───────────────────────────────

  protected _validateEvents(events: ReadonlyArray<CalendarEvent<TMeta>>): void {
    this._validator.validate(events);
  }

  protected _resetLoaderCache(): void {
    this._loader.cache.value = new Map();
  }

  protected _invalidateSeries(rerun: boolean): void {
    this._series.invalidate();
    if (!rerun) return;
    const w = this._visibleRange.value;
    if (w) this._series.run(w);
  }

  protected _resetRecurrenceEngine(): void {
    this._series.resetEngine();
    this._invalidateSeries(true);
  }

  // ─── Internal: navigation impl (see internal/navigation.ts) ───

  private _goTo(d: Temporal.PlainDate): void {
    this.state.date.value = d;
  }

  private _goToToday(): void {
    goToToday(this.state);
  }

  private _navigate(direction: 1 | -1): void {
    navigate(this.state, this._visibleRange.value, direction);
  }

  private _setView(v: CalendarView): void {
    setView(this.state, v);
  }

  private _setMonthDensity(value: CalendarMonthDensity): void {
    setMonthDensity(this.state, value);
  }

  private _setDayMode(value: CalendarDayMode): void {
    setDayMode(this.state, value);
  }

  private _warnScrollNotWired(method: 'scrollToTime' | 'scrollToDate'): void {
    if (this._warnedScrollMethods.has(method)) return;
    this._warnedScrollMethods.add(method);
    if (typeof console !== 'undefined') {
      console.warn(
        `[CalendarBuilder.api.${method}] not wired yet — components ship in Session 3. This call is a no-op. Once <CoarCalendar> mounts, ${method} will work; remove this call or move it to after-mount.`,
      );
    }
  }

  // ─── Internal: visible-range writer (symbol-keyed) ────────────

  /**
   * SOLE writer of `_visibleRange`. Called by `useViewWindow` only.
   *
   * Symbol-keyed instead of underscore-prefixed-public so consumers
   * cannot forge windows by calling `builder._setVisibleRange(...)`
   * from outside. The symbol is exported from
   * `calendar-builder-internals.ts`, which is intentionally NOT in
   * `index.ts`'s public surface.
   *
   * Side effects:
   *   1. Updates the readonly `api.visibleRange` ref.
   *   2. Fires the consumer's `onRangeChange` handler (deduped via
   *      window-equality check — no-op if the window didn't change).
   *   3. Schedules a debounced loader call if `eventsLoader` is set
   *      and the cache doesn't already have this window.
   *   4. Triggers recurring-series expansion for the window.
   *
   * @internal symbol-keyed; reachable only via the internal symbol.
   */
  [SET_VISIBLE_RANGE](window: ViewWindow | null): void {
    if (windowsEqual(this._visibleRange.value, window)) return;
    this._visibleRange.value = window;
    if (!window) return;
    const handler = this.state.onRangeChange;
    if (handler) {
      try {
        handler(window);
      } catch (e) {
        // Don't let consumer handler errors break the calendar.
        console.error('[CalendarBuilder] onRangeChange handler threw:', e);
      }
    }
    this._loader.maybeSchedule(window);
    this._series.run(window);
  }

  /**
   * Invalidate both caches. Called by `api.refresh()`. In-flight
   * results are discarded on arrival instead of poisoning fresh data.
   *
   * @internal symbol-keyed; reachable only via the internal symbol.
   */
  [INVALIDATE_LOADER_CACHE](): void {
    this._loader.invalidateAll();
    this._invalidateSeries(true);
  }

  /**
   * Warm both caches for windows the user is about to see — the
   * neighbour pages drawn during a swipe. Cache hits and in-flight
   * windows are skipped; `_visibleRange` and `onRangeChange` are NOT
   * touched, so consumers see no navigation.
   *
   * @internal symbol-keyed; reachable only via the internal symbol.
   */
  [PREFETCH_WINDOWS](windows: ReadonlyArray<ViewWindow>): void {
    for (const w of windows) {
      this._loader.prefetch(w);
      this._series.run(w);
    }
  }

  private _refresh(): void {
    this[INVALIDATE_LOADER_CACHE]();
    const window = this._visibleRange.value;
    if (window) this._loader.maybeSchedule(window);
  }

  private _refreshRange(window: ViewWindow): void {
    this._loader.invalidateIntersecting(window);
    this._series.invalidateIntersecting(window);
    const current = this._visibleRange.value;
    if (!current) return;
    if (!this._loader.has(current)) this._loader.maybeSchedule(current);
    if (!this._series.has(current)) this._series.run(current);
  }

  // ─── Internal: diagnostics + view-component registration ──────

  /** Snapshot of the loader cache keys for diagnostics / tests. @internal */
  _debug_cacheKeys(): string[] {
    return this._loader.keys();
  }

  /** Current in-flight counter for diagnostics / tests. @internal */
  _debug_inFlight(): number {
    return this._loading.inFlight;
  }

  // The active view component registers its scroll delegates and
  // grid-ready signal on mount and clears them on unmount. Named
  // `_set*` so consumers don't reach for them; structural enforcement
  // is `index.ts` not exporting these channels.

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
