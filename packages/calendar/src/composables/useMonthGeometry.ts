/**
 * `useMonthGeometry` — month-view row geometry.
 *
 * Rows have a FIXED height per month density, mirroring the iOS
 * `ContinuousMonthGeometry` contract: a base row plus the height of
 * the week's multi-day lane band, capped at `maxLanes` (bars past
 * the cap fold into the covered cells' "+N", see `capMonthRowLanes`).
 * Cells never scroll and never expand — single-day pills past the
 * cell's cap fold into the same "+N" (see `capMonthCellPills`).
 *
 * The composable owns:
 *   - the per-row bar-area pixel height (lane count × bar lanes)
 *   - the per-row pixel height (base + lane band)
 *
 * Pill heights are NOT assumed (consumers can pass custom `#pill`
 * slots with arbitrary heights), so nothing here counts events.
 */

import { type ComputedRef, type MaybeRefOrGetter, type Ref, computed, toValue } from 'vue';
import { capMonthRowLanes, type CalendarMonthDensity, type MonthLayout } from '../core';

const BAR_GAP = 2;
/** Pixels reserved at the top of each cell for the day-number badge. */
const DAY_NUMBER_HEIGHT = 24;
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

export interface UseMonthGeometryOptions {
  /** Pixel-perfect month layout from `layoutMonthGrid`. */
  layout: ComputedRef<MonthLayout> | Ref<MonthLayout>;
  /** Apple-style month density controlling base row and multi-day lane height. */
  monthDensity?: MaybeRefOrGetter<CalendarMonthDensity>;
  /** Lanes a row shows at most; `null` = unlimited. Default unlimited. */
  maxLanes?: MaybeRefOrGetter<number | null>;
}

export interface UseMonthGeometryReturn {
  /** Constants exposed for the parent's bar geometry math. */
  readonly BAR_HEIGHT: ComputedRef<number>;
  readonly BAR_GAP: number;
  readonly DAY_NUMBER_HEIGHT: number;

  /** Top-of-bar offset within a row for a given lane. */
  barTopPx(lane: number): number;

  /** Per-row total bar-area pixel height (used by the pills
   *  container's `margin-top`). */
  rowBarHeightsPx: ComputedRef<number[]>;

  /** Per-row total height. */
  rowHeightPx: ComputedRef<number[]>;
}

export function useMonthGeometry(opts: UseMonthGeometryOptions): UseMonthGeometryReturn {
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
      const lanes = capMonthRowLanes(row.multiDayBars, toValue(opts.maxLanes) ?? null).laneCount;
      return DAY_NUMBER_HEIGHT + lanes * (BAR_HEIGHT.value + BAR_GAP);
    });
  });

  /** A week grows only by the exact height its multi-day lanes
   *  need — never for overflowing pills, which fold into "+N". */
  const rowHeightPx = computed(() => {
    return rowBarHeightsPx.value.map((barAreaHeight) => {
      const laneBandHeight = Math.max(0, barAreaHeight - DAY_NUMBER_HEIGHT);
      return MONTH_BASE_ROW_HEIGHT[monthDensity.value] + laneBandHeight;
    });
  });

  return {
    BAR_HEIGHT,
    BAR_GAP,
    DAY_NUMBER_HEIGHT,
    barTopPx,
    rowBarHeightsPx,
    rowHeightPx,
  };
}
