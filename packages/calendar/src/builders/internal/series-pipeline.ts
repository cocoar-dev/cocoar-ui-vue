/**
 * Recurring-series expansion pipeline (Phase 4, C8).
 *
 * Owned by `CalendarBuilder`; never reached by consumers. Expands
 * `state.series` / `state.seriesLoader` for one visible window at a
 * time through the configured `RecurrenceEngine` (or the lazy
 * default), validates the occurrences (C1) and caches them per
 * window key — the same key shape as the events loader so both
 * caches invalidate uniformly on `refresh()` / `refreshRange()`.
 *
 * Race-safety: a window with an expansion in flight is not
 * dispatched twice (`[SET_VISIBLE_RANGE]` and the series watcher can
 * fire for the same window in close succession), and a result that
 * arrives after an invalidation is discarded via a generation
 * counter that is independent of the events loader's.
 *
 * Bundle topology: `expandSeries` is dynamically imported on the
 * first expansion, so apps without recurring series never pay for
 * the recurrence chunk (Phase 4 §A1).
 */

import { shallowRef, toValue, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import type { CalendarEvent, RecurringSeries, ViewWindow } from '../../core';
import type { DstPolicy } from '../../core/temporal';
import type { RecurrenceEngine } from '../../recurrence/types';
import type { SeriesLoader } from '../types';
import { viewWindowToExpansionWindow, windowKey, windowKeyIntersects } from './window-utils';
import type { LoadingTracker } from './loading-tracker';
import type { EventValidator } from './event-validation';

export interface SeriesPipelineDeps<TMeta extends Record<string, unknown>> {
  /** Read on every call (C7). */
  series: () => MaybeRefOrGetter<RecurringSeries<TMeta>[]> | null;
  seriesLoader: () => SeriesLoader<TMeta> | null;
  engineSetting: () => RecurrenceEngine | (() => RecurrenceEngine) | null;
  dstPolicy: () => DstPolicy;
  validator: EventValidator<TMeta>;
  loading: LoadingTracker;
}

type ExpandSeriesFn = typeof import('../../recurrence/index').expandSeries;

export class SeriesPipeline<TMeta extends Record<string, unknown>> {
  /** Map<windowKey, expanded occurrences>. */
  readonly cache: ShallowRef<Map<string, CalendarEvent<TMeta>[]>> = shallowRef(new Map());
  /** Bumped on series invalidation — independent of the loader's counter. */
  private _generation = 0;
  /** Window keys with a pending expansion. */
  private readonly _inFlightKeys = new Set<string>();
  /**
   * Resolved engine instance (lazy-constructed from the factory
   * form). `null` means "use the lazy default inside expandSeries".
   */
  private _resolvedEngine: RecurrenceEngine | null = null;
  /** Memoized dynamic import of `expandSeries`. */
  private _expandFnPromise: Promise<ExpandSeriesFn> | null = null;

  constructor(private readonly deps: SeriesPipelineDeps<TMeta>) {}

  /** Is any recurring source configured at all? */
  hasSource(): boolean {
    return this.deps.series() !== null || this.deps.seriesLoader() !== null;
  }

  /** Cached occurrences for `window`, or `undefined` on a miss. */
  get(window: ViewWindow): CalendarEvent<TMeta>[] | undefined {
    return this.cache.value.get(windowKey(window));
  }

  has(window: ViewWindow): boolean {
    return this.cache.value.has(windowKey(window));
  }

  /** Drop everything; in-flight results are discarded on arrival. */
  invalidate(): void {
    this.cache.value = new Map();
    this._generation += 1;
    this._inFlightKeys.clear();
  }

  /** Forget the resolved engine so the next expansion re-resolves it. */
  resetEngine(): void {
    this._resolvedEngine = null;
  }

  /**
   * Drop cached entries whose window intersects `window`. Returns
   * `true` when something was dropped.
   */
  invalidateIntersecting(window: ViewWindow): boolean {
    const next = new Map<string, CalendarEvent<TMeta>[]>();
    let dirty = false;
    for (const [key, events] of this.cache.value.entries()) {
      if (windowKeyIntersects(key, window)) {
        dirty = true;
        continue;
      }
      next.set(key, events);
    }
    if (dirty) {
      this.cache.value = next;
      this._generation += 1;
      this._inFlightKeys.clear();
    }
    return dirty;
  }

  /**
   * Trigger an expansion for `window`. No-op without a source, on a
   * cache hit, or while the same window is already in flight.
   *
   * Async by design (the engine interface is async). The result
   * lands in `cache` on success; consumers read it through
   * `api.getVisibleEvents()`, which re-renders when the shallowRef
   * swaps.
   */
  run(window: ViewWindow): void {
    if (!this.hasSource()) return;
    const key = windowKey(window);
    if (this.cache.value.has(key)) return; // cache hit
    if (this._inFlightKeys.has(key)) return;
    this._inFlightKeys.add(key);
    const generation = this._generation;
    this.deps.loading.begin();

    Promise.resolve()
      .then(() => this.readSeriesForWindow(window))
      .then(async (series) => {
        if (generation !== this._generation) return;
        if (series.length === 0) {
          // Cache the empty result so we don't re-attempt for this window.
          this.store(key, []);
          return;
        }
        const expansionWindow = viewWindowToExpansionWindow(window);
        const dstPolicy = this.deps.dstPolicy();
        const engine = this.resolveEngine();
        const expandFn = await this.loadExpandSeries();
        const expanded = await Promise.all(
          series.map((s) => expandFn(s, expansionWindow, dstPolicy, engine)),
        );
        if (generation !== this._generation) return;
        const all = expanded.flat();
        // Validate each expanded event so consumer renderers don't
        // see invalid shapes (engine bug containment).
        this.deps.validator.validate(all);
        this.store(key, all);
      })
      .catch((e) => {
        console.error(`[CalendarBuilder] recurring-series expansion failed for window ${key}:`, e);
        // Not cached on error — next visible-range change re-attempts.
      })
      .finally(() => {
        this._inFlightKeys.delete(key);
        this.deps.loading.end();
      });
  }

  private store(key: string, events: CalendarEvent<TMeta>[]): void {
    const next = new Map(this.cache.value);
    next.set(key, events);
    this.cache.value = next;
  }

  /**
   * Resolve the configured engine, lazy-constructing the factory
   * form once. `undefined` when nothing is configured — `expandSeries`
   * falls back to its own lazy default (rrule-temporal).
   */
  private resolveEngine(): RecurrenceEngine | undefined {
    if (this._resolvedEngine) return this._resolvedEngine;
    const setting = this.deps.engineSetting();
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

  private loadExpandSeries(): Promise<ExpandSeriesFn> {
    if (this._expandFnPromise) return this._expandFnPromise;
    this._expandFnPromise = import('../../recurrence/index').then((mod) => mod.expandSeries);
    return this._expandFnPromise;
  }

  private async readSeriesForWindow(window: ViewWindow): Promise<RecurringSeries<TMeta>[]> {
    const source = this.deps.series();
    if (source !== null) return toValue(source) ?? [];
    const loader = this.deps.seriesLoader();
    if (loader !== null) return Promise.resolve(loader(window));
    return [];
  }
}
