/**
 * Tests for the drag hit-test pure functions.
 *
 * Two function families:
 *   - `hitTestVerticalSurface` — pointer → item index + ratio
 *   - `computeAutoScrollVelocity` — pointer position → scroll velocity
 *
 * The math is deterministic and operates on plain numbers; property
 * tests cover invariants over arbitrary inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  hitTestVerticalSurface,
  computeAutoScrollVelocity,
} from '../dragHitTest';
import { MeasurementCache } from '../measurementCache';

// ─── hitTestVerticalSurface — specific cases ────────────────────────

describe('hitTestVerticalSurface — edges', () => {
  it('returns -1 for an empty surface', () => {
    const cache = new MeasurementCache(0, 80);
    const r = hitTestVerticalSurface(100, 0, 0, cache);
    expect(r.itemIndex).toBe(-1);
    expect(r.ratio).toBeNaN();
  });

  it('returns -1 for points outside the viewport', () => {
    const cache = new MeasurementCache(10, 80);
    // Pointer 50px ABOVE surface top
    const r = hitTestVerticalSurface(50, 100, 0, cache, 600);
    expect(r.itemIndex).toBe(-1);
    // Pointer below surface bottom
    const r2 = hitTestVerticalSurface(800, 100, 0, cache, 600);
    expect(r2.itemIndex).toBe(-1);
  });

  it('returns -1 for points past the content end', () => {
    // 5 items × 80 px = 400 px content. Surface is 600 px tall.
    // Pointer at y=500 in viewport → content y=500. Past content end.
    const cache = new MeasurementCache(5, 80);
    const r = hitTestVerticalSurface(500, 0, 0, cache, 600);
    expect(r.itemIndex).toBe(-1);
  });

  it('hits item 0 at the top with ratio 0', () => {
    const cache = new MeasurementCache(10, 80);
    const r = hitTestVerticalSurface(0, 0, 0, cache);
    expect(r.itemIndex).toBe(0);
    expect(r.ratio).toBe(0);
    expect(r.pixelInItem).toBe(0);
  });

  it('hits item 0 in the middle', () => {
    const cache = new MeasurementCache(10, 80);
    const r = hitTestVerticalSurface(40, 0, 0, cache);
    expect(r.itemIndex).toBe(0);
    expect(r.ratio).toBe(0.5);
    expect(r.pixelInItem).toBe(40);
  });

  it('hits item 1 at column boundary', () => {
    const cache = new MeasurementCache(10, 80);
    const r = hitTestVerticalSurface(80, 0, 0, cache);
    expect(r.itemIndex).toBe(1);
    expect(r.ratio).toBe(0);
    expect(r.pixelInItem).toBe(0);
  });

  it('respects scrollTop', () => {
    const cache = new MeasurementCache(100, 80);
    // Scrolled 800 px down — item 10 is now at y=0.
    const r = hitTestVerticalSurface(0, 0, 800, cache);
    expect(r.itemIndex).toBe(10);
  });

  it('respects surface offset on screen', () => {
    const cache = new MeasurementCache(10, 80);
    // Surface starts at y=200 on the screen. Pointer at screen-y 240
    // is 40 into the surface viewport, so middle of item 0.
    const r = hitTestVerticalSurface(240, 200, 0, cache);
    expect(r.itemIndex).toBe(0);
    expect(r.ratio).toBe(0.5);
  });

  it('handles variable item sizes', () => {
    const cache = new MeasurementCache(5, 80);
    cache.set(0, 100); // 100 px
    cache.set(1, 50); // 50 px
    cache.set(2, 200); // 200 px
    // Item 0: y 0-99, item 1: y 100-149, item 2: y 150-349
    expect(hitTestVerticalSurface(50, 0, 0, cache).itemIndex).toBe(0);
    expect(hitTestVerticalSurface(120, 0, 0, cache).itemIndex).toBe(1);
    expect(hitTestVerticalSurface(200, 0, 0, cache).itemIndex).toBe(2);
    expect(hitTestVerticalSurface(200, 0, 0, cache).pixelInItem).toBe(50);
  });
});

describe('hitTestVerticalSurface — properties', () => {
  it('reports an itemIndex within [0, itemCount) when the point is inside content', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.tuple(fc.integer({ min: 0 }), fc.integer({ min: 1, max: 200 })), {
          maxLength: 50,
        }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 5000 }),
        (count, est, ops, scrollTop, pointerY) => {
          const c = new MeasurementCache(count, est);
          for (const [rawIdx, sz] of ops) c.set(rawIdx % count, sz);
          const r = hitTestVerticalSurface(pointerY, 0, scrollTop, c);
          if (r.itemIndex !== -1) {
            expect(r.itemIndex).toBeGreaterThanOrEqual(0);
            expect(r.itemIndex).toBeLessThan(count);
            expect(r.ratio).toBeGreaterThanOrEqual(0);
            expect(r.ratio).toBeLessThanOrEqual(1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('round-trip: hitTest at item-top → ratio 0 (and at item-bottom → ratio close to 1)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0 }),
        (count, est, scrollRaw) => {
          const c = new MeasurementCache(count, est);
          const scrollTop = scrollRaw % Math.max(1, c.totalSize());
          // Pick a random item and aim the pointer at its top.
          const targetIdx = Math.min(count - 1, scrollRaw % count);
          const itemTopInContent = c.prefixSum(targetIdx);
          const pointerY = itemTopInContent - scrollTop;
          if (pointerY < 0) return;
          const r = hitTestVerticalSurface(pointerY, 0, scrollTop, c);
          expect(r.itemIndex).toBe(targetIdx);
          expect(r.ratio).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── computeAutoScrollVelocity ──────────────────────────────────────

const RECT = { left: 100, top: 100, right: 700, bottom: 700 };

describe('computeAutoScrollVelocity — edges', () => {
  it('returns 0/0 when pointer is outside the surface', () => {
    expect(
      computeAutoScrollVelocity(50, 50, RECT),
    ).toEqual({ velocityX: 0, velocityY: 0 });
    expect(
      computeAutoScrollVelocity(800, 800, RECT),
    ).toEqual({ velocityX: 0, velocityY: 0 });
  });

  it('returns 0/0 in the centre of the surface (no hot zone)', () => {
    const r = computeAutoScrollVelocity(400, 400, RECT);
    expect(r.velocityX).toBe(0);
    expect(r.velocityY).toBe(0);
  });

  it('positive velocityY when pointer is in the bottom hot zone', () => {
    // 5 px from bottom (within default 30 px hot zone)
    const r = computeAutoScrollVelocity(400, 695, RECT);
    expect(r.velocityY).toBeGreaterThan(0);
  });

  it('negative velocityY when pointer is in the top hot zone', () => {
    const r = computeAutoScrollVelocity(400, 105, RECT);
    expect(r.velocityY).toBeLessThan(0);
  });

  it('positive velocityX in the right hot zone, negative in the left', () => {
    expect(computeAutoScrollVelocity(695, 400, RECT).velocityX).toBeGreaterThan(0);
    expect(computeAutoScrollVelocity(105, 400, RECT).velocityX).toBeLessThan(0);
  });

  it('caps velocity at maxVelocity', () => {
    const r = computeAutoScrollVelocity(400, 700, RECT, { maxVelocity: 24 });
    // Right at the bottom edge — full ramp
    expect(Math.abs(r.velocityY)).toBeLessThanOrEqual(24);
  });

  it('zero velocity right at the hot zone boundary', () => {
    // hotZone default = 30. Pointer at top + 30 = 130.
    const r = computeAutoScrollVelocity(400, 130, RECT);
    expect(r.velocityY).toBe(0);
  });

  it('quadratic curve produces smaller velocities far from the edge', () => {
    const linear = computeAutoScrollVelocity(400, 680, RECT, {
      curve: 'linear',
      maxVelocity: 100,
    });
    const quad = computeAutoScrollVelocity(400, 680, RECT, {
      curve: 'quadratic',
      maxVelocity: 100,
    });
    // 20 px from edge, 30 px hot zone → r = 0.333. Linear: 33.3.
    // Quadratic: 0.333² = 0.111 → 11.1.
    expect(quad.velocityY).toBeLessThan(linear.velocityY);
  });

  it('respects maxVelocity = 0 (disabled)', () => {
    const r = computeAutoScrollVelocity(400, 700, RECT, { maxVelocity: 0 });
    expect(r.velocityX).toBe(0);
    expect(r.velocityY).toBe(0);
  });
});

describe('computeAutoScrollVelocity — properties', () => {
  it('|velocityY| is monotonically non-decreasing as pointer moves toward the edge', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (steps) => {
        const last: number[] = [];
        for (let i = 0; i <= steps; i++) {
          const y = 100 + (30 * (steps - i)) / steps; // walk from y=130 (boundary) to y=100 (edge)
          const r = computeAutoScrollVelocity(400, y, RECT);
          last.push(Math.abs(r.velocityY));
        }
        for (let i = 1; i < last.length; i++) {
          expect(last[i]).toBeGreaterThanOrEqual(last[i - 1] - 1e-9);
        }
      }),
      { numRuns: 50 },
    );
  });
});
