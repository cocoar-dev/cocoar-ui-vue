/**
 * `useMonthExpansion` — month-view row expansion.
 *
 * The month view does NOT truncate to "+N more" — every event
 * stays in the DOM (so keyboard focus + DnD reach all of them).
 * Each cell's pill list scrolls when it outgrows its slot, and
 * a single row at a time can be EXPANDED via the cell kebab to
 * give all its overflowing pills more vertical room.
 *
 * Two-state model:
 *   - collapsed = `max(MIN_ROW_HEIGHT, barArea + COLLAPSED_PILLS_AREA)`
 *   - expanded  = `MAX_ROW_HEIGHT`
 *
 * The composable owns:
 *   - the per-row bar-area pixel height (lane count × bar lanes)
 *   - the expanded-rows set (single-row mode — opening one
 *     collapses any other)
 *   - the per-row pixel height (collapsed vs expanded)
 *
 * Pill heights are NOT assumed (consumers can pass custom `#pill`
 * slots with arbitrary heights), so nothing here counts events.
 */

import {
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
  computed,
  ref,
  toValue,
  watch,
} from 'vue';
import type { CalendarMonthDensity, MonthLayout } from '../core';

const BAR_GAP = 2;
/** Pixels reserved at the top of each cell for the day-number badge. */
const DAY_NUMBER_HEIGHT = 24;
/** Minimum vertical space below the bar lanes for the pills
 *  area in a collapsed row. Tuned so an empty cell still reads
 *  comfortably; pills overflow into a scroll. */
const MAX_ROW_HEIGHT = 300;
const MONTH_BASE_ROW_HEIGHT: Record<CalendarMonthDensity, number> = {
  compact: 52,
  stacked: 68,
  details: 94,
};
const MONTH_BAR_HEIGHT: Record<CalendarMonthDensity, number> = {
  compact: 5,
  stacked: 8,
  details: 18,
};

export interface UseMonthExpansionOptions {
  /** Pixel-perfect month layout from `layoutMonthGrid`. */
  layout: ComputedRef<MonthLayout> | Ref<MonthLayout>;
  /** Reactive token that resets expansion when the visible
   *  month changes (typically a `Temporal.PlainYearMonth`). */
  resetToken: ComputedRef<unknown> | Ref<unknown>;
  /** Apple-style month density controlling base row and multi-day lane height. */
  monthDensity?: MaybeRefOrGetter<CalendarMonthDensity>;
}

export interface UseMonthExpansionReturn {
  /** Constants exposed for the parent's bar geometry math. */
  readonly BAR_HEIGHT: ComputedRef<number>;
  readonly BAR_GAP: number;
  readonly DAY_NUMBER_HEIGHT: number;

  /** Top-of-bar offset within a row for a given lane. */
  barTopPx(lane: number): number;

  /** Per-row total bar-area pixel height (used by the pills
   *  container's `margin-top`). */
  rowBarHeightsPx: ComputedRef<number[]>;

  /** Per-row total height (collapsed vs expanded). */
  rowHeightPx: ComputedRef<number[]>;

  /** Set of currently expanded row indices. Single-row mode —
   *  opening one collapses any other. */
  expandedRows: Ref<Set<number>>;

  /** Imperative expand / collapse helpers. */
  expandRow(rowIdx: number): void;
  collapseRow(rowIdx: number): void;
}

export function useMonthExpansion(opts: UseMonthExpansionOptions): UseMonthExpansionReturn {
  const monthDensity = computed(() => toValue(opts.monthDensity) ?? 'details');
  const BAR_HEIGHT = computed(() => MONTH_BAR_HEIGHT[monthDensity.value]);

  function barTopPx(lane: number): number {
    return DAY_NUMBER_HEIGHT + lane * (BAR_HEIGHT.value + BAR_GAP);
  }

  /** For each row, compute how many lanes the multi-day bars
   *  occupy (so the cell-pill block knows where to start
   *  vertically). */
  const rowBarHeightsPx = computed(() => {
    return opts.layout.value.weekRows.map((row) => {
      if (row.multiDayBars.length === 0) return DAY_NUMBER_HEIGHT;
      const lanes = row.multiDayBars[0].laneCount;
      return DAY_NUMBER_HEIGHT + lanes * (BAR_HEIGHT.value + BAR_GAP);
    });
  });

  /** Single-row expansion: opening one row collapses any other.
   *  Keeps the grid visually compact and matches the convention
   *  users know from accordion-style tables. */
  const expandedRows = ref<Set<number>>(new Set());

  const rowHeightPx = computed(() => {
    return rowBarHeightsPx.value.map((barAreaHeight, rowIdx) => {
      if (expandedRows.value.has(rowIdx)) return MAX_ROW_HEIGHT;
      const laneBandHeight = Math.max(0, barAreaHeight - DAY_NUMBER_HEIGHT);
      return MONTH_BASE_ROW_HEIGHT[monthDensity.value] + laneBandHeight;
    });
  });

  function expandRow(rowIdx: number): void {
    if (expandedRows.value.has(rowIdx)) return;
    // Single-row mode: opening a new row collapses any
    // previously expanded one.
    expandedRows.value = new Set([rowIdx]);
  }
  function collapseRow(rowIdx: number): void {
    if (!expandedRows.value.has(rowIdx)) return;
    const next = new Set(expandedRows.value);
    next.delete(rowIdx);
    expandedRows.value = next;
  }

  // Reset expansion when navigating to a different month — the
  // previous month's expanded rows shouldn't carry over.
  watch(opts.resetToken, () => {
    expandedRows.value = new Set();
  });

  return {
    BAR_HEIGHT,
    BAR_GAP,
    DAY_NUMBER_HEIGHT,
    barTopPx,
    rowBarHeightsPx,
    rowHeightPx,
    expandedRows,
    expandRow,
    collapseRow,
  };
}
