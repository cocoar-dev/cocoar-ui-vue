/**
 * Layout for the horizontal time grid (`timeGridOrientation('horizontal')`):
 * one row per day, time running left → right on one shared axis.
 *
 * The per-day work is `layoutDayEvents` — the same projection into the
 * display zone, the same clipping to the time range and to midnight, the
 * same lanes. Only the mapping to pixels differs from the vertical grid:
 *
 *   - minutes → x along the shared axis (`pxPerMinute`);
 *   - lanes stack DOWNWARDS inside a row (no cascade: horizontal cards
 *     are wide and short, so stacking is the natural resolution);
 *   - a row is as tall as its lanes need, never shorter than
 *     `minRowHeightPx` — rows grow, nothing is covered.
 *
 * Row heights are computed, not measured, so hit-testing a pointer to a
 * row (`rowIndexAtY`) needs no DOM.
 *
 * No DOM, no Vue.
 */

import type { CalendarEvent } from './types';
import type { Temporal } from './temporal';
import { layoutDayEvents, type PositionedEvent } from './timeGridLayout';

export interface TimeRowsGeometry {
  /** Height of one lane (one card), px. */
  laneHeightPx: number;
  /** Vertical gap between two lanes, px. */
  laneGapPx: number;
  /** Padding above the first and below the last lane, px. */
  rowPaddingPx: number;
  /** A row is never shorter than this, px. */
  minRowHeightPx: number;
}

export interface TimeRowsLayoutOptions extends TimeRowsGeometry {
  days: ReadonlyArray<Temporal.PlainDate>;
  /** Visible hour range, `[startHour, endHour]`. */
  timeRange: readonly [number, number];
  /** Display zone. */
  timezone: string;
  /** Kept on the last lane of its cluster (drag preview), as in `layoutDayEvents`. */
  priorityId?: string;
}

export interface TimeRow<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  date: Temporal.PlainDate;
  /** Timed events of the day; `lane` counts downwards inside the row. */
  positioned: PositionedEvent<TMeta>[];
  /** Lanes the row is sized for (at least 1). */
  laneCount: number;
  /** Offset of the row from the top of the first row, px. */
  topPx: number;
  heightPx: number;
}

export interface TimeRowsLayout<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  rows: TimeRow<TMeta>[];
  /** Sum of all row heights, px. */
  totalHeightPx: number;
}

/** Height of a row with `laneCount` lanes. */
export function timeRowHeightPx(laneCount: number, g: TimeRowsGeometry): number {
  const lanes = Math.max(1, laneCount);
  const content = lanes * g.laneHeightPx + (lanes - 1) * g.laneGapPx + 2 * g.rowPaddingPx;
  return Math.max(g.minRowHeightPx, content);
}

/** Top of `lane` inside its row, px. */
export function timeRowLaneTopPx(lane: number, g: TimeRowsGeometry): number {
  return g.rowPaddingPx + lane * (g.laneHeightPx + g.laneGapPx);
}

export function layoutTimeRows<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  events: ReadonlyArray<CalendarEvent<TMeta>>,
  opts: TimeRowsLayoutOptions,
): TimeRowsLayout<TMeta> {
  const rows: TimeRow<TMeta>[] = [];
  let top = 0;
  for (const date of opts.days) {
    const positioned = layoutDayEvents(events, {
      day: date,
      timeRange: opts.timeRange,
      timezone: opts.timezone,
      priorityId: opts.priorityId,
    });
    const laneCount = positioned.reduce((max, p) => Math.max(max, p.laneCount), 1);
    const heightPx = timeRowHeightPx(laneCount, opts);
    rows.push({ date, positioned, laneCount, topPx: top, heightPx });
    top += heightPx;
  }
  return { rows, totalHeightPx: top };
}

/**
 * Pixels per minute along the shared axis: `pixelsPerHour`, stretched
 * so the visible range fills `availableWidthPx` when it would be
 * narrower (fit-to-width). `availableWidthPx <= 0` (not measured yet)
 * keeps `pixelsPerHour`.
 */
export function timeRowsPxPerMinute(
  pixelsPerHour: number,
  totalHours: number,
  availableWidthPx: number,
): number {
  const base = pixelsPerHour / 60;
  if (availableWidthPx <= 0 || totalHours <= 0) return base;
  return Math.max(base, availableWidthPx / (totalHours * 60));
}

/** Index of the row under `y` (px from the top of the first row), or `null` outside. */
export function rowIndexAtY(
  rows: ReadonlyArray<Pick<TimeRow, 'topPx' | 'heightPx'>>,
  y: number,
): number | null {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (y >= r.topPx && y < r.topPx + r.heightPx) return i;
  }
  return null;
}
