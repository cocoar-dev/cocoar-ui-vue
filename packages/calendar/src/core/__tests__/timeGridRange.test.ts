/**
 * The four classic time-grid surfaces are presets of one spec. These
 * tests pin each preset to the helper it replaced (`weekDates`,
 * `workWeekDates`, cursor + N) so the consolidation cannot drift, and
 * pin the combinations the model newly allows.
 */

import { describe, expect, it } from 'vitest';
import {
  TIME_GRID_PRESETS,
  resolveTimeGridRange,
  timeGridRangeSpecFor,
  timeGridStepDays,
} from '../timeGridRange';
import { weekDates, workWeekDates } from '../temporal';
import { pd } from '../../__test-utils__/event-fixtures';

const iso = (days: { toString(): string }[]) => days.map((d) => d.toString());
const wednesday = pd('2026-08-12'); // Wed
const monday = pd('2026-08-10');

describe('presets reproduce the classic views', () => {
  it('day (one): the cursor, one column, page by one', () => {
    const r = resolveTimeGridRange({
      spec: TIME_GRID_PRESETS.daySingle,
      cursor: wednesday,
      firstDayOfWeek: 1,
      workDays: [1, 2, 3, 4, 5],
      responsiveColumns: 4, // ignored — span is fixed at 1
    });
    expect(iso(r.days)).toEqual(['2026-08-12']);
    expect(r.spanDays).toBe(1);
    expect(r.stepDays).toBe(1);
  });

  it('day (multi): the cursor + measured columns, page by as many as shown', () => {
    const r = resolveTimeGridRange({
      spec: TIME_GRID_PRESETS.dayMulti,
      cursor: wednesday,
      firstDayOfWeek: 1,
      workDays: [1, 2, 3, 4, 5],
      responsiveColumns: 3,
    });
    expect(iso(r.days)).toEqual(['2026-08-12', '2026-08-13', '2026-08-14']);
    expect(r.stepDays).toBe(3);
  });

  it('week: weekDates(cursor, fdow), page by 7 — regardless of the cursor weekday', () => {
    const r = resolveTimeGridRange({
      spec: TIME_GRID_PRESETS.week,
      cursor: wednesday,
      firstDayOfWeek: 1,
      workDays: [1, 2, 3, 4, 5],
      responsiveColumns: 2,
    });
    expect(iso(r.days)).toEqual(iso(weekDates(wednesday, 1)));
    expect(r.start.toString()).toBe('2026-08-10');
    expect(r.spanDays).toBe(7);
    expect(r.stepDays).toBe(7);
  });

  it('work week: workWeekDates(cursor, fdow, workDays), window still 7 days, page by 7', () => {
    const workDays = [0, 1, 2, 3, 4] as const; // Sun–Thu
    const r = resolveTimeGridRange({
      spec: TIME_GRID_PRESETS.workWeek,
      cursor: wednesday,
      firstDayOfWeek: 0,
      workDays,
      responsiveColumns: 2,
    });
    expect(iso(r.days)).toEqual(iso(workWeekDates(wednesday, 0, workDays)));
    expect(r.days).toHaveLength(5);
    expect(r.spanDays).toBe(7);
    expect(r.stepDays).toBe(7);
  });

  it('work week with no work days renders nothing but keeps its window', () => {
    const r = resolveTimeGridRange({
      spec: TIME_GRID_PRESETS.workWeek,
      cursor: wednesday,
      firstDayOfWeek: 1,
      workDays: [],
      responsiveColumns: 1,
    });
    expect(r.days).toEqual([]);
    expect(r.spanDays).toBe(7);
  });
});

describe('combinations the model newly allows', () => {
  it('"start Monday, show five days, page by a week"', () => {
    const r = resolveTimeGridRange({
      spec: { anchor: 'cursor', span: 5, filter: 'all', step: 7 },
      cursor: monday,
      firstDayOfWeek: 1,
      workDays: [1, 2, 3, 4, 5],
      responsiveColumns: 1,
    });
    expect(iso(r.days)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
    ]);
    expect(r.spanDays).toBe(5);
    expect(r.stepDays).toBe(7);
  });

  it('weekStart anchor snaps a mid-week cursor back; a cursor anchor does not', () => {
    const snapped = resolveTimeGridRange({
      spec: { anchor: 'weekStart', span: 3, filter: 'all', step: 'span' },
      cursor: wednesday,
      firstDayOfWeek: 1,
      workDays: [],
      responsiveColumns: 1,
    });
    expect(snapped.start.toString()).toBe('2026-08-10');
    const loose = resolveTimeGridRange({
      spec: { anchor: 'cursor', span: 3, filter: 'all', step: 'span' },
      cursor: wednesday,
      firstDayOfWeek: 1,
      workDays: [],
      responsiveColumns: 1,
    });
    expect(loose.start.toString()).toBe('2026-08-12');
  });

  it('responsive span with the workDays filter hides weekends inside the measured span', () => {
    const r = resolveTimeGridRange({
      spec: { anchor: 'cursor', span: 'responsive', filter: 'workDays', step: 'span' },
      cursor: pd('2026-08-14'), // Fri
      firstDayOfWeek: 1,
      workDays: [1, 2, 3, 4, 5],
      responsiveColumns: 4, // Fri Sat Sun Mon
    });
    expect(iso(r.days)).toEqual(['2026-08-14', '2026-08-17']);
    expect(r.spanDays).toBe(4);
    expect(r.stepDays).toBe(4);
  });

  it('clamps nonsense to at least one day', () => {
    const r = resolveTimeGridRange({
      spec: { anchor: 'cursor', span: 0, filter: 'all', step: 0 },
      cursor: monday,
      firstDayOfWeek: 1,
      workDays: [],
      responsiveColumns: 0,
    });
    expect(r.spanDays).toBe(1);
    expect(r.stepDays).toBe(1);
    expect(
      timeGridStepDays({ anchor: 'cursor', span: 'responsive', filter: 'all', step: 'span' }, 0),
    ).toBe(1);
  });
});

describe('timeGridRangeSpecFor', () => {
  it('week and work week are fixed presets even when an explicit spec is set', () => {
    const explicit = { anchor: 'cursor', span: 5, filter: 'all', step: 7 } as const;
    expect(timeGridRangeSpecFor('week', { explicit })).toBe(TIME_GRID_PRESETS.week);
    expect(timeGridRangeSpecFor('workWeek', { explicit })).toBe(TIME_GRID_PRESETS.workWeek);
  });

  it('day follows the explicit spec, else dayMode', () => {
    const explicit = { anchor: 'cursor', span: 5, filter: 'all', step: 7 } as const;
    expect(timeGridRangeSpecFor('day', { explicit, dayMode: 'multiDay' })).toBe(explicit);
    expect(timeGridRangeSpecFor('day', { dayMode: 'multiDay' })).toBe(TIME_GRID_PRESETS.dayMulti);
    expect(timeGridRangeSpecFor('day', { dayMode: 'single' })).toBe(TIME_GRID_PRESETS.daySingle);
    expect(timeGridRangeSpecFor('day')).toBe(TIME_GRID_PRESETS.daySingle);
  });
});
