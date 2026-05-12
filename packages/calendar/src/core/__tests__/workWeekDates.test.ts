/**
 * `workWeekDates` — workday subset of `weekDates`.
 *
 * Behavior:
 *   - Returns the same dates `weekDates(...)` would for the given
 *     anchor, filtered by `dayOfWeek ∈ workDays`.
 *   - Preserves visual order (anchored to firstDayOfWeek).
 *   - Empty `workDays` set returns an empty array.
 *   - 0 = Sun … 6 = Sat (DayOfWeek convention).
 */

import { describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { weekDates, workWeekDates } from '../temporal';
import type { DayOfWeek } from '../temporal';

const MON = Temporal.PlainDate.from('2026-06-08');
const WED = Temporal.PlainDate.from('2026-06-10');
const SAT = Temporal.PlainDate.from('2026-06-13');

describe('workWeekDates', () => {
  it('returns Mon–Fri by default (Monday-first locale)', () => {
    const dates = workWeekDates(WED, 1, [1, 2, 3, 4, 5]);
    expect(dates.map((d) => d.toString())).toEqual([
      '2026-06-08', // Mon
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12', // Fri
    ]);
  });

  it('returns Mon–Fri (Sunday-first locale) — order anchored to firstDayOfWeek', () => {
    // With fdow=0 (Sun), weekDates emits Sun..Sat. The Mon–Fri
    // filter still produces Mon..Fri (Sun and Sat are dropped from
    // each end), in calendar order.
    const dates = workWeekDates(WED, 0, [1, 2, 3, 4, 5]);
    expect(dates.map((d) => d.toString())).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
    ]);
  });

  it('respects a 6-day Mon–Sat work week', () => {
    const dates = workWeekDates(WED, 1, [1, 2, 3, 4, 5, 6]);
    expect(dates.map((d) => d.toString())).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
    ]);
  });

  it('respects a 4-day Mon–Thu work week', () => {
    const dates = workWeekDates(WED, 1, [1, 2, 3, 4]);
    expect(dates.map((d) => d.toString())).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
    ]);
  });

  it('respects a Sun–Thu work week (Middle East convention)', () => {
    // Sunday is 0 in our convention. Sun–Thu = [0, 1, 2, 3, 4].
    const dates = workWeekDates(WED, 0, [0, 1, 2, 3, 4]);
    expect(dates.map((d) => d.toString())).toEqual([
      '2026-06-07', // Sun
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11', // Thu
    ]);
  });

  it('returns empty array for empty workDays set', () => {
    expect(workWeekDates(WED, 1, [])).toEqual([]);
  });

  it('is a strict subset of weekDates for the same anchor', () => {
    const fullWeek = weekDates(WED, 1);
    const work: DayOfWeek[] = [1, 2, 3, 4, 5];
    const filtered = workWeekDates(WED, 1, work);
    expect(filtered.length).toBeLessThan(fullWeek.length);
    for (const d of filtered) {
      expect(fullWeek.some((w) => w.equals(d))).toBe(true);
    }
  });

  it('produces the same set regardless of which day in the week is the anchor', () => {
    // Mon anchor and Sat anchor should produce the same Mon–Fri set
    // because they both resolve to the same week.
    const fromMon = workWeekDates(MON, 1, [1, 2, 3, 4, 5]);
    const fromSat = workWeekDates(SAT, 1, [1, 2, 3, 4, 5]);
    expect(fromMon.map((d) => d.toString())).toEqual(
      fromSat.map((d) => d.toString()),
    );
  });
});
