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

import type { ViewWindow } from '../core';

/** Privileged method symbol — see `CalendarBuilder` for the impl. */
export const SET_VISIBLE_RANGE: unique symbol = Symbol('CalendarBuilder.setVisibleRange');

/** Privileged method symbol — see `CalendarBuilder` for the impl. */
export const INVALIDATE_LOADER_CACHE: unique symbol = Symbol(
  'CalendarBuilder.invalidateLoaderCache',
);

/**
 * Type-narrowed surface a `CalendarBuilder` exposes to internal
 * composables (only `useViewWindow` today).
 */
export interface PrivilegedBuilder {
  [SET_VISIBLE_RANGE](window: ViewWindow | null): void;
  [INVALIDATE_LOADER_CACHE](): void;
}
