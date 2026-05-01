/**
 * Tier A microbenchmarks for `layoutOverlappingIntervals`.
 *
 * Run with:
 *   pnpm --filter @cocoar/vue-calendar exec vitest bench overlapLayout
 *
 * Targets (per spike plan §4.3, Tier A):
 *   - 50 events:  mean < 0.5 ms
 *   - 200 events: mean < 5 ms
 *   - 1000 events: mean < 30 ms
 *
 * Two input shapes per scale:
 *   - random:  intervals scattered across a 30-column range
 *   - worst:   deeply nested — every interval starts at column 0,
 *              ends at column 30 → laneCount = N (max overlap depth
 *              equals the input size, the worst case for the
 *              free-lane heap because lanes are allocated and never
 *              freed during the run).
 */

import { bench, describe } from 'vitest';
import { layoutOverlappingIntervals, type IntervalInput } from '../overlapLayout';

function buildRandom(n: number, columns = 30): IntervalInput[] {
  const out: IntervalInput[] = new Array(n);
  // Mulberry32 — deterministic PRNG, no library dependency.
  let s = 0x9e3779b9 ^ n;
  const rand = (): number => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < n; i++) {
    const a = Math.floor(rand() * (columns + 1));
    const b = Math.floor(rand() * (columns + 1));
    out[i] = {
      id: `iv-${i}`,
      start: Math.min(a, b),
      end: Math.max(a, b),
    };
  }
  return out;
}

function buildWorst(n: number, columns = 30): IntervalInput[] {
  const out: IntervalInput[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = { id: `iv-${i}`, start: 0, end: columns };
  }
  return out;
}

describe('layoutOverlappingIntervals — 50 events', () => {
  const random = buildRandom(50);
  const worst = buildWorst(50);
  bench('random distribution', () => {
    layoutOverlappingIntervals(random);
  });
  bench('worst case (all-overlap)', () => {
    layoutOverlappingIntervals(worst);
  });
});

describe('layoutOverlappingIntervals — 200 events', () => {
  const random = buildRandom(200);
  const worst = buildWorst(200);
  bench('random distribution', () => {
    layoutOverlappingIntervals(random);
  });
  bench('worst case (all-overlap)', () => {
    layoutOverlappingIntervals(worst);
  });
});

describe('layoutOverlappingIntervals — 1000 events', () => {
  const random = buildRandom(1000);
  const worst = buildWorst(1000);
  bench('random distribution', () => {
    layoutOverlappingIntervals(random);
  });
  bench('worst case (all-overlap)', () => {
    layoutOverlappingIntervals(worst);
  });
});

describe('layoutOverlappingIntervals — 10 000 events (stretch)', () => {
  const random = buildRandom(10_000, 365);
  bench('random distribution, 365-column range', () => {
    layoutOverlappingIntervals(random);
  });
});
