/**
 * Spike B — engine bake-off bench.
 *
 * Three engines (`rrule`, `rrule-rust`, `rrule-temporal`) are
 * benchmarked on the full 50-fixture corpus across four window sizes
 * (1 week, 1 month, 1 year, 5 years). Engine agreement on counts has
 * already been verified by `recurrence-bakeoff.test.ts` (50/50
 * fixtures match) so the numbers below are comparing engines that all
 * compute the same thing.
 *
 * Each `bench(...)` call expands the FULL corpus once. The reported
 * ops/sec figure is therefore "full-corpus expansions per second";
 * multiply by 50 for "single-rule expansions per second".
 *
 * Run with:
 *   pnpm --filter @cocoar/vue-calendar exec vitest bench recurrence-bakeoff
 */

import { bench, describe } from 'vitest';
import { corpus } from './recurrence-corpus';
import {
  expandRrule,
  expandRruleRust,
  expandRruleTemporal,
} from './recurrence-adapters';

// Window definitions. All anchored at the start of 2024 because the
// corpus's RFC fixtures are dated 1997 — a 1997-anchored window would
// just produce 0 occurrences for 2024-rooted fixtures and vice versa.
// The 5-year window is wide enough that even annual rules produce
// meaningful counts.
const WIN_1WEEK = {
  start: new Date('2024-06-01T00:00:00Z'),
  end: new Date('2024-06-08T00:00:00Z'),
};
const WIN_1MONTH = {
  start: new Date('2024-06-01T00:00:00Z'),
  end: new Date('2024-07-01T00:00:00Z'),
};
const WIN_1YEAR = {
  start: new Date('2024-01-01T00:00:00Z'),
  end: new Date('2025-01-01T00:00:00Z'),
};
const WIN_5YEAR = {
  start: new Date('2024-01-01T00:00:00Z'),
  end: new Date('2029-01-01T00:00:00Z'),
};

// ─── 1-week window ────────────────────────────────────────────────────

describe('S2 — 1-week window, full corpus (≈ 50 rules)', () => {
  bench('rrule', () => {
    for (const f of corpus) expandRrule(f, WIN_1WEEK.start, WIN_1WEEK.end);
  });
  bench('rrule-rust', () => {
    for (const f of corpus) expandRruleRust(f, WIN_1WEEK.start, WIN_1WEEK.end);
  });
  bench('rrule-temporal', () => {
    for (const f of corpus) expandRruleTemporal(f, WIN_1WEEK.start, WIN_1WEEK.end);
  });
});

// ─── 1-month window ───────────────────────────────────────────────────

describe('S3 — 1-month window, full corpus', () => {
  bench('rrule', () => {
    for (const f of corpus) expandRrule(f, WIN_1MONTH.start, WIN_1MONTH.end);
  });
  bench('rrule-rust', () => {
    for (const f of corpus) expandRruleRust(f, WIN_1MONTH.start, WIN_1MONTH.end);
  });
  bench('rrule-temporal', () => {
    for (const f of corpus) expandRruleTemporal(f, WIN_1MONTH.start, WIN_1MONTH.end);
  });
});

// ─── 1-year window ────────────────────────────────────────────────────

describe('S2-LONG — 1-year window, full corpus', () => {
  bench('rrule', () => {
    for (const f of corpus) expandRrule(f, WIN_1YEAR.start, WIN_1YEAR.end);
  });
  bench('rrule-rust', () => {
    for (const f of corpus) expandRruleRust(f, WIN_1YEAR.start, WIN_1YEAR.end);
  });
  bench('rrule-temporal', () => {
    for (const f of corpus) expandRruleTemporal(f, WIN_1YEAR.start, WIN_1YEAR.end);
  });
});

// ─── 5-year window ────────────────────────────────────────────────────

describe('S4 — 5-year window, full corpus', () => {
  bench('rrule', () => {
    for (const f of corpus) expandRrule(f, WIN_5YEAR.start, WIN_5YEAR.end);
  });
  bench('rrule-rust', () => {
    for (const f of corpus) expandRruleRust(f, WIN_5YEAR.start, WIN_5YEAR.end);
  });
  bench('rrule-temporal', () => {
    for (const f of corpus) expandRruleTemporal(f, WIN_5YEAR.start, WIN_5YEAR.end);
  });
});

// ─── Pathological subset only ────────────────────────────────────────
//
// The pathological + RFC categories are where rrule.js historically
// shows performance cliffs. Isolating them surfaces the real
// engine-to-engine ratio without the simple cases dragging the mean.

import { byCategory } from './recurrence-corpus';

const PATHOLOGICAL = byCategory('pathological').concat(byCategory('rfc-5545'));

describe('PATHO — pathological + RFC subset, 1-year window', () => {
  bench('rrule', () => {
    for (const f of PATHOLOGICAL) expandRrule(f, WIN_1YEAR.start, WIN_1YEAR.end);
  });
  bench('rrule-rust', () => {
    for (const f of PATHOLOGICAL) expandRruleRust(f, WIN_1YEAR.start, WIN_1YEAR.end);
  });
  bench('rrule-temporal', () => {
    for (const f of PATHOLOGICAL) expandRruleTemporal(f, WIN_1YEAR.start, WIN_1YEAR.end);
  });
});
