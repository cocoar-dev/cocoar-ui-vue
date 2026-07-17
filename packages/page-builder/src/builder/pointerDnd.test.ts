import { describe, it, expect } from 'vitest';
import { parseZonePath, pickZone, rectDistance, type ZoneCandidate } from './pointerDnd';

const rect = (left: number, top: number, right: number, bottom: number) => ({
  left, top, right, bottom,
});

const zone = (
  key: string,
  r: ReturnType<typeof rect>,
  inflate = 0,
): ZoneCandidate => ({ key, path: [], index: 0, rect: r, inflate });

describe('rectDistance', () => {
  it('is 0 inside the rect (including edges)', () => {
    expect(rectDistance(rect(0, 0, 10, 10), 5, 5)).toBe(0);
    expect(rectDistance(rect(0, 0, 10, 10), 0, 0)).toBe(0);
    expect(rectDistance(rect(0, 0, 10, 10), 10, 10)).toBe(0);
  });

  it('measures axis distance next to an edge', () => {
    expect(rectDistance(rect(0, 0, 10, 10), 15, 5)).toBe(5);
    expect(rectDistance(rect(0, 0, 10, 10), 5, -7)).toBe(7);
  });

  it('measures diagonal distance at a corner', () => {
    expect(rectDistance(rect(0, 0, 10, 10), 13, 14)).toBe(5);
  });
});

describe('parseZonePath', () => {
  it('parses the root path from an empty string', () => {
    expect(parseZonePath('')).toEqual([]);
  });

  it('parses nested paths', () => {
    expect(parseZonePath('0')).toEqual([0]);
    expect(parseZonePath('0/2/1')).toEqual([0, 2, 1]);
  });
});

describe('pickZone', () => {
  it('returns null when nothing is within reach', () => {
    expect(pickZone([zone('a', rect(0, 0, 10, 10))], 500, 500, 60)).toBeNull();
  });

  it('picks the nearest zone', () => {
    const zones = [
      zone('far', rect(0, 0, 10, 10)),
      zone('near', rect(30, 0, 40, 10)),
    ];
    expect(pickZone(zones, 45, 5, 60)?.key).toBe('near');
  });

  it('a zone containing the pointer beats every non-containing zone', () => {
    const zones = [
      zone('inside', rect(0, 0, 100, 100)),
      zone('nearby', rect(104, 0, 110, 100)),
    ];
    expect(pickZone(zones, 50, 50, 60)?.key).toBe('inside');
  });

  it('inflate lets a thin bar win near its edge over a large containing row', () => {
    // Outline layout: the row is a 30px-tall block, the bar a 0px seam at its
    // top edge. With inflate, hovering within the seam's reach picks the bar.
    const row = zone('row', rect(0, 0, 200, 30));
    const bar = zone('bar', rect(0, 0, 200, 0), 6);
    expect(pickZone([row, bar], 100, 3, 60)?.key).toBe('bar');
    // Deep inside the row, the row wins again.
    expect(pickZone([row, bar], 100, 20, 60)?.key).toBe('row');
  });

  it('ties inside overlapping zones go to the smaller target', () => {
    const big = zone('big', rect(0, 0, 300, 300));
    const small = zone('small', rect(100, 100, 140, 140));
    expect(pickZone([big, small], 120, 120, 60)?.key).toBe('small');
  });
});
