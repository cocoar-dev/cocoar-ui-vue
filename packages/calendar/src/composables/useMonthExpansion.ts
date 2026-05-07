/**
 * `useMonthExpansion` — month-view row-expansion + overflow detection.
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
 *   - the overflow-detection — runs in `nextTick` after every
 *     layout / events / row-height change, plus on window resize
 *
 * Pill heights are NOT assumed (consumers can pass custom
 * `#pill` slots with arbitrary heights), so we never count
 * events; we only know whether the pills CONTAINER overflows.
 */

import {
  type ComputedRef,
  type Ref,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import type { MonthLayout } from '../core';

const BAR_HEIGHT = 20;
const BAR_GAP = 2;
/** Pixels reserved at the top of each cell for the day-number badge. */
const DAY_NUMBER_HEIGHT = 24;
/** Minimum vertical space below the bar lanes for the pills
 *  area in a collapsed row. Tuned so an empty cell still reads
 *  comfortably; pills overflow into a scroll. */
const COLLAPSED_PILLS_AREA = 76;
const MIN_ROW_HEIGHT = 100;
const MAX_ROW_HEIGHT = 300;

export interface UseMonthExpansionOptions {
  /** Pixel-perfect month layout from `layoutMonthGrid`. */
  layout: ComputedRef<MonthLayout> | Ref<MonthLayout>;
  /** Rows-container element used to query cell overflow. */
  gridRef: Ref<HTMLElement | null>;
  /** Reactive token that resets expansion when the visible
   *  month changes (typically a `Temporal.PlainYearMonth`). */
  resetToken: ComputedRef<unknown> | Ref<unknown>;
}

export interface UseMonthExpansionReturn {
  /** Constants exposed for the parent's bar geometry math. */
  readonly BAR_HEIGHT: number;
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

  /** dateKey-keyed set of cells whose pill list outgrows their
   *  slot (pills container scrolls). */
  overflowingCells: Ref<Set<string>>;
}

export function useMonthExpansion(
  opts: UseMonthExpansionOptions,
): UseMonthExpansionReturn {
  function barTopPx(lane: number): number {
    return DAY_NUMBER_HEIGHT + lane * (BAR_HEIGHT + BAR_GAP);
  }

  /** For each row, compute how many lanes the multi-day bars
   *  occupy (so the cell-pill block knows where to start
   *  vertically). */
  const rowBarHeightsPx = computed(() => {
    return opts.layout.value.weekRows.map((row) => {
      if (row.multiDayBars.length === 0) return DAY_NUMBER_HEIGHT;
      const lanes = row.multiDayBars[0].laneCount;
      return DAY_NUMBER_HEIGHT + lanes * (BAR_HEIGHT + BAR_GAP);
    });
  });

  /** Single-row expansion: opening one row collapses any other.
   *  Keeps the grid visually compact and matches the convention
   *  users know from accordion-style tables. */
  const expandedRows = ref<Set<number>>(new Set());

  const rowHeightPx = computed(() => {
    return rowBarHeightsPx.value.map((barAreaHeight, rowIdx) => {
      if (expandedRows.value.has(rowIdx)) return MAX_ROW_HEIGHT;
      return Math.max(MIN_ROW_HEIGHT, barAreaHeight + COLLAPSED_PILLS_AREA);
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

  // Per-cell overflow detection — `dateKey` → does this cell's
  // pill list outgrow the available space at the current row
  // height? Re-measured after layout via `refreshOverflow()`.
  const overflowingCells = ref<Set<string>>(new Set());

  function refreshOverflow(): void {
    const grid = opts.gridRef.value;
    if (!grid) return;
    const next = new Set<string>();
    const cells = grid.querySelectorAll<HTMLElement>('[data-day-key]');
    cells.forEach((cell) => {
      const pills = cell.querySelector<HTMLElement>('.coar-month-cell__pills');
      if (!pills) return;
      if (pills.scrollHeight > pills.clientHeight + 1) {
        const k = cell.getAttribute('data-day-key');
        if (k) next.add(k);
      }
    });
    // Avoid setting a brand-new Set every tick if nothing changed —
    // keeps reactive consumers from re-running for no reason.
    const curr = overflowingCells.value;
    if (curr.size === next.size) {
      let same = true;
      for (const k of next) {
        if (!curr.has(k)) {
          same = false;
          break;
        }
      }
      if (same) return;
    }
    overflowingCells.value = next;
  }

  // Recompute overflow after every layout / row-height /
  // expansion change. `nextTick` waits for Vue to finish
  // rendering.
  watch(
    [opts.layout, rowHeightPx, expandedRows],
    () => nextTick(refreshOverflow),
    { deep: false },
  );
  onMounted(() => {
    nextTick(refreshOverflow);
    window.addEventListener('resize', refreshOverflow);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('resize', refreshOverflow);
  });

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
    overflowingCells,
  };
}
