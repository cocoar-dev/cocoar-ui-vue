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
 * The Details base row is not a constant: it is the iOS 94 px or, if
 * the host's styling needs more, the measured height of the day-number
 * row + `maxEventsPerCell` pills + the "+N" row (`useMonthMetrics`).
 * Details bars take the measured pill height, so bars and pills in
 * one row are always the same size.
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
import { DEFAULT_MONTH_METRICS, type MonthMetrics } from './useMonthMetrics';

const BAR_GAP = 2;
/** iOS base row per density — Details is a floor, see `detailsRowHeight`. */
const MONTH_BASE_ROW_HEIGHT: Record<CalendarMonthDensity, number> = {
  compact: 52,
  stacked: 68,
  details: 94,
};
/** Stacked / Compact bar heights (iOS). Details bars match the measured pill. */
const MONTH_BAR_HEIGHT: Record<Exclude<CalendarMonthDensity, 'details'>, number> = {
  compact: 5,
  stacked: 8,
};

/**
 * Details base row: the day-number row, `maxEventsPerCell` pills, the
 * "+N" row and the list's gaps / padding — measured in the host's
 * styling — and never less than the iOS 94 px. With the stylesheet
 * defaults and two pills this is exactly the iOS row; a host that
 * restyles pills taller gets a row that still fits everything.
 */
export function detailsRowHeight(metrics: MonthMetrics, maxEventsPerCell: number): number {
  const n = Math.max(0, Math.floor(Number.isFinite(maxEventsPerCell) ? maxEventsPerCell : 0));
  const content =
    metrics.dayNumberHeight +
    metrics.pillsPaddingTop +
    n * metrics.pillHeight +
    n * metrics.pillGap +
    metrics.markerHeight +
    metrics.pillsPaddingBottom;
  return Math.max(MONTH_BASE_ROW_HEIGHT.details, Math.ceil(content));
}

export interface UseMonthGeometryOptions {
  /** Pixel-perfect month layout from `layoutMonthGrid`. */
  layout: ComputedRef<MonthLayout> | Ref<MonthLayout>;
  /** Apple-style month density controlling base row and multi-day lane height. */
  monthDensity?: MaybeRefOrGetter<CalendarMonthDensity>;
  /** Lanes a row shows at most; `null` = unlimited. Default unlimited. */
  maxLanes?: MaybeRefOrGetter<number | null>;
  /** Measured cell metrics (`useMonthMetrics`). Default: stylesheet numbers. */
  metrics?: MaybeRefOrGetter<MonthMetrics>;
  /** Pills a Details cell shows — sizes the Details row. Default 2. */
  maxEventsPerCell?: MaybeRefOrGetter<number>;
}

export interface UseMonthGeometryReturn {
  /** Geometry exposed for the parent's bar math. */
  readonly BAR_HEIGHT: ComputedRef<number>;
  readonly BAR_GAP: number;
  /** Measured height of the day-number row (bars start below it). */
  readonly DAY_NUMBER_HEIGHT: ComputedRef<number>;

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
  const metrics = computed(() => toValue(opts.metrics) ?? DEFAULT_MONTH_METRICS);
  const DAY_NUMBER_HEIGHT = computed(() => metrics.value.dayNumberHeight);
  /** Details bars are as tall as the host's pills, so a multi-day bar
   *  and a single-day pill in the same row read as the same thing. */
  const BAR_HEIGHT = computed(() =>
    monthDensity.value === 'details'
      ? metrics.value.pillHeight
      : MONTH_BAR_HEIGHT[monthDensity.value],
  );
  const baseRowHeight = computed(() =>
    monthDensity.value === 'details'
      ? detailsRowHeight(metrics.value, toValue(opts.maxEventsPerCell) ?? 2)
      : MONTH_BASE_ROW_HEIGHT[monthDensity.value],
  );

  function barTopPx(lane: number): number {
    return DAY_NUMBER_HEIGHT.value + lane * (BAR_HEIGHT.value + BAR_GAP);
  }

  /** For each row, compute how many lanes the multi-day bars
   *  occupy (so the cell-pill block knows where to start
   *  vertically). */
  const rowBarHeightsPx = computed(() => {
    return opts.layout.value.weekRows.map((row) => {
      if (row.multiDayBars.length === 0) return DAY_NUMBER_HEIGHT.value;
      const lanes = capMonthRowLanes(row.multiDayBars, toValue(opts.maxLanes) ?? null).laneCount;
      return DAY_NUMBER_HEIGHT.value + lanes * (BAR_HEIGHT.value + BAR_GAP);
    });
  });

  /** A week grows only by the exact height its multi-day lanes
   *  need — never for overflowing pills, which fold into "+N". */
  const rowHeightPx = computed(() => {
    return rowBarHeightsPx.value.map((barAreaHeight) => {
      const laneBandHeight = Math.max(0, barAreaHeight - DAY_NUMBER_HEIGHT.value);
      return baseRowHeight.value + laneBandHeight;
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
