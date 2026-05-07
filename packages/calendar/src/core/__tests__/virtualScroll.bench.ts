/**
 * Tier A microbenchmarks for the pure range math.
 *
 * These are NOT regression tests. They produce numbers we read once on the
 * dev baseline (Snapdragon X Elite X1E-78-100) to validate the Phase 0 hypothesis
 * that the math kernel is sub-microsecond at 10k items. The actual CI gate
 * is end-to-end FPS measured by Playwright + CDP on the GHA tier — see
 * spike plan §2.5.
 *
 * Run with:  pnpm --filter @cocoar/vue-calendar exec vitest bench
 */

import { bench, describe } from 'vitest';
import { MeasurementCache } from '../measurementCache';
import { getVisibleRange1D, computeAnchorAdjustment } from '../virtualScroll';

function buildCache(itemCount: number, measuredFraction: number): MeasurementCache {
  const c = new MeasurementCache(itemCount, 80);
  const measuredCount = Math.floor(itemCount * measuredFraction);
  for (let i = 0; i < measuredCount; i++) {
    // Pseudo-random stable index → spreads measurements across the range
    const idx = (i * 2654435761) % itemCount;
    // Pseudo-random size 40–240 px (sin-pattern like the 10k-variable page)
    const size = 80 + Math.floor(Math.sin(i) * 80) + 80;
    c.set(idx, Math.max(1, size));
  }
  return c;
}

describe('MeasurementCache — 10k items, 50% measured', () => {
  const cache = buildCache(10_000, 0.5);
  const total = cache.totalSize();

  bench('prefixSum at midpoint', () => {
    cache.prefixSum(5000);
  });

  bench('totalSize', () => {
    cache.totalSize();
  });

  bench('indexAtOffset at midpoint', () => {
    cache.indexAtOffset(total / 2);
  });

  bench('set (no-op same value)', () => {
    cache.set(5000, cache.get(5000));
  });
});

describe('getVisibleRange1D — 10k items, viewport 600 px', () => {
  const cacheUniform = new MeasurementCache(10_000, 80);
  const cacheVariable = buildCache(10_000, 1.0);

  bench('uniform sizes, midpoint scroll, overscan = 3', () => {
    getVisibleRange1D(cacheUniform, 400_000, 600, 3);
  });

  bench('variable sizes, midpoint scroll, overscan = 3', () => {
    getVisibleRange1D(cacheVariable, 400_000, 600, 3);
  });

  bench('variable sizes, scroll to end, overscan = 3', () => {
    getVisibleRange1D(cacheVariable, cacheVariable.totalSize() - 600, 600, 3);
  });
});

describe('computeAnchorAdjustment — 10k items', () => {
  const before = buildCache(10_000, 0.5);
  const after = buildCache(10_000, 0.6);

  bench('anchor at midpoint', () => {
    computeAnchorAdjustment(before, after, 5000);
  });
});
