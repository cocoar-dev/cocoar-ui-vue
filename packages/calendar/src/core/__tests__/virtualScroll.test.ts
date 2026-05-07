/**
 * Pure-function range-math tests.
 *
 * The math here gets called on every scroll frame. Bugs surface as
 * "items pop in" / "blank rows" / "scroll position drifts" — visible
 * but extremely time-consuming to debug after the fact. Property tests
 * up front pay for themselves many times over.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MeasurementCache } from '../measurementCache';
import { getVisibleRange1D, getVisibleRange2D, computeAnchorAdjustment } from '../virtualScroll';

// ─── getVisibleRange1D — specific tests ──────────────────────────────────

describe('getVisibleRange1D — empty surface', () => {
  it('returns zero-range for itemCount = 0', () => {
    const c = new MeasurementCache(0, 80);
    const r = getVisibleRange1D(c, 0, 600, 3);
    expect(r).toEqual({ startIndex: 0, endIndex: 0, offset: 0, totalSize: 0 });
  });

  it('returns zero-range regardless of scroll/viewport', () => {
    const c = new MeasurementCache(0, 80);
    const r = getVisibleRange1D(c, 100, 600, 3);
    expect(r).toEqual({ startIndex: 0, endIndex: 0, offset: 0, totalSize: 0 });
  });
});

describe('getVisibleRange1D — uniform sizes', () => {
  // 100 items × 80 px = 8000 px total surface
  const c = new MeasurementCache(100, 80);

  it('renders the visible window plus overscan at the top', () => {
    // Viewport = first 600 px. Items 0–7 visible (8 items × 80 = 640 ≥ 600).
    // With overscan = 3: start at 0 (clamped), end at 8 + 3 = 11.
    const r = getVisibleRange1D(c, 0, 600, 3);
    expect(r.startIndex).toBe(0);
    expect(r.endIndex).toBe(11);
    expect(r.offset).toBe(0);
    expect(r.totalSize).toBe(8000);
  });

  it('renders the visible window plus overscan in the middle', () => {
    // scroll = 1000 px → first item containing 1000 is index 12 (12*80=960; end=1040)
    // bottom = 1600 px → item containing 1600 is 20
    // overscan = 3 → start = 9, end = 24
    const r = getVisibleRange1D(c, 1000, 600, 3);
    expect(r.startIndex).toBe(9);
    expect(r.endIndex).toBe(24);
    expect(r.offset).toBe(9 * 80);
    expect(r.totalSize).toBe(8000);
  });

  it('clamps overscan at the bottom', () => {
    // Scroll near the end. Last items have no items below to overscan into.
    const r = getVisibleRange1D(c, 7400, 600, 3);
    expect(r.endIndex).toBe(100);
    expect(r.startIndex).toBeGreaterThan(80);
  });

  it('handles zero overscan', () => {
    const r = getVisibleRange1D(c, 1000, 600, 0);
    expect(r.startIndex).toBe(12);
    expect(r.endIndex).toBe(21);
  });

  it('handles viewport larger than total surface', () => {
    const r = getVisibleRange1D(c, 0, 99999, 3);
    expect(r.startIndex).toBe(0);
    expect(r.endIndex).toBe(100);
  });

  it('handles zero viewport', () => {
    // With no viewport size, only the item at the scroll position is "visible";
    // overscan still extends out from there.
    const r = getVisibleRange1D(c, 1000, 0, 3);
    expect(r.endIndex - r.startIndex).toBeGreaterThan(0);
    expect(r.startIndex).toBeLessThanOrEqual(12);
    expect(r.endIndex).toBeGreaterThanOrEqual(13);
  });
});

describe('getVisibleRange1D — variable sizes', () => {
  it('respects measured sizes when computing the window', () => {
    const c = new MeasurementCache(20, 80);
    // Items 0–4 are 80 px each (= 400 px). Item 5 is huge: 1000 px.
    c.set(5, 1000);
    // Viewport: scroll = 0, size = 600 px.
    // Items 0–4 fill 0–400. Item 5 starts at 400 and extends to 1400.
    // With viewportSize = 600, the visible region is [0, 600), so item 5 IS
    // the bottom edge (the pixel 599 is inside item 5).
    const r = getVisibleRange1D(c, 0, 600, 0);
    expect(r.startIndex).toBe(0);
    expect(r.endIndex).toBe(6); // up to and including item 5
    expect(r.totalSize).toBe(20 * 80 + (1000 - 80));
  });

  it('offset matches prefixSum(startIndex) for variable sizes', () => {
    const c = new MeasurementCache(50, 80);
    c.set(10, 200);
    c.set(20, 30);
    c.set(30, 500);
    const r = getVisibleRange1D(c, 1500, 400, 2);
    expect(r.offset).toBe(c.prefixSum(r.startIndex));
  });
});

describe('getVisibleRange1D — input validation', () => {
  const c = new MeasurementCache(10, 80);
  it('rejects negative overscan', () => {
    expect(() => getVisibleRange1D(c, 0, 600, -1)).toThrow(RangeError);
  });
  it('rejects non-finite overscan', () => {
    expect(() => getVisibleRange1D(c, 0, 600, Infinity)).toThrow(RangeError);
    expect(() => getVisibleRange1D(c, 0, 600, NaN)).toThrow(RangeError);
  });
  it('rejects negative viewport', () => {
    expect(() => getVisibleRange1D(c, 0, -1, 3)).toThrow(RangeError);
  });
  it('rejects non-finite viewport', () => {
    expect(() => getVisibleRange1D(c, 0, NaN, 3)).toThrow(RangeError);
    expect(() => getVisibleRange1D(c, 0, Infinity, 3)).toThrow(RangeError);
  });
  it('handles negative scroll defensively (clamps to 0)', () => {
    const r = getVisibleRange1D(c, -100, 600, 3);
    expect(r.startIndex).toBe(0);
  });
  it('handles scroll past end defensively (clamps to total)', () => {
    const r = getVisibleRange1D(c, 99999, 600, 3);
    expect(r.endIndex).toBe(10);
  });
});

// ─── getVisibleRange1D — properties ──────────────────────────────────────

describe('getVisibleRange1D — properties (fast-check)', () => {
  const validInputArb = fc.record({
    count: fc.integer({ min: 0, max: 300 }),
    estimate: fc.integer({ min: 1, max: 200 }),
    ops: fc.array(fc.tuple(fc.integer({ min: 0 }), fc.integer({ min: 0, max: 500 })), {
      maxLength: 100,
    }),
    scroll: fc.integer({ min: 0, max: 100_000 }),
    viewport: fc.integer({ min: 0, max: 2000 }),
    overscan: fc.integer({ min: 0, max: 10 }),
  });

  it('startIndex and endIndex are within bounds', () => {
    fc.assert(
      fc.property(validInputArb, ({ count, estimate, ops, scroll, viewport, overscan }) => {
        const c = new MeasurementCache(count, estimate);
        for (const [rawIdx, size] of ops) {
          if (count === 0) continue;
          c.set(rawIdx % count, size);
        }
        const r = getVisibleRange1D(c, scroll, viewport, overscan);
        expect(r.startIndex).toBeGreaterThanOrEqual(0);
        expect(r.endIndex).toBeGreaterThanOrEqual(r.startIndex);
        expect(r.endIndex).toBeLessThanOrEqual(count);
      }),
      { numRuns: 300 },
    );
  });

  it('offset === prefixSum(startIndex) and totalSize === prefixSum(itemCount)', () => {
    fc.assert(
      fc.property(validInputArb, ({ count, estimate, ops, scroll, viewport, overscan }) => {
        const c = new MeasurementCache(count, estimate);
        for (const [rawIdx, size] of ops) {
          if (count === 0) continue;
          c.set(rawIdx % count, size);
        }
        const r = getVisibleRange1D(c, scroll, viewport, overscan);
        expect(r.offset).toBe(c.prefixSum(r.startIndex));
        expect(r.totalSize).toBe(c.totalSize());
      }),
      { numRuns: 300 },
    );
  });

  it('the rendered range covers every item that intersects the viewport', () => {
    // For every item `i` whose visible region (after clamping scroll) is
    // non-empty, `i` must be inside `[startIndex, endIndex)`.
    fc.assert(
      fc.property(validInputArb, ({ count, estimate, ops, scroll, viewport, overscan }) => {
        if (count === 0) return;
        const c = new MeasurementCache(count, estimate);
        for (const [rawIdx, size] of ops) c.set(rawIdx % count, size);

        const total = c.totalSize();
        const clampedScroll = Math.max(0, Math.min(scroll, total));
        const r = getVisibleRange1D(c, scroll, viewport, overscan);

        const visStart = clampedScroll;
        const visEnd = clampedScroll + viewport;

        for (let i = 0; i < count; i++) {
          const itemStart = c.prefixSum(i);
          const itemEnd = itemStart + c.get(i);
          // Item intersects the visible region if its [start, end) overlaps
          // [visStart, visEnd). Items with size 0 don't intersect anything,
          // so they need not be rendered (and won't be).
          const intersects = c.get(i) > 0 && itemEnd > visStart && itemStart < visEnd;
          if (intersects) {
            expect(i).toBeGreaterThanOrEqual(r.startIndex);
            expect(i).toBeLessThan(r.endIndex);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it('overscan extends, never shrinks, the rendered range', () => {
    fc.assert(
      fc.property(validInputArb, ({ count, estimate, ops, scroll, viewport }) => {
        const c = new MeasurementCache(count, estimate);
        for (const [rawIdx, size] of ops) {
          if (count === 0) continue;
          c.set(rawIdx % count, size);
        }
        const r0 = getVisibleRange1D(c, scroll, viewport, 0);
        const r5 = getVisibleRange1D(c, scroll, viewport, 5);
        expect(r5.startIndex).toBeLessThanOrEqual(r0.startIndex);
        expect(r5.endIndex).toBeGreaterThanOrEqual(r0.endIndex);
      }),
      { numRuns: 200 },
    );
  });
});

// ─── computeAnchorAdjustment ─────────────────────────────────────────────

describe('computeAnchorAdjustment — specific cases', () => {
  it('returns 0 when nothing changes', () => {
    const a = new MeasurementCache(50, 80);
    const b = new MeasurementCache(50, 80);
    expect(computeAnchorAdjustment(a, b, 10)).toBe(0);
  });

  it('positive delta when items above grow', () => {
    const a = new MeasurementCache(50, 80);
    const b = new MeasurementCache(50, 80);
    b.set(3, 200); // item 3 grew by 120 px; item 10 is below it
    expect(computeAnchorAdjustment(a, b, 10)).toBe(120);
  });

  it('negative delta when items above shrink', () => {
    const a = new MeasurementCache(50, 80);
    a.set(3, 200);
    const b = new MeasurementCache(50, 80);
    expect(computeAnchorAdjustment(a, b, 10)).toBe(-120);
  });

  it('zero delta when items below the anchor change', () => {
    const a = new MeasurementCache(50, 80);
    const b = new MeasurementCache(50, 80);
    b.set(20, 500); // anchor is 10; item 20 is below — no impact
    expect(computeAnchorAdjustment(a, b, 10)).toBe(0);
  });

  it('rejects negative anchor index', () => {
    const a = new MeasurementCache(10, 80);
    const b = new MeasurementCache(10, 80);
    expect(() => computeAnchorAdjustment(a, b, -1)).toThrow(RangeError);
  });

  it('clamps anchor past the end (uses totalSize)', () => {
    const a = new MeasurementCache(10, 80);
    const b = new MeasurementCache(10, 80);
    b.set(3, 200);
    // Anchor = 999 → both prefixSums clamp to itemCount, so we get
    // totalSize(b) - totalSize(a) = +120
    expect(computeAnchorAdjustment(a, b, 999)).toBe(120);
  });
});

// ─── getVisibleRange2D ───────────────────────────────────────────────────

describe('getVisibleRange2D — composition', () => {
  it('is exactly two independent 1D calls (no cross-axis coupling)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 50_000 }),
        fc.integer({ min: 0, max: 50_000 }),
        fc.integer({ min: 0, max: 2000 }),
        fc.integer({ min: 0, max: 2000 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        (
          countX,
          estimateX,
          countY,
          estimateY,
          scrollX,
          scrollY,
          viewW,
          viewH,
          overX,
          overY,
        ) => {
          const cx = new MeasurementCache(countX, estimateX);
          const cy = new MeasurementCache(countY, estimateY);

          const r2 = getVisibleRange2D(
            cx, cy, scrollX, scrollY, viewW, viewH, overX, overY,
          );
          const rx = getVisibleRange1D(cx, scrollX, viewW, overX);
          const ry = getVisibleRange1D(cy, scrollY, viewH, overY);

          expect(r2.x).toEqual(rx);
          expect(r2.y).toEqual(ry);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('handles empty axes', () => {
    const cx = new MeasurementCache(0, 80);
    const cy = new MeasurementCache(10, 80);
    const r = getVisibleRange2D(cx, cy, 0, 0, 600, 600, 3, 3);
    expect(r.x).toEqual({ startIndex: 0, endIndex: 0, offset: 0, totalSize: 0 });
    expect(r.y.endIndex).toBeGreaterThan(0);
  });
});

describe('computeAnchorAdjustment — properties (fast-check)', () => {
  it('after applying delta, anchor viewport position is preserved', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.tuple(fc.integer({ min: 0 }), fc.integer({ min: 1, max: 500 })), {
          maxLength: 50,
        }),
        fc.array(fc.tuple(fc.integer({ min: 0 }), fc.integer({ min: 1, max: 500 })), {
          maxLength: 50,
        }),
        fc.integer({ min: 0 }),
        fc.integer({ min: 0, max: 50_000 }),
        (count, estimate, opsBefore, opsAfter, anchorRaw, oldScroll) => {
          const a = new MeasurementCache(count, estimate);
          for (const [rawIdx, size] of opsBefore) a.set(rawIdx % count, size);
          const b = new MeasurementCache(count, estimate);
          for (const [rawIdx, size] of opsBefore) b.set(rawIdx % count, size);
          for (const [rawIdx, size] of opsAfter) b.set(rawIdx % count, size);

          const anchor = anchorRaw % count;
          const delta = computeAnchorAdjustment(a, b, anchor);
          const newScroll = oldScroll + delta;

          // Viewport position of anchor = prefixSum(anchor) - scroll.
          // Must be the same in both states. Using subtraction instead of
          // direct equality sidesteps `-0 !== 0` under `Object.is`, which
          // is what `expect().toBe()` uses.
          const oldPos = a.prefixSum(anchor) - oldScroll;
          const newPos = b.prefixSum(anchor) - newScroll;
          expect(newPos - oldPos).toBe(0);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('symmetry: adjustment(a, b, anchor) === -adjustment(b, a, anchor)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.tuple(fc.integer({ min: 0 }), fc.integer({ min: 1, max: 500 })), {
          maxLength: 50,
        }),
        fc.array(fc.tuple(fc.integer({ min: 0 }), fc.integer({ min: 1, max: 500 })), {
          maxLength: 50,
        }),
        fc.integer({ min: 0 }),
        (count, estimate, opsA, opsB, anchorRaw) => {
          const a = new MeasurementCache(count, estimate);
          for (const [rawIdx, size] of opsA) a.set(rawIdx % count, size);
          const b = new MeasurementCache(count, estimate);
          for (const [rawIdx, size] of opsB) b.set(rawIdx % count, size);

          const anchor = anchorRaw % count;
          // Symmetry: f(a, b) + f(b, a) === 0. Phrased as a sum to avoid
          // `expect(x).toBe(-0)` failing under Object.is when the negation
          // produces `-0` and the expected is `+0`.
          const forward = computeAnchorAdjustment(a, b, anchor);
          const backward = computeAnchorAdjustment(b, a, anchor);
          expect(forward + backward).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });
});
