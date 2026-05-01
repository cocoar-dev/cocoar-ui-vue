/**
 * Tests for `layoutOverlappingIntervals`.
 *
 * The algorithm is interval-graph coloring — well-studied
 * combinatorial math, but easy to get wrong on edge cases (empty
 * input, all-equal intervals, ties on start). Property tests prove
 * the correctness invariants over arbitrary inputs; specific tests
 * pin down the edge cases.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  layoutOverlappingIntervals,
  type IntervalInput,
  type IntervalLayout,
} from '../overlapLayout';

// ─── Reference: slow but obviously-correct overlap-depth ─────────────
//
// For any column `c`, count how many intervals span it. The maximum
// over all columns is the chromatic number of the interval graph,
// i.e. the minimum number of lanes needed. The algorithm under test
// must use exactly this many.

function maxOverlapDepth(intervals: ReadonlyArray<IntervalInput>): number {
  if (intervals.length === 0) return 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const iv of intervals) {
    if (iv.start < lo) lo = iv.start;
    if (iv.end > hi) hi = iv.end;
  }
  let max = 0;
  for (let c = lo; c <= hi; c++) {
    let depth = 0;
    for (const iv of intervals) {
      if (iv.start <= c && c <= iv.end) depth++;
    }
    if (depth > max) max = depth;
  }
  return max;
}

// ─── Specific tests ──────────────────────────────────────────────────

describe('layoutOverlappingIntervals — edges', () => {
  it('returns empty result for empty input', () => {
    expect(layoutOverlappingIntervals([])).toEqual({ bars: [], laneCount: 0 });
  });

  it('assigns lane 0 to a single interval', () => {
    const r = layoutOverlappingIntervals([{ id: 'a', start: 0, end: 6 }]);
    expect(r.bars).toEqual([{ id: 'a', lane: 0, start: 0, end: 6 }]);
    expect(r.laneCount).toBe(1);
  });

  it('places non-overlapping intervals on lane 0', () => {
    const r = layoutOverlappingIntervals([
      { id: 'a', start: 0, end: 1 },
      { id: 'b', start: 2, end: 3 },
      { id: 'c', start: 4, end: 5 },
    ]);
    expect(r.laneCount).toBe(1);
    for (const b of r.bars) expect(b.lane).toBe(0);
  });

  it('handles touching intervals (a.end + 1 === b.start) on the same lane', () => {
    const r = layoutOverlappingIntervals([
      { id: 'a', start: 0, end: 2 },
      { id: 'b', start: 3, end: 5 },
    ]);
    expect(r.laneCount).toBe(1);
  });

  it('separates touching-via-overlap intervals (a.end === b.start) into 2 lanes', () => {
    // [0,2] and [2,4] both contain column 2 → must be on different lanes.
    const r = layoutOverlappingIntervals([
      { id: 'a', start: 0, end: 2 },
      { id: 'b', start: 2, end: 4 },
    ]);
    expect(r.laneCount).toBe(2);
    const a = r.bars.find((b) => b.id === 'a')!;
    const b = r.bars.find((b) => b.id === 'b')!;
    expect(a.lane).not.toBe(b.lane);
  });

  it('uses N lanes for N identical intervals', () => {
    const intervals: IntervalInput[] = [
      { id: 'a', start: 0, end: 6 },
      { id: 'b', start: 0, end: 6 },
      { id: 'c', start: 0, end: 6 },
      { id: 'd', start: 0, end: 6 },
    ];
    const r = layoutOverlappingIntervals(intervals);
    expect(r.laneCount).toBe(4);
    const lanes = new Set(r.bars.map((b) => b.lane));
    expect(lanes.size).toBe(4);
  });

  it('rejects end < start', () => {
    expect(() =>
      layoutOverlappingIntervals([{ id: 'bad', start: 5, end: 3 }]),
    ).toThrow(RangeError);
  });

  it('classic messy week — 12 events bridging Sun/Mon, 4-deep overlap', () => {
    // Days are 0–6 across two weeks (0–13). Several events span the
    // weekend (days 5–8), some are short, some are long.
    const intervals: IntervalInput[] = [
      { id: 'all-week-1', start: 0, end: 6 },
      { id: 'all-week-2', start: 0, end: 6 },
      { id: 'mid-week-1', start: 2, end: 4 },
      { id: 'mid-week-2', start: 3, end: 5 },
      { id: 'weekend-1', start: 5, end: 8 },
      { id: 'weekend-2', start: 5, end: 7 },
      { id: 'mon-fri', start: 1, end: 5 },
      { id: 'tue-thu', start: 2, end: 4 },
      { id: 'fri-sat', start: 5, end: 6 },
      { id: 'sat-only', start: 6, end: 6 },
      { id: 'sun-mon', start: 6, end: 7 },
      { id: 'next-mon', start: 7, end: 7 },
    ];
    const r = layoutOverlappingIntervals(intervals);
    // The maximum overlap depth dictates the required lane count.
    expect(r.laneCount).toBe(maxOverlapDepth(intervals));
    expect(r.bars.length).toBe(intervals.length);
    // No two bars share a (lane, column) cell.
    for (let i = 0; i < r.bars.length; i++) {
      for (let j = i + 1; j < r.bars.length; j++) {
        const a = r.bars[i];
        const b = r.bars[j];
        if (a.lane !== b.lane) continue;
        const overlap = a.start <= b.end && b.start <= a.end;
        expect(overlap, `bars ${a.id} and ${b.id} overlap on lane ${a.lane}`).toBe(
          false,
        );
      }
    }
  });
});

// ─── Properties (fast-check) ─────────────────────────────────────────

describe('layoutOverlappingIntervals — properties', () => {
  // Bounded inputs: up to 50 intervals, columns 0-30. Keeps the
  // reference O(n*colspan) check fast.
  const intervalArb = fc
    .tuple(fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 30 }))
    .map(([a, b]): { start: number; end: number } => ({
      start: Math.min(a, b),
      end: Math.max(a, b),
    }));

  const intervalsArb = fc
    .array(intervalArb, { maxLength: 50 })
    .map((arr): IntervalInput[] =>
      arr.map((iv, i) => ({ id: `iv-${i}`, ...iv })),
    );

  it('returns one bar per input interval (with the same id)', () => {
    fc.assert(
      fc.property(intervalsArb, (intervals) => {
        const r = layoutOverlappingIntervals(intervals);
        expect(r.bars.length).toBe(intervals.length);
        const inputIds = new Set(intervals.map((i) => i.id));
        const outputIds = new Set(r.bars.map((b) => b.id));
        expect(outputIds).toEqual(inputIds);
      }),
      { numRuns: 200 },
    );
  });

  it('preserves start/end values', () => {
    fc.assert(
      fc.property(intervalsArb, (intervals) => {
        const r = layoutOverlappingIntervals(intervals);
        const byId = new Map<string, IntervalLayout>();
        for (const b of r.bars) byId.set(b.id, b);
        for (const iv of intervals) {
          const b = byId.get(iv.id);
          expect(b).toBeTruthy();
          expect(b!.start).toBe(iv.start);
          expect(b!.end).toBe(iv.end);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('no two bars share a (lane, column) cell', () => {
    fc.assert(
      fc.property(intervalsArb, (intervals) => {
        const r = layoutOverlappingIntervals(intervals);
        for (let i = 0; i < r.bars.length; i++) {
          for (let j = i + 1; j < r.bars.length; j++) {
            const a = r.bars[i];
            const b = r.bars[j];
            if (a.lane !== b.lane) continue;
            const overlap = a.start <= b.end && b.start <= a.end;
            expect(overlap).toBe(false);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('laneCount equals max overlap depth (optimality)', () => {
    fc.assert(
      fc.property(intervalsArb, (intervals) => {
        const r = layoutOverlappingIntervals(intervals);
        expect(r.laneCount).toBe(maxOverlapDepth(intervals));
      }),
      { numRuns: 200 },
    );
  });

  it('all assigned lanes are < laneCount and >= 0', () => {
    fc.assert(
      fc.property(intervalsArb, (intervals) => {
        const r = layoutOverlappingIntervals(intervals);
        for (const b of r.bars) {
          expect(b.lane).toBeGreaterThanOrEqual(0);
          expect(b.lane).toBeLessThan(Math.max(1, r.laneCount));
        }
      }),
      { numRuns: 200 },
    );
  });

  it('output is deterministic for the same input', () => {
    fc.assert(
      fc.property(intervalsArb, (intervals) => {
        const r1 = layoutOverlappingIntervals(intervals);
        const r2 = layoutOverlappingIntervals(intervals);
        expect(r1.laneCount).toBe(r2.laneCount);
        // Bar order may match; lane assignment by id should match.
        const m1 = new Map(r1.bars.map((b) => [b.id, b.lane]));
        const m2 = new Map(r2.bars.map((b) => [b.id, b.lane]));
        for (const [id, lane] of m1) expect(m2.get(id)).toBe(lane);
      }),
      { numRuns: 100 },
    );
  });

  it('output is independent of input order (= deterministic on permutations)', () => {
    fc.assert(
      fc.property(intervalsArb, fc.integer({ min: 0, max: 1_000_000 }), (intervals, seed) => {
        if (intervals.length < 2) return;
        // Pseudo-random shuffle keyed by seed.
        const shuffled = [...intervals];
        let h = seed >>> 0;
        for (let i = shuffled.length - 1; i > 0; i--) {
          h = (h * 1664525 + 1013904223) >>> 0;
          const j = h % (i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const r1 = layoutOverlappingIntervals(intervals);
        const r2 = layoutOverlappingIntervals(shuffled);
        expect(r1.laneCount).toBe(r2.laneCount);
        const m1 = new Map(r1.bars.map((b) => [b.id, b.lane]));
        const m2 = new Map(r2.bars.map((b) => [b.id, b.lane]));
        for (const [id, lane] of m1) expect(m2.get(id)).toBe(lane);
      }),
      { numRuns: 100 },
    );
  });
});
