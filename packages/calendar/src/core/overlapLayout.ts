/**
 * Multi-day-bar layout via interval-graph coloring.
 *
 * The classic calendar problem: given N events that span ranges of
 * columns (e.g. days within a week row, or hours within a day
 * column), assign each event a lane (vertical row inside the cell)
 * such that no two events share a (lane × column) cell.
 *
 * Interval graphs are *perfect graphs*: their chromatic number
 * equals their clique number. Greedy first-fit coloring sorted by
 * start position is optimal — it uses the minimum number of lanes
 * needed (= maximum overlap depth at any column).
 *
 * ── Algorithm ─────────────────────────────────────────────────────
 *
 * 1. Sort intervals by start ASC, then by end DESC, then by id ASC
 *    (the secondary keys break ties deterministically; the primary
 *    key is what makes the algorithm work).
 * 2. Maintain a min-heap of `(endCol, laneId)` for intervals currently
 *    active at the cursor's column. The heap top is the lane that
 *    will free up earliest.
 * 3. For each interval in sorted order:
 *    a. Pop from the heap every entry whose `endCol < interval.start`
 *       (those lanes are now free).
 *    b. Pick the lowest-numbered free lane. We track free lanes in a
 *       separate min-heap so this is O(log n).
 *    c. Assign the interval that lane and push `(interval.end, lane)`
 *       onto the active heap.
 *
 * Total: O(n log n). For n = 1.000 events that's ~ 10.000 heap ops,
 * each a handful of array accesses — sub-millisecond on Tier A.
 *
 * ── Why a separate "free lane" structure ──────────────────────────
 *
 * Without it, "lowest-numbered free lane" would require scanning all
 * possibly-free lanes at each step → O(n²) in the worst case.
 *
 * The free-lane heap stores lane-ids in ascending order. When a lane
 * becomes free (its interval expired), we push it back. When we need
 * a lane, we pop the smallest. If the heap is empty, we allocate a
 * new lane (`laneCount++`).
 *
 * The implementation here uses simple binary heaps in flat arrays —
 * no library dependency, ~ 30 lines, easy to verify.
 */

export interface IntervalInput {
  /** Stable identifier preserved into the output. */
  id: string;
  /** Inclusive start column. */
  start: number;
  /** Inclusive end column. `end >= start`. */
  end: number;
}

export interface IntervalLayout {
  id: string;
  /** Assigned lane. 0-indexed. Stable across calls for the same input. */
  lane: number;
  start: number;
  end: number;
}

export interface LayoutResult {
  /** One entry per input interval, in unspecified output order. */
  bars: ReadonlyArray<IntervalLayout>;
  /**
   * Number of distinct lanes used. Equals the maximum overlap depth
   * at any column (= clique number of the interval graph).
   */
  laneCount: number;
}

// ─── Internal: simple binary min-heap ─────────────────────────────────
//
// Stored as a flat `number[]`. We keep two heaps:
//   - active: heap of `endCol` values, with each entry tagged by a
//     parallel `lanes` array.
//   - free: heap of free lane indices, ascending.
//
// Heap ops on Tier A measure ~ 50 ns. For n = 1000 we do ~ 4n ops
// = 4 µs. Negligible.

function heapPush(values: number[], v: number): void {
  values.push(v);
  let i = values.length - 1;
  while (i > 0) {
    const parent = (i - 1) >>> 1;
    if (values[parent] <= values[i]) break;
    [values[parent], values[i]] = [values[i], values[parent]];
    i = parent;
  }
}

function heapPop(values: number[]): number {
  const top = values[0];
  const last = values.pop() as number;
  if (values.length > 0) {
    values[0] = last;
    let i = 0;
    const n = values.length;
    while (true) {
      const l = i * 2 + 1;
      const r = l + 1;
      let smallest = i;
      if (l < n && values[l] < values[smallest]) smallest = l;
      if (r < n && values[r] < values[smallest]) smallest = r;
      if (smallest === i) break;
      [values[i], values[smallest]] = [values[smallest], values[i]];
      i = smallest;
    }
  }
  return top;
}

