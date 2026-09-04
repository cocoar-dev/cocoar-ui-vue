/**
 * Events-loader pipeline: per-window cache, debounce, generation
 * guard.
 *
 * Owned by `CalendarBuilder`; never reached by consumers. The
 * builder decides WHEN a window should load (`useViewWindow` →
 * `[SET_VISIBLE_RANGE]`), this class decides HOW: cache hit → no-op;
 * miss → one debounced loader call per window whose result is
 * validated (C1) and cached, unless an invalidation happened while
 * it was in flight.
 *
 * **Why a `Map<string, CalendarEvent[]>` in a `shallowRef`?** Cache
 * swaps must trigger reactivity for `getVisibleEvents()`; the key
 * carries view + zone so a `.timezone()` switch can't leak previous-
 * zone events into the new view (Article 4).
 */

import { shallowRef, type ShallowRef } from 'vue';
import type { CalendarEvent, ViewWindow } from '../../core';
import type { EventsLoader } from '../types';
import { windowKey, windowKeyIntersects } from './window-utils';
import type { LoadingTracker } from './loading-tracker';
import type { EventValidator } from './event-validation';

/** Debounce window for `eventsLoader` invocations. */
const LOADER_DEBOUNCE_MS = 50;

export interface LoaderPipelineDeps<TMeta extends Record<string, unknown>> {
  /** Read on every call (C7). `null` = `events()` mode, nothing to load. */
  loader: () => EventsLoader<TMeta> | null;
  validator: EventValidator<TMeta>;
  loading: LoadingTracker;
}

export class LoaderPipeline<TMeta extends Record<string, unknown>> {
  /** Map<windowKey, events>. */
  readonly cache: ShallowRef<Map<string, CalendarEvent<TMeta>[]>> = shallowRef(new Map());
  /**
   * Bumped on every invalidation so an in-flight loader whose result
   * arrives AFTER the invalidation is discarded instead of poisoning
   * fresh data.
   */
  private _generation = 0;
  private _debounceHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly deps: LoaderPipelineDeps<TMeta>) {}

  /** Cached events for `window`, or `undefined` on a miss. */
  get(window: ViewWindow): CalendarEvent<TMeta>[] | undefined {
    return this.cache.value.get(windowKey(window));
  }

  has(window: ViewWindow): boolean {
    return this.cache.value.has(windowKey(window));
  }

  /** Schedule a debounced load unless the window is already cached. */
  maybeSchedule(window: ViewWindow): void {
    if (!this.deps.loader()) return;
    if (this.has(window)) return; // cache hit
    if (this._debounceHandle !== null) clearTimeout(this._debounceHandle);
    this._debounceHandle = setTimeout(() => {
      this._debounceHandle = null;
      this.run(window);
    }, LOADER_DEBOUNCE_MS);
  }

  /** Invoke the loader for `window` now (no debounce). */
  run(window: ViewWindow): void {
    const loader = this.deps.loader();
    if (!loader) return;
    const key = windowKey(window);
    const generation = this._generation;
    this.deps.loading.begin();
    Promise.resolve()
      .then(() => loader(window))
      .then((events) => {
        // Discard if `refresh()` (or another invalidation) ran while
        // we were fetching — the answer would be poisoning fresh data.
        if (generation !== this._generation) return;
        // Validate loader results before caching. If any event is
        // invalid, the call throws and we treat it as a rejection
        // (not cached, error logged below).
        this.deps.validator.validate(events);
        const next = new Map(this.cache.value);
        next.set(key, events);
        this.cache.value = next;
      })
      .catch((e) => {
        console.error(`[CalendarBuilder] eventsLoader rejected for window ${key}:`, e);
        // NOT cached on error — next visit re-attempts.
      })
      .finally(() => this.deps.loading.end());
  }

  /** Drop everything; in-flight results are discarded on arrival. */
  invalidateAll(): void {
    this.cache.value = new Map();
    this._generation += 1;
  }

  /**
   * Drop cached entries whose window intersects `window` (same view
   * + zone, overlapping bounds). Returns `true` when something was
   * dropped.
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
    }
    return dirty;
  }

  /** Snapshot of the cache keys (diagnostics / tests). */
  keys(): string[] {
    return Array.from(this.cache.value.keys());
  }
}
