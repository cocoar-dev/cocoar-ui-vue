/**
 * Internal symbols used by `useViewWindow` to call privileged methods
 * on `CalendarBuilder` without exposing them on the public class
 * surface (audit Session 2, finding #2 closure).
 *
 * **NOT exported from `index.ts`.** Consumers cannot import these
 * symbols; only `composables/useViewWindow.ts` and the builder's
 * own implementation file reach them. This makes
 * `builder._setVisibleRange(...)` (renamed `builder[SET_VISIBLE_RANGE](...)`)
 * unforgeable from outside the library — the C5 single-writer
 * invariant is structurally enforced rather than relying on a
 * `@internal` JSDoc that consumers can ignore.
 */

import type { Temporal, ViewWindow } from '../core';

/** Privileged method symbol — see `CalendarBuilder` for the impl. */
export const SET_VISIBLE_RANGE: unique symbol = Symbol('CalendarBuilder.setVisibleRange');

/** Privileged method symbol — see `CalendarBuilder` for the impl. */
export const INVALIDATE_LOADER_CACHE: unique symbol = Symbol(
  'CalendarBuilder.invalidateLoaderCache',
);

/**
 * Privileged method symbol — warm the loader / series caches for
 * windows the user is about to see (the neighbour pages the time
 * grid draws while it is being swiped). Never touches
 * `_visibleRange` and never fires `onRangeChange`.
 */
export const PREFETCH_WINDOWS: unique symbol = Symbol('CalendarBuilder.prefetchWindows');
/**
 * Privileged method symbol — the continuous month surface reports the
 * month of its topmost visible section while the user scrolls. Feeds
 * `api.topmostVisibleMonth` and the month label; never moves the
 * cursor (the surface does that itself once the scroll settles).
 */
export const SET_TOPMOST_VISIBLE_MONTH: unique symbol = Symbol(
  'CalendarBuilder.setTopmostVisibleMonth',
);

/**
 * Type-narrowed surface a `CalendarBuilder` exposes to internal
 * composables (`useViewWindow`, the time-grid surface).
 */
export interface PrivilegedBuilder {
  [SET_VISIBLE_RANGE](window: ViewWindow | null): void;
  [INVALIDATE_LOADER_CACHE](): void;
  [PREFETCH_WINDOWS](windows: ReadonlyArray<ViewWindow>): void;
  [SET_TOPMOST_VISIBLE_MONTH](month: Temporal.PlainYearMonth | null): void;
}
