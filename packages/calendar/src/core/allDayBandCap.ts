/**
 * All-day band lane cap + band height rule (pure).
 *
 * Mirrors `CalendarController.allDayMaxVisibleLanes` /
 * `allDayBandMode` in the SwiftUI port:
 *
 *   - The band shows at most `maxVisibleLanes` lanes (default 3, like
 *     the system calendar). When the layout needs MORE, the last
 *     visible lane is given up for per-day "+N" markers; a tap on a
 *     marker expands the band, a collapse control folds it back.
 *     `null` shows every lane, as before the cap existed.
 *   - `AllDayBandMode` decides how much height the band claims. The
 *     hour axis starts below the band, so every height change moves
 *     the whole grid — when paging through days that is the one
 *     movement the user did not cause.
 *
 * Deliberately NOT here: rendering, expand state ownership, DnD.
 * The time grid owns the `expanded` flag and feeds it in.
 */

import type { AllDayBar } from './timeGridLayout';

export type AllDayBandMode = 'fitsContent' | 'alwaysOneLane' | 'reservesCap';

export const DEFAULT_ALL_DAY_MAX_VISIBLE_LANES = 3;

export interface AllDayCapOptions {
  /** Lanes shown before the band folds. `null` = unlimited. */
  maxVisibleLanes: number | null;
  /** The user expanded the band — show everything, offer collapse. */
  expanded: boolean;
  /** Visible day columns; overflow markers are reported per column. */
  columnCount: number;
}

export interface AllDayOverflowMarker {
  /** Column index, 0-based. */
  col: number;
  /** Bars hidden in this column while capped. */
  hidden: number;
}

export interface AllDayCapResult<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  /** Bars to render (all of them when not capped). */
  bars: AllDayBar<TMeta>[];
  /** One marker per column that has hidden bars; empty when not capped. */
  overflow: AllDayOverflowMarker[];
  /** Lanes the rendered bars + markers occupy. */
  visibleLanes: number;
  /** True while bars are being hidden behind markers. */
  capped: boolean;
  /** True when the layout needs more lanes than the cap (expanded or not). */
  exceedsCap: boolean;
}

/**
 * Apply the cap to a laid-out band. A layout that fits within the
 * cap is returned untouched — the marker lane is only sacrificed
 * when there is actually something to hide.
 */
export function capAllDayBand<TMeta extends Record<string, unknown>>(
  bars: ReadonlyArray<AllDayBar<TMeta>>,
  { maxVisibleLanes, expanded, columnCount }: AllDayCapOptions,
): AllDayCapResult<TMeta> {
  const laneCount = bars.length === 0 ? 0 : bars[0].laneCount;
  const max = maxVisibleLanes === null ? null : Math.max(1, Math.floor(maxVisibleLanes));
  const exceedsCap = max !== null && laneCount > max;
  if (!exceedsCap || expanded) {
    return { bars: [...bars], overflow: [], visibleLanes: laneCount, capped: false, exceedsCap };
  }
  const markerLane = max! - 1;
  const visible = bars.filter((bar) => bar.lane < markerLane);
  const hiddenPerCol = new Array<number>(columnCount).fill(0);
  for (const bar of bars) {
    if (bar.lane < markerLane) continue;
    const from = Math.max(0, bar.startCol);
    const to = Math.min(columnCount - 1, bar.endCol);
    for (let col = from; col <= to; col++) hiddenPerCol[col] += 1;
  }
  const overflow: AllDayOverflowMarker[] = [];
  hiddenPerCol.forEach((hidden, col) => {
    if (hidden > 0) overflow.push({ col, hidden });
  });
  return { bars: visible, overflow, visibleLanes: max!, capped: true, exceedsCap };
}

/**
 * Lanes the band should be sized for under `mode`. `0` means "no
 * band at all" (only possible in `fitsContent`).
 */
export function allDayBandLanes(
  visibleLanes: number,
  mode: AllDayBandMode,
  maxVisibleLanes: number | null,
): number {
  switch (mode) {
    case 'alwaysOneLane':
      return Math.max(1, visibleLanes);
    case 'reservesCap':
      return Math.max(maxVisibleLanes ?? 0, visibleLanes);
    default:
      return visibleLanes;
  }
}
