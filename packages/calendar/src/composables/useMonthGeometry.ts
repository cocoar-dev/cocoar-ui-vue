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

import type { Temporal } from '@js-temporal/polyfill';
import { type ComputedRef, type MaybeRefOrGetter, type Ref, computed, toValue } from 'vue';
import {
  capMonthRowLanes,
  dateKey,
  fitMonthCell,
  fitMonthRow,
  type MonthCellFit,
  type MonthRowFitInput,
  type CalendarMonthDensity,
  type CalendarMonthRowSizing,
  type MonthLayout,
} from '../core';
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
  /** How rows get their height. Default `auto`. */
  rowSizing?: MaybeRefOrGetter<CalendarMonthRowSizing>;
  /** Measured height of the rows container, read for `fill`. */
  rowsAreaHeight?: MaybeRefOrGetter<number>;
  /** The density's pill cap, narrowed per row in `uniform` and `fill`. */
  pillLimit?: MaybeRefOrGetter<number>;
}

export interface UseMonthGeometryReturn {
  /** Geometry exposed for the parent's bar math. */
  readonly BAR_HEIGHT: ComputedRef<number>;
  readonly BAR_GAP: number;
  /** Measured height of the day-number row (bars start below it). */
  readonly DAY_NUMBER_HEIGHT: ComputedRef<number>;

  /** Top-of-bar offset within a row for a given lane. */
  barTopPx(lane: number): number;

  /** Per-row total height. */
  rowHeightPx: ComputedRef<number[]>;

  /** Per-row lane cap: the builder's, or what fits a row of fixed height. */
  rowLaneLimits: ComputedRef<Array<number | null>>;

  /** Pill caps per row and column: the density's, or what fits a row of fixed height. */
  cellPillLimits: ComputedRef<MonthCellFit[][]>;

  /** Distance of a cell's pills below the day number, past the bars above them. */
  pillsTopPx: (rowIndex: number, col: number) => number;
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

  const rowSizing = computed(() => toValue(opts.rowSizing) ?? 'auto');
  const pillLimit = computed(() => toValue(opts.pillLimit) ?? Number.POSITIVE_INFINITY);

  /** Height of a day's `#dayFooter`, 0 for a day without one. */
  function footerOf(day: Temporal.PlainDate): number {
    return metrics.value.footerHeights?.get(dateKey(day)) ?? 0;
  }
  const rowFooters = computed(() =>
    opts.layout.value.weekRows.map((row) => Math.max(0, ...row.days.map(footerOf))),
  );

  /** The height of every row when it does not follow its content. */
  const fixedRowHeight = computed(() => {
    if (rowSizing.value === 'auto') return null;
    const rows = opts.layout.value.weekRows.length;
    const area = rowSizing.value === 'fill' ? (toValue(opts.rowsAreaHeight) ?? 0) : 0;
    return area > 0 && rows > 0 ? Math.floor(area / rows) : baseRowHeight.value;
  });

  const rowFitInputs = computed<MonthRowFitInput[] | null>(() => {
    const rowHeight = fixedRowHeight.value;
    if (rowHeight === null) return null;
    const m = metrics.value;
    return opts.layout.value.weekRows.map((row) => ({
      rowHeight,
      dayNumberHeight: m.dayNumberHeight,
      pillsPaddingTop: m.pillsPaddingTop,
      pillsPaddingBottom: m.pillsPaddingBottom,
      markerHeight: monthDensity.value === 'details' ? m.markerHeight : 0,
      barHeight: BAR_HEIGHT.value,
      barGap: BAR_GAP,
      pillHeight: m.pillHeight,
      pillGap: m.pillGap,
      laneCount: row.multiDayBars[0]?.laneCount ?? 0,
      maxLanes: toValue(opts.maxLanes) ?? null,
      pillLimit: pillLimit.value,
    }));
  });
  // Bars must clear the tallest footer of their week.
  const rowFits = computed(
    () =>
      rowFitInputs.value?.map((input, i) =>
        fitMonthRow({ ...input, rowHeight: input.rowHeight - rowFooters.value[i] }),
      ) ?? null,
  );

  const rowLaneLimits = computed(() =>
    opts.layout.value.weekRows.map(
      (_, i) => rowFits.value?.[i].maxLanes ?? toValue(opts.maxLanes) ?? null,
    ),
  );

  /** Bar lanes above each cell. In a row of fixed height with Details
   *  pills a day only gives up the lanes its own bars use; a row that
   *  follows its content keeps one band for all seven days. */
  const columnLanes = computed(() =>
    opts.layout.value.weekRows.map((row, rowIndex) => {
      const cap = capMonthRowLanes(row.multiDayBars, rowLaneLimits.value[rowIndex]);
      if (fixedRowHeight.value === null || monthDensity.value !== 'details') {
        return Array.from({ length: 7 }, () => (row.multiDayBars.length ? cap.laneCount : 0));
      }
      const lanes = Array.from({ length: 7 }, () => 0);
      for (const bar of cap.visible) {
        for (let col = bar.startCol; col <= bar.endCol; col++) {
          lanes[col] = Math.max(lanes[col], bar.lane + 1);
        }
      }
      return lanes;
    }),
  );

  const cellPillLimits = computed(() =>
    columnLanes.value.map((lanes, rowIndex) =>
      lanes.map((laneCount, col) => {
        const input = rowFitInputs.value?.[rowIndex];
        const footer = footerOf(opts.layout.value.weekRows[rowIndex].days[col]);
        // The Compact capsule is one line of segments, not a stack.
        return input && monthDensity.value !== 'compact'
          ? fitMonthCell({ ...input, rowHeight: input.rowHeight - footer }, laneCount)
          : { pillLimit: pillLimit.value, pillLimitWithoutMarker: pillLimit.value };
      }),
    ),
  );

  function pillsTopPx(rowIndex: number, col: number): number {
    return (columnLanes.value[rowIndex]?.[col] ?? 0) * (BAR_HEIGHT.value + BAR_GAP);
  }

  /** For each row, compute how many lanes the multi-day bars
   *  occupy (so the cell-pill block knows where to start
   *  vertically). */
  const rowBarHeightsPx = computed(() => {
    return opts.layout.value.weekRows.map((row, rowIndex) => {
      if (row.multiDayBars.length === 0) return DAY_NUMBER_HEIGHT.value;
      const lanes = capMonthRowLanes(row.multiDayBars, rowLaneLimits.value[rowIndex]).laneCount;
      return DAY_NUMBER_HEIGHT.value + lanes * (BAR_HEIGHT.value + BAR_GAP);
    });
  });

  /** A week grows only by the exact height its multi-day lanes
   *  need — never for overflowing pills, which fold into "+N". */
  const rowHeightPx = computed(() => {
    return rowBarHeightsPx.value.map((barAreaHeight, rowIndex) => {
      if (fixedRowHeight.value !== null) return fixedRowHeight.value;
      const laneBandHeight = Math.max(0, barAreaHeight - DAY_NUMBER_HEIGHT.value);
      return baseRowHeight.value + laneBandHeight + rowFooters.value[rowIndex];
    });
  });

  return {
    BAR_HEIGHT,
    BAR_GAP,
    DAY_NUMBER_HEIGHT,
    barTopPx,
    rowHeightPx,
    rowLaneLimits,
    cellPillLimits,
    pillsTopPx,
  };
}
