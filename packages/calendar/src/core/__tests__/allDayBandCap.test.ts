import { describe, expect, it } from 'vitest';
import { allDayBandLanes, capAllDayBand } from '../allDayBandCap';
import type { AllDayBar } from '../timeGridLayout';
import { pd } from '../../__test-utils__/event-fixtures';

const bar = (id: string, lane: number, startCol: number, endCol: number, laneCount: number) =>
  ({
    event: { id, start: pd('2026-06-15') },
    lane,
    laneCount,
    startCol,
    endCol,
    clippedStart: false,
    clippedEnd: false,
  }) as AllDayBar;

describe('capAllDayBand', () => {
  it('returns the layout untouched when it fits the cap', () => {
    const bars = [bar('a', 0, 0, 0, 3), bar('b', 1, 0, 2, 3), bar('c', 2, 1, 1, 3)];
    const r = capAllDayBand(bars, { maxVisibleLanes: 3, expanded: false, columnCount: 7 });
    expect(r.bars).toHaveLength(3);
    expect(r.overflow).toEqual([]);
    expect(r.visibleLanes).toBe(3);
    expect(r.capped).toBe(false);
    expect(r.exceedsCap).toBe(false);
  });

  it('gives up the last visible lane for per-column markers when exceeding the cap', () => {
    // 5 lanes on Monday (col 0), one bar in lane 3 spanning Tue–Wed.
    const bars = [
      bar('a', 0, 0, 0, 5),
      bar('b', 1, 0, 0, 5),
      bar('c', 2, 0, 0, 5),
      bar('d', 3, 0, 2, 5),
      bar('e', 4, 0, 0, 5),
    ];
    const r = capAllDayBand(bars, { maxVisibleLanes: 3, expanded: false, columnCount: 7 });
    expect(r.bars.map((b) => b.event.id)).toEqual(['a', 'b']);
    expect(r.overflow).toEqual([
      { col: 0, hidden: 3 },
      { col: 1, hidden: 1 },
      { col: 2, hidden: 1 },
    ]);
    expect(r.visibleLanes).toBe(3);
    expect(r.capped).toBe(true);
    expect(r.exceedsCap).toBe(true);
  });

  it('expanded shows everything but still reports that the cap is exceeded', () => {
    const bars = [
      bar('a', 0, 0, 0, 4),
      bar('b', 1, 0, 0, 4),
      bar('c', 2, 0, 0, 4),
      bar('d', 3, 0, 0, 4),
    ];
    const r = capAllDayBand(bars, { maxVisibleLanes: 3, expanded: true, columnCount: 7 });
    expect(r.bars).toHaveLength(4);
    expect(r.capped).toBe(false);
    expect(r.exceedsCap).toBe(true);
    expect(r.visibleLanes).toBe(4);
  });

  it('null cap = unlimited', () => {
    const bars = Array.from({ length: 6 }, (_, i) => bar(`e${i}`, i, 0, 0, 6));
    const r = capAllDayBand(bars, { maxVisibleLanes: null, expanded: false, columnCount: 1 });
    expect(r.bars).toHaveLength(6);
    expect(r.capped).toBe(false);
  });

  it('a cap of 1 folds everything into markers', () => {
    const bars = [bar('a', 0, 0, 0, 2), bar('b', 1, 0, 0, 2)];
    const r = capAllDayBand(bars, { maxVisibleLanes: 1, expanded: false, columnCount: 1 });
    expect(r.bars).toEqual([]);
    expect(r.overflow).toEqual([{ col: 0, hidden: 2 }]);
  });

  it('clamps marker columns to the visible range for clipped bars', () => {
    const bars = [bar('a', 0, 0, 0, 2), bar('b', 1, -3, 9, 2)];
    const r = capAllDayBand(bars, { maxVisibleLanes: 1, expanded: false, columnCount: 3 });
    expect(r.overflow.map((m) => m.col)).toEqual([0, 1, 2]);
  });
});

describe('allDayBandLanes', () => {
  it('fitsContent follows the content, including zero', () => {
    expect(allDayBandLanes(0, 'fitsContent', 3)).toBe(0);
    expect(allDayBandLanes(2, 'fitsContent', 3)).toBe(2);
  });
  it('alwaysOneLane removes the 0↔1 jump', () => {
    expect(allDayBandLanes(0, 'alwaysOneLane', 3)).toBe(1);
    expect(allDayBandLanes(2, 'alwaysOneLane', 3)).toBe(2);
  });
  it('reservesCap keeps the axis in place up to the cap, grows beyond when expanded', () => {
    expect(allDayBandLanes(0, 'reservesCap', 3)).toBe(3);
    expect(allDayBandLanes(2, 'reservesCap', 3)).toBe(3);
    expect(allDayBandLanes(5, 'reservesCap', 3)).toBe(5);
    expect(allDayBandLanes(0, 'reservesCap', null)).toBe(0);
  });
});
