/**
 * Pure hit-test functions for drag-and-drop on a `<VirtualizedSurface*>`.
 *
 * "What item is the pointer over?" sounds simple. The DOM answer
 * (`document.elementFromPoint(x, y)`) is fine for static layouts but
 * breaks for virtualized surfaces in two ways:
 *
 *   1. The "item" the pointer is visually over might not be in the
 *      DOM at all — it's outside the rendered window.
 *   2. During fast drags, layout caching means the element returned
 *      by `elementFromPoint` lags pointer reality by a frame.
 *
 * Better: derive the answer from the math of the surface
 * (`MeasurementCache.indexAtOffset` + scroll position). That's what
 * the functions here do. They are O(log n) on the cache and have
 * zero DOM access. Tested with `fast-check`.
 *
 * The Vue composable (`useCoarDrag`) calls these on every
 * pointermove. At ~ 100 ns per call, a 60 Hz drag costs 6 µs/sec
 * — well below the noise floor.
 */

import type { MeasurementCache } from './measurementCache';

export interface VerticalHit {
  /** 0-based item index, or -1 if the pointer is outside the item region. */
  itemIndex: number;
  /**
   * Position within the item, 0..1. 0 = at the top edge, 1 = at the
   * bottom edge. Useful for "drop above/below" semantics: < 0.5 is
   * the top half, ≥ 0.5 is the bottom half.
   *
   * NaN if `itemIndex === -1`.
   */
  ratio: number;
  /**
   * Pixel offset within the item, 0..size. Cheaper than recomputing
   * for callers that need it.
   */
  pixelInItem: number;
}

/**
 * Hit-test a vertical surface (`<VirtualizedSurface1DY>` or any
 * scroll container with measured items). Returns which item the
 * pointer is over, plus the position within that item.
 *
 * @param pointerScreenY  the pointer's screen y-coordinate
 *                        (from `event.clientY`)
 * @param surfaceTopScreenY  the surface's top-edge screen y-coordinate
 *                           (from `surfaceEl.getBoundingClientRect().top`)
 * @param scrollTop  the surface's current `scrollTop`
 * @param measurements  the surface's measurement cache (or compatible
 *                      stand-in for fixed-size mode)
 * @param surfaceHeight  optional viewport height; if provided, points
 *                       outside `[surfaceTopScreenY, surfaceTopScreenY +
 *                       surfaceHeight)` return `itemIndex = -1`
 */
export function hitTestVerticalSurface(
  pointerScreenY: number,
  surfaceTopScreenY: number,
  scrollTop: number,
  measurements: MeasurementCache,
  surfaceHeight?: number,
): VerticalHit {
  if (measurements.itemCount === 0) {
    return { itemIndex: -1, ratio: NaN, pixelInItem: 0 };
  }

  // Pointer relative to the surface's viewport top edge.
  const yInViewport = pointerScreenY - surfaceTopScreenY;

  if (surfaceHeight !== undefined) {
    if (yInViewport < 0 || yInViewport >= surfaceHeight) {
      return { itemIndex: -1, ratio: NaN, pixelInItem: 0 };
    }
  }

  // Pointer relative to the surface's content (= virtual coord).
  const yInContent = yInViewport + scrollTop;

  if (yInContent < 0) return { itemIndex: -1, ratio: NaN, pixelInItem: 0 };

  const idx = measurements.indexAtOffset(yInContent);
  // `indexAtOffset` clamps to itemCount-1 for out-of-range offsets,
  // but we want -1 for offsets past the actual content.
  const total = measurements.totalSize();
  if (yInContent >= total) {
    return { itemIndex: -1, ratio: NaN, pixelInItem: 0 };
  }

  const itemTop = measurements.prefixSum(idx);
  const itemSize = measurements.get(idx);
  const pixelInItem = yInContent - itemTop;
  const ratio = itemSize > 0 ? pixelInItem / itemSize : 0;

  return { itemIndex: idx, ratio, pixelInItem };
}

// ─── Auto-scroll velocity ───────────────────────────────────────────

export interface AutoScrollOptions {
  /** Hot-zone thickness near each edge in pixels. Default 30. */
  hotZone?: number;
  /** Max scroll velocity in px/frame. Default 24 (≈ 1440 px/sec @ 60fps). */
  maxVelocity?: number;
  /**
   * Curve applied to the linear penetration ratio (0..1) before
   * scaling to velocity. `'linear'` is the default; `'quadratic'`
   * (the natural feeling — slow near the edge, fast at the corner)
   * applies `r^2`.
   */
  curve?: 'linear' | 'quadratic';
}

export interface AutoScrollResult {
  /**
   * Velocity in px/frame for the X axis. Negative = scroll up, 0 =
   * idle, positive = scroll down. (For X axis: negative = scroll
   * left, positive = scroll right.)
   */
  velocityX: number;
  velocityY: number;
}

/**
 * Compute auto-scroll velocity for a pointer position relative to the
 * surface viewport. Pure function — caller applies the velocity each
 * frame.
 *
 * @param pointerScreenX pointer's screen-x (from `clientX`)
 * @param pointerScreenY pointer's screen-y (from `clientY`)
 * @param surfaceRect  surface's `getBoundingClientRect()`-shaped
 *                     bounds (just the four numbers)
 */
export function computeAutoScrollVelocity(
  pointerScreenX: number,
  pointerScreenY: number,
  surfaceRect: { left: number; top: number; right: number; bottom: number },
  opts: AutoScrollOptions = {},
): AutoScrollResult {
  const hot = opts.hotZone ?? 30;
  const max = opts.maxVelocity ?? 24;
  const curve = opts.curve ?? 'linear';

  if (hot <= 0 || max <= 0) return { velocityX: 0, velocityY: 0 };

  const { left, top, right, bottom } = surfaceRect;

  // Distance into hot zone, normalized to [0, 1]. Negative when
  // outside the zone.
  const topDist = pointerScreenY - top; // distance from top edge, positive when below
  const bottomDist = bottom - pointerScreenY; // distance from bottom edge, positive when above
  const leftDist = pointerScreenX - left;
  const rightDist = right - pointerScreenX;

  function rampForDist(distFromEdge: number): number {
    if (distFromEdge >= hot) return 0;
    if (distFromEdge <= 0) return 1;
    const r = 1 - distFromEdge / hot;
    return curve === 'quadratic' ? r * r : r;
  }

  // Pointer must be inside the surface bounds at all (otherwise we
  // don't auto-scroll — the user's clearly outside).
  if (
    pointerScreenY < top ||
    pointerScreenY > bottom ||
    pointerScreenX < left ||
    pointerScreenX > right
  ) {
    return { velocityX: 0, velocityY: 0 };
  }

  const upRamp = rampForDist(topDist);
  const downRamp = rampForDist(bottomDist);
  const leftRamp = rampForDist(leftDist);
  const rightRamp = rampForDist(rightDist);

  // Net velocity: positive when in bottom hot zone, negative in top.
  const velocityY = (downRamp - upRamp) * max;
  const velocityX = (rightRamp - leftRamp) * max;
  return { velocityX, velocityY };
}