// Parallel-array heap for `(endCol, laneId)` pairs ordered by endCol.
// We can't store pairs in a plain number[], so we use two arrays and
// move entries together.
function pairPush(ends: number[], lanes: number[], end: number, lane: number): void {
  ends.push(end);
  lanes.push(lane);
  let i = ends.length - 1;
  while (i > 0) {
    const parent = (i - 1) >>> 1;
    if (ends[parent] <= ends[i]) break;
    [ends[parent], ends[i]] = [ends[i], ends[parent]];
    [lanes[parent], lanes[i]] = [lanes[i], lanes[parent]];
    i = parent;
  }
}

function pairPeekEnd(ends: number[]): number {
  return ends.length > 0 ? ends[0] : Infinity;
}

function pairPop(ends: number[], lanes: number[]): { end: number; lane: number } {
  const top = { end: ends[0], lane: lanes[0] };
  const lastEnd = ends.pop() as number;
  const lastLane = lanes.pop() as number;
  if (ends.length > 0) {
    ends[0] = lastEnd;
    lanes[0] = lastLane;
    let i = 0;
    const n = ends.length;
    while (true) {
      const l = i * 2 + 1;
      const r = l + 1;
      let smallest = i;
      if (l < n && ends[l] < ends[smallest]) smallest = l;
      if (r < n && ends[r] < ends[smallest]) smallest = r;
      if (smallest === i) break;
      [ends[i], ends[smallest]] = [ends[smallest], ends[i]];
      [lanes[i], lanes[smallest]] = [lanes[smallest], lanes[i]];
      i = smallest;
    }
  }
  return top;
}

// ─── Main entry point ─────────────────────────────────────────────────

/**
 * Greedy interval-graph coloring. Given N intervals, returns each
 * interval annotated with a lane index such that no two intervals
 * share a (lane, column) cell. The number of lanes used is optimal
 * (= maximum overlap depth).
 *
 * Behavior on edge cases:
 *   - Empty input: `{ bars: [], laneCount: 0 }`.
 *   - Single interval: assigned lane 0; laneCount 1.
 *   - Non-overlapping intervals: all on lane 0; laneCount 1.
 *   - All intervals identical: each gets its own lane; laneCount = N.
 *   - `end < start` is rejected at input validation.
 *
 * Output order is NOT preserved from input — bars come out in the
 * order they were processed (sorted-by-start). The `id` field is
 * the stable handle.
 */
export function layoutOverlappingIntervals(
  intervals: ReadonlyArray<IntervalInput>,
): LayoutResult {
  const n = intervals.length;
  if (n === 0) return { bars: [], laneCount: 0 };

  // Validate + copy into a typed-friendly array.
  const sorted: IntervalInput[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const it = intervals[i];
    if (it.end < it.start) {
      throw new RangeError(
        `Interval "${it.id}" has end (${it.end}) < start (${it.start})`,
      );
    }
    sorted[i] = it;
  }

  // Sort by start ASC, end DESC, id ASC. The primary key is what makes
  // the greedy assignment optimal; the secondaries are for
  // determinism only.
  sorted.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.end !== b.end) return b.end - a.end;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Active intervals heap (min-heap of endCol with parallel lane[]).
  const activeEnds: number[] = [];
  const activeLanes: number[] = [];
  // Free lane indices, min-heap.
  const freeLanes: number[] = [];

  let laneCount = 0;
  const bars: IntervalLayout[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const iv = sorted[i];
    // Free lanes whose intervals ended strictly before this one starts.
    while (pairPeekEnd(activeEnds) < iv.start) {
      const { lane } = pairPop(activeEnds, activeLanes);
      heapPush(freeLanes, lane);
    }
    // Assign the lowest-numbered free lane, or allocate a new one.
    let lane: number;
    if (freeLanes.length > 0) {
      lane = heapPop(freeLanes);
    } else {
      lane = laneCount++;
    }
    pairPush(activeEnds, activeLanes, iv.end, lane);
    bars[i] = { id: iv.id, lane, start: iv.start, end: iv.end };
  }

  return { bars, laneCount };
}
