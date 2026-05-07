/**
 * `MeasurementCache` tests.
 *
 * Two layers:
 *   - **Specific tests** — pin down concrete behavior (errors, edges,
 *     known computations).
 *   - **Property tests** (fast-check) — prove invariants over arbitrary
 *     input. These are the ones that catch the subtle off-by-ones.
 *
 * The cache is the foundation of variable-size virtualization. Every
 * scroll frame at 10k items goes through `prefixSum` and `indexAtOffset`.
 * If the math is wrong, every other test that depends on it lies.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MeasurementCache } from '../measurementCache';

// ─── Reference (slow but obviously-correct) implementation ────────────────
//
// Every property test below cross-checks against this reference. If both
// agree on an arbitrary input, we believe the fast version. Linear scans
// at 10k items would burn the scroll budget — but in test code, they're
// the source of truth.

class ReferenceCache {
  sizes: number[];
  measured: Set<number>;

  constructor(itemCount: number, estimatedSize: number) {
    this.sizes = Array(itemCount).fill(estimatedSize);
    this.measured = new Set();
  }

  set(index: number, size: number) {
    this.sizes[index] = size;
    this.measured.add(index);
  }

  unset(index: number, estimatedSize: number) {
    this.sizes[index] = estimatedSize;
    this.measured.delete(index);
  }

  prefixSum(index: number): number {
    if (index <= 0) return 0;
    const clamped = Math.min(index, this.sizes.length);
    let s = 0;
    for (let i = 0; i < clamped; i++) s += this.sizes[i];
    return s;
  }

  totalSize(): number {
    return this.prefixSum(this.sizes.length);
  }

  indexAtOffset(offset: number): number {
    if (this.sizes.length === 0) return 0;
    if (offset <= 0) return 0;
    let acc = 0;
    for (let i = 0; i < this.sizes.length; i++) {
      acc += this.sizes[i];
      if (acc > offset) return i;
    }
    return this.sizes.length - 1;
  }
}

// ─── Specific tests ───────────────────────────────────────────────────────

describe('MeasurementCache — construction', () => {
  it('rejects negative itemCount', () => {
    expect(() => new MeasurementCache(-1, 80)).toThrow(RangeError);
  });
  it('rejects non-finite itemCount', () => {
    expect(() => new MeasurementCache(Infinity, 80)).toThrow(RangeError);
    expect(() => new MeasurementCache(NaN, 80)).toThrow(RangeError);
  });
  it('rejects non-positive estimatedSize', () => {
    expect(() => new MeasurementCache(10, 0)).toThrow(RangeError);
    expect(() => new MeasurementCache(10, -5)).toThrow(RangeError);
  });
  it('rejects non-finite estimatedSize', () => {
    expect(() => new MeasurementCache(10, Infinity)).toThrow(RangeError);
    expect(() => new MeasurementCache(10, NaN)).toThrow(RangeError);
  });
  it('floors fractional itemCount', () => {
    const c = new MeasurementCache(10.7, 80);
    expect(c.itemCount).toBe(10);
  });
  it('accepts itemCount = 0', () => {
    const c = new MeasurementCache(0, 80);
    expect(c.itemCount).toBe(0);
    expect(c.totalSize()).toBe(0);
    expect(c.indexAtOffset(0)).toBe(0);
    expect(c.indexAtOffset(1000)).toBe(0);
  });
});

describe('MeasurementCache — basic queries on a fresh cache', () => {
  const c = new MeasurementCache(100, 80);

  it('reports estimate for any unmeasured index', () => {
    expect(c.get(0)).toBe(80);
    expect(c.get(50)).toBe(80);
    expect(c.get(99)).toBe(80);
  });

  it('has() is false for all indices', () => {
    expect(c.has(0)).toBe(false);
    expect(c.has(99)).toBe(false);
  });

  it('measuredCount is 0', () => {
    expect(c.measuredCount).toBe(0);
  });

  it('prefixSum is i × estimate', () => {
    expect(c.prefixSum(0)).toBe(0);
    expect(c.prefixSum(1)).toBe(80);
    expect(c.prefixSum(50)).toBe(50 * 80);
    expect(c.prefixSum(100)).toBe(100 * 80);
  });

  it('totalSize is itemCount × estimate', () => {
    expect(c.totalSize()).toBe(100 * 80);
  });

  it('indexAtOffset bisects evenly', () => {
    expect(c.indexAtOffset(0)).toBe(0);
    expect(c.indexAtOffset(79)).toBe(0); // last px of item 0
    expect(c.indexAtOffset(80)).toBe(1); // first px of item 1
    expect(c.indexAtOffset(160)).toBe(2);
    // Way past the end clamps to itemCount - 1
    expect(c.indexAtOffset(99999)).toBe(99);
  });
});

describe('MeasurementCache — set/unset', () => {
  it('rejects out-of-range index', () => {
    const c = new MeasurementCache(10, 80);
    expect(() => c.set(-1, 50)).toThrow(RangeError);
    expect(() => c.set(10, 50)).toThrow(RangeError);
    expect(() => c.unset(-1)).toThrow(RangeError);
    expect(() => c.unset(10)).toThrow(RangeError);
  });
  it('rejects negative or non-finite size', () => {
    const c = new MeasurementCache(10, 80);
    expect(() => c.set(0, -1)).toThrow(RangeError);
    expect(() => c.set(0, Infinity)).toThrow(RangeError);
    expect(() => c.set(0, NaN)).toThrow(RangeError);
  });
  it('accepts size 0', () => {
    const c = new MeasurementCache(10, 80);
    c.set(5, 0);
    expect(c.get(5)).toBe(0);
    expect(c.has(5)).toBe(true);
  });
  it('idempotent set with same value', () => {
    const c = new MeasurementCache(10, 80);
    c.set(3, 200);
    const before = c.totalSize();
    c.set(3, 200);
    expect(c.totalSize()).toBe(before);
    expect(c.measuredCount).toBe(1);
  });
  it('unset on un-measured index is a no-op', () => {
    const c = new MeasurementCache(10, 80);
    c.unset(5);
    expect(c.measuredCount).toBe(0);
    expect(c.totalSize()).toBe(800);
  });
  it('unset reverts to estimate', () => {
    const c = new MeasurementCache(10, 80);
    c.set(3, 250);
    expect(c.totalSize()).toBe(800 + (250 - 80));
    c.unset(3);
    expect(c.totalSize()).toBe(800);
    expect(c.has(3)).toBe(false);
  });
});

describe('MeasurementCache — clear / resize', () => {
  it('clear removes all measurements', () => {
    const c = new MeasurementCache(100, 80);
    c.set(10, 200);
    c.set(50, 30);
    c.clear();
    expect(c.measuredCount).toBe(0);
    expect(c.totalSize()).toBe(100 * 80);
    expect(c.has(10)).toBe(false);
  });

  it('resize to larger preserves existing measurements', () => {
    const c = new MeasurementCache(10, 80);
    c.set(5, 200);
    c.resize(20);
    expect(c.itemCount).toBe(20);
    expect(c.get(5)).toBe(200);
    expect(c.totalSize()).toBe(20 * 80 + (200 - 80));
  });

  it('resize to smaller drops out-of-range measurements', () => {
    const c = new MeasurementCache(10, 80);
    c.set(2, 200);
    c.set(7, 300);
    c.resize(5);
    expect(c.itemCount).toBe(5);
    expect(c.get(2)).toBe(200);
    expect(c.has(7)).toBe(false);
    expect(c.totalSize()).toBe(5 * 80 + (200 - 80));
  });

  it('resize to 0 produces an empty cache', () => {
    const c = new MeasurementCache(10, 80);
    c.set(5, 200);
    c.resize(0);
    expect(c.itemCount).toBe(0);
    expect(c.totalSize()).toBe(0);
    expect(c.measuredCount).toBe(0);
  });

  it('resize to same count is a no-op', () => {
    const c = new MeasurementCache(10, 80);
    c.set(5, 200);
    const total = c.totalSize();
    c.resize(10);
    expect(c.totalSize()).toBe(total);
  });
});

// ─── Property tests ───────────────────────────────────────────────────────

describe('MeasurementCache — properties (fast-check)', () => {
  // Bounded inputs: itemCount up to 500 keeps tests fast (< 1s overall) but
  // still exercises a fenwick tree of depth 9.
  const itemCountArb = fc.integer({ min: 0, max: 500 });
  const estimateArb = fc.integer({ min: 1, max: 200 });
  const sizeArb = fc.integer({ min: 0, max: 1000 });

  it('totalSize === sum of get(i) for all i', () => {
    fc.assert(
      fc.property(
        itemCountArb,
        estimateArb,
        fc.array(fc.tuple(fc.integer({ min: 0 }), sizeArb), { maxLength: 100 }),
        (count, estimate, ops) => {
          const c = new MeasurementCache(count, estimate);
          for (const [rawIdx, size] of ops) {
            if (count === 0) continue;
            const idx = rawIdx % count;
            c.set(idx, size);
          }
          let manual = 0;
          for (let i = 0; i < count; i++) manual += c.get(i);
          expect(c.totalSize()).toBe(manual);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('prefixSum is monotonically non-decreasing', () => {
    fc.assert(
      fc.property(
        itemCountArb,
        estimateArb,
        fc.array(fc.tuple(fc.integer({ min: 0 }), sizeArb), { maxLength: 100 }),
        (count, estimate, ops) => {
          const c = new MeasurementCache(count, estimate);
          for (const [rawIdx, size] of ops) {
            if (count === 0) continue;
            c.set(rawIdx % count, size);
          }
          let prev = 0;
          for (let i = 0; i <= count; i++) {
            const cur = c.prefixSum(i);
            expect(cur).toBeGreaterThanOrEqual(prev);
            prev = cur;
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('prefixSum(i + 1) - prefixSum(i) === get(i)', () => {
    fc.assert(
      fc.property(
        itemCountArb,
        estimateArb,
        fc.array(fc.tuple(fc.integer({ min: 0 }), sizeArb), { maxLength: 100 }),
        (count, estimate, ops) => {
          const c = new MeasurementCache(count, estimate);
          for (const [rawIdx, size] of ops) {
            if (count === 0) continue;
            c.set(rawIdx % count, size);
          }
          for (let i = 0; i < count; i++) {
            // Use approx because we deal with integer sizes; prefix-sum diff
            // must equal get(i) exactly.
            expect(c.prefixSum(i + 1) - c.prefixSum(i)).toBe(c.get(i));
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('matches the reference implementation on arbitrary set/unset sequences', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 1, max: 100 }),
        fc.array(
          fc.oneof(
            fc.tuple(fc.constant('set' as const), fc.integer({ min: 0 }), sizeArb),
            fc.tuple(fc.constant('unset' as const), fc.integer({ min: 0 }), fc.constant(0)),
          ),
          { maxLength: 200 },
        ),
        (count, estimate, ops) => {
          const fast = new MeasurementCache(count, estimate);
          const ref = new ReferenceCache(count, estimate);

          for (const op of ops) {
            const idx = op[1] % count;
            if (op[0] === 'set') {
              fast.set(idx, op[2]);
              ref.set(idx, op[2]);
            } else {
              fast.unset(idx);
              ref.unset(idx, estimate);
            }
          }

          expect(fast.totalSize()).toBe(ref.totalSize());
          for (let i = 0; i <= count; i++) {
            expect(fast.prefixSum(i)).toBe(ref.prefixSum(i));
          }
          // Spot-check a few indexAtOffset values across the range.
          const total = ref.totalSize();
          if (total > 0) {
            const probes = [0, Math.floor(total / 4), Math.floor(total / 2), total - 1, total];
            for (const p of probes) {
              expect(fast.indexAtOffset(p)).toBe(ref.indexAtOffset(p));
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('indexAtOffset(prefixSum(i)) === i for any measured index i', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.tuple(fc.integer({ min: 0 }), fc.integer({ min: 1, max: 500 })), {
          maxLength: 100,
        }),
        (count, estimate, ops) => {
          const c = new MeasurementCache(count, estimate);
          for (const [rawIdx, size] of ops) {
            c.set(rawIdx % count, size);
          }
          for (let i = 0; i < count; i++) {
            // The pixel exactly at prefixSum(i) is the FIRST pixel of item i,
            // so indexAtOffset should report i. (Unless item i has zero size
            // and is followed by items, in which case it's the next non-zero
            // item — skip that edge to keep this property clean.)
            if (c.get(i) === 0) continue;
            const offset = c.prefixSum(i);
            expect(c.indexAtOffset(offset)).toBe(i);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('indexAtOffset always returns a valid index (or 0 for empty)', () => {
    fc.assert(
      fc.property(
        itemCountArb,
        estimateArb,
        fc.array(fc.tuple(fc.integer({ min: 0 }), sizeArb), { maxLength: 50 }),
        fc.integer({ min: -1000, max: 1_000_000 }),
        (count, estimate, ops, probe) => {
          const c = new MeasurementCache(count, estimate);
          for (const [rawIdx, size] of ops) {
            if (count === 0) continue;
            c.set(rawIdx % count, size);
          }
          const result = c.indexAtOffset(probe);
          expect(Number.isInteger(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(0);
          if (count === 0) {
            expect(result).toBe(0);
          } else {
            expect(result).toBeLessThan(count);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
