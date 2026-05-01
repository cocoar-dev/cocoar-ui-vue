/**
 * Pure-function range math for the virtualization subsystem.
 *
 * The functions here have ZERO side effects, ZERO DOM access, ZERO Vue
 * reactivity. They are the math kernel that the `<VirtualizedSurface*>`
 * components consume on every scroll frame.
 *
 * 2D virtualization is two independent 1D ranges side-by-side. There is no
 * separate 2D math here — the 2D component composes the 1D primitives once
 * per axis. This keeps the kernel small and lets us prove correctness of
 * the 2D case from the 1D case (see virtualScroll.test.ts).
 */

import { MeasurementCache } from './measurementCache';

export interface Range1D {
  /** Index of the first item to render (inclusive). */
  startIndex: number;
  /** Index just past the last item to render (exclusive). */
  endIndex: number;
  /**
   * Pixels to translate the rendered window's first item by. Equals
   * `prefixSum(startIndex)`. The component subtracts the scroll offset
   * from this when applying the actual transform.
   */
  offset: number;
  /**
   * Total pixels of all items. Used to size the scroll spacer so the
   * native scrollbar tracks the full virtual length.
   */
  totalSize: number;
}

/**
 * Compute which items should be in the rendered window for a given scroll
 * position.
 *
 * @param measurements  size cache (also encodes `itemCount`)
 * @param scrollOffset  current scroll position in pixels (0 = top)
 * @param viewportSize  visible viewport size in pixels
 * @param overscan      number of extra items to render beyond the visible
 *                      window in each direction (default 3)
 *
 * Invariants (proven in tests):
 *   - 0 ≤ startIndex ≤ endIndex ≤ itemCount
 *   - offset === prefixSum(startIndex)
 *   - totalSize === prefixSum(itemCount)
 *   - Every pixel in `[scrollOffset, scrollOffset + viewportSize)` that
 *     intersects an item is covered by the rendered range
 *     `[startIndex, endIndex)`
 *   - Empty surface (itemCount === 0) returns `{ 0, 0, 0, 0 }`
 */
export function getVisibleRange1D(
  measurements: MeasurementCache,
  scrollOffset: number,
  viewportSize: number,
  overscan = 3,
): Range1D {
  if (measurements.itemCount === 0) {
    return { startIndex: 0, endIndex: 0, offset: 0, totalSize: 0 };
  }
  if (overscan < 0 || !Number.isFinite(overscan)) {
    throw new RangeError(`overscan must be a non-negative finite number, got ${overscan}`);
  }
  if (viewportSize < 0 || !Number.isFinite(viewportSize)) {
    throw new RangeError(`viewportSize must be a non-negative finite number, got ${viewportSize}`);
  }

  const totalSize = measurements.totalSize();

  // Defensive clamp — caller should already limit scroll, but the math
  // must not produce nonsense for out-of-range inputs.
  const clampedScroll = scrollOffset < 0
    ? 0
    : scrollOffset > totalSize
      ? totalSize
      : scrollOffset;

  // First item whose end > clampedScroll. `indexAtOffset` returns the item
  // containing the pixel at the given offset, which is exactly what we want
  // for the upper edge of the visible region.
  const firstVisible = measurements.indexAtOffset(clampedScroll);

  // Last item whose start < clampedScroll + viewport. We want the index
  // *past* it, so we ask for the item containing the bottom pixel and add
  // 1 — clamped to itemCount.
  const bottomEdge = clampedScroll + viewportSize;
  const lastVisible = bottomEdge >= totalSize
    ? measurements.itemCount - 1
    : measurements.indexAtOffset(bottomEdge);

  const startIndex = Math.max(0, firstVisible - Math.floor(overscan));
  const endIndex = Math.min(measurements.itemCount, lastVisible + 1 + Math.floor(overscan));

  const offset = measurements.prefixSum(startIndex);

  return { startIndex, endIndex, offset, totalSize };
}

/**
 * 2D visible range — produced by composing two 1D ranges, one per axis.
 *
 * 2D virtualization is, at the math layer, nothing more than two
 * independent 1D ranges side-by-side. There is no shared state between
 * the axes; this `Range2D` type is just the natural pair shape returned
 * by `getVisibleRange2D` for consumers that want both ranges at once.
 *
 * The Vue 2D surface component (`<VirtualizedSurface2D>`) renders the
 * Cartesian product of `x` and `y` as absolutely-positioned cells.
 */
export interface Range2D {
  x: Range1D;
  y: Range1D;
}

/**
 * Compose two `getVisibleRange1D` calls into a 2D range.
 *
 * The 2D surface's responsibility is just to render the Cartesian
 * product of `[x.startIndex, x.endIndex)` × `[y.startIndex, y.endIndex)`
 * with each cell positioned at `(prefixSum_x(cx), prefixSum_y(cy))`.
 *
 * Provided as a thin convenience so the 2D component doesn't need to
 * manage two separate range computations directly. Same overscan, same
 * input validation rules as the 1D function, applied per axis.
 */
export function getVisibleRange2D(
  measurementsX: MeasurementCache,
  measurementsY: MeasurementCache,
  scrollX: number,
  scrollY: number,
  viewportWidth: number,
  viewportHeight: number,
  overscanX = 3,
  overscanY = 3,
): Range2D {
  return {
    x: getVisibleRange1D(measurementsX, scrollX, viewportWidth, overscanX),
    y: getVisibleRange1D(measurementsY, scrollY, viewportHeight, overscanY),
  };
}

/**
 * When item sizes change (new measurements, items inserted/removed above
 * the viewport), the scroll offset must be adjusted so the user-visible
 * content stays where it is. This function returns the **delta** to add
 * to `scrollOffset` to keep `anchorIndex`'s viewport position constant.
 *
 * The math is deliberately one-line:
 *
 *   viewportPos(item) = prefixSum(item) - scrollOffset
 *
 *   We want: newPrefixSum(anchor) - newScroll = oldPrefixSum(anchor) - oldScroll
 *   =>       newScroll - oldScroll = newPrefixSum(anchor) - oldPrefixSum(anchor)
 *   =>       delta = newPrefixSum(anchor) - oldPrefixSum(anchor)
 *
 * The function does NOT mutate scroll. The caller (the component) decides
 * whether to apply the delta — it may want to animate, debounce, or skip
 * if the user is actively scrolling.
 *
 * @param oldMeasurements  cache state BEFORE the size change
 * @param newMeasurements  cache state AFTER the size change
 * @param anchorIndex      the item we want to keep visually stable
 * @returns                pixels to add to scroll offset (positive = scroll
 *                         further down to compensate for items growing)
 */
export function computeAnchorAdjustment(
  oldMeasurements: MeasurementCache,
  newMeasurements: MeasurementCache,
  anchorIndex: number,
): number {
  if (anchorIndex < 0) {
    throw new RangeError(`anchorIndex must be non-negative, got ${anchorIndex}`);
  }
  // prefixSum clamps `index > itemCount` to `itemCount`, so this works
  // even if the anchor falls past the end of one of the caches (e.g.
  // after a `resize()`).
  const oldPrefix = oldMeasurements.prefixSum(anchorIndex);
  const newPrefix = newMeasurements.prefixSum(anchorIndex);
  return newPrefix - oldPrefix;
}
