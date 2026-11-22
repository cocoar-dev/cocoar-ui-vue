/**
 * `useTimeGridSwipe` — touch paging for the time grid.
 *
 * A horizontal touch pan on the day columns moves the grid with the
 * finger (header cells, all-day band and body columns together — the
 * hour axis stays put) and, on release past the threshold, pages to
 * the previous / next range through the calendar api. Below the
 * threshold the grid settles back. Ported from the SwiftUI port's
 * day swipe (5.2.0).
 *
 * The gesture itself lives in `usePageSwipe`, shared with other surfaces.
 */

import type { Ref } from 'vue';
import {
  usePageSwipe,
  type SwipePointerdownOptions,
  type UsePageSwipeReturn,
} from './usePageSwipe';

export type { SwipePointerdownOptions };

/** Snapshot the grid emits so its host can mirror the swipe on sibling pages. */
export interface TimeGridSwipeState {
  engaged: boolean;
  swiping: boolean;
  settling: boolean;
  /** The `--coar-time-grid-swipe-x` value, e.g. `'-140px'`. */
  offsetX: string;
}

export interface UseTimeGridSwipeOptions {
  /** The element whose width is one "page" (the body columns container). */
  columnsEl: Ref<HTMLElement | null>;
  /** Read on every gesture (C7). `false` disables the pan entirely. */
  enabled: () => boolean;
  /** Called after the settle animation; `1` = next, `-1` = previous. */
  onCommit: (direction: 1 | -1) => void;
}

export type UseTimeGridSwipeReturn = UsePageSwipeReturn;

export function useTimeGridSwipe(options: UseTimeGridSwipeOptions): UseTimeGridSwipeReturn {
  return usePageSwipe({
    pageEl: options.columnsEl,
    enabled: options.enabled,
    onCommit: options.onCommit,
    offsetVar: '--coar-time-grid-swipe-x',
  });
}
