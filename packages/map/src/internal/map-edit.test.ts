import { describe, expect, it } from 'vitest';
import {
  addPointForType,
  insertOnSegment,
  movePoint,
  nearestSegment,
  normalizeLatLng,
  removePoint,
  reorderPoint,
  selectionAfterRemove,
  selectionAfterReorder,
  setViewport,
  updatePoint,
} from './map-edit';
import type { MapData, MapPoint } from '../types';

const stop = (lat: number, lng: number, extra: Partial<MapPoint> = {}): MapPoint => ({
  lat,
  lng,
  kind: 'stop',
  ...extra,
});

const route = (points: MapPoint[]): MapData => ({ type: 'route', points });

describe('normalizeLatLng', () => {
  it('clamps latitude and wraps longitude', () => {
    expect(normalizeLatLng(120, 0)).toEqual({ lat: 90, lng: 0 });
    expect(normalizeLatLng(-120, 0)).toEqual({ lat: -90, lng: 0 });
    expect(normalizeLatLng(0, 200)).toEqual({ lat: 0, lng: -160 });
    expect(normalizeLatLng(0, -190)).toEqual({ lat: 0, lng: 170 });
  });
  it('keeps the antimeridian at +180', () => {
    expect(normalizeLatLng(0, 180)).toEqual({ lat: 0, lng: 180 });
    expect(normalizeLatLng(0, -180)).toEqual({ lat: 0, lng: 180 });
  });
});

describe('addPointForType', () => {
  it('single: moves the existing point instead of appending', () => {
    const data: MapData = { type: 'single', points: [stop(1, 1, { label: 'Home' })] };
    const next = addPointForType(data, 5, 6);
    expect(next.points).toHaveLength(1);
    expect(next.points[0]).toMatchObject({ lat: 5, lng: 6, label: 'Home' });
  });
  it('single: creates the first point as a stop', () => {
    const next = addPointForType({ type: 'single', points: [] }, 5, 6);
    expect(next.points).toEqual([{ lat: 5, lng: 6, kind: 'stop' }]);
  });
  it('multi/route: appends a stop and normalizes coords', () => {
    const next = addPointForType(route([stop(0, 0)]), 10, 200);
    expect(next.points).toHaveLength(2);
    expect(next.points[1]).toEqual({ lat: 10, lng: -160, kind: 'stop' });
  });
  it('does not mutate the input', () => {
    const data = route([stop(0, 0)]);
    addPointForType(data, 1, 1);
    expect(data.points).toHaveLength(1);
  });
});

describe('movePoint / updatePoint / removePoint', () => {
  it('movePoint updates only the target', () => {
    const data = route([stop(0, 0), stop(1, 1)]);
    const next = movePoint(data, 1, 2, 3);
    expect(next.points[0]).toBe(data.points[0]);
    expect(next.points[1]).toMatchObject({ lat: 2, lng: 3 });
  });
  it('movePoint is a no-op for an out-of-range index', () => {
    const data = route([stop(0, 0)]);
    expect(movePoint(data, 5, 9, 9)).toBe(data);
  });
  it('updatePoint merges a patch and drops undefined', () => {
    const data = route([stop(0, 0, { label: 'A' })]);
    const next = updatePoint(data, 0, { label: 'B', note: undefined, kind: 'shape' });
    expect(next.points[0]).toMatchObject({ label: 'B', kind: 'shape' });
  });
  it('updatePoint normalizes patched coordinates', () => {
    const next = updatePoint(route([stop(0, 0)]), 0, { lng: 540 });
    expect(next.points[0].lng).toBe(180);
  });
  it('removePoint splices out the target', () => {
    const data = route([stop(0, 0), stop(1, 1), stop(2, 2)]);
    const next = removePoint(data, 1);
    expect(next.points.map((p) => p.lat)).toEqual([0, 2]);
  });
});

describe('reorderPoint', () => {
  it('moves an item forward', () => {
    const data = route([stop(0, 0), stop(1, 1), stop(2, 2)]);
    expect(reorderPoint(data, 0, 2).points.map((p) => p.lat)).toEqual([1, 2, 0]);
  });
  it('moves an item backward', () => {
    const data = route([stop(0, 0), stop(1, 1), stop(2, 2)]);
    expect(reorderPoint(data, 2, 0).points.map((p) => p.lat)).toEqual([2, 0, 1]);
  });
  it('is a no-op when from === to or out of range', () => {
    const data = route([stop(0, 0), stop(1, 1)]);
    expect(reorderPoint(data, 1, 1)).toBe(data);
    expect(reorderPoint(data, 5, 0)).toBe(data);
  });
});

describe('insertOnSegment', () => {
  it('inserts between the segment endpoints', () => {
    const data = route([stop(0, 0), stop(10, 10)]);
    const next = insertOnSegment(data, 0, 5, 5, { label: 'mid' });
    expect(next.points.map((p) => p.lat)).toEqual([0, 5, 10]);
    expect(next.points[1]).toMatchObject({ label: 'mid', kind: 'stop' });
  });
  it('is a no-op for an invalid segment index', () => {
    const data = route([stop(0, 0), stop(10, 10)]);
    expect(insertOnSegment(data, 1, 5, 5)).toBe(data); // segment 1 has no endpoint
    expect(insertOnSegment(data, -1, 5, 5)).toBe(data);
  });
});

describe('setViewport', () => {
  it('sets and clears the viewport', () => {
    const data = route([stop(0, 0)]);
    const withVp = setViewport(data, { centerLat: 1, centerLng: 2, zoom: 8 });
    expect(withVp.viewport).toEqual({ centerLat: 1, centerLng: 2, zoom: 8 });
    expect(setViewport(withVp, null).viewport).toBeUndefined();
  });
});

describe('selectionAfterReorder', () => {
  it('null stays null', () => {
    expect(selectionAfterReorder(null, 0, 2)).toBeNull();
  });
  it('the moved point follows to its new index', () => {
    expect(selectionAfterReorder(1, 1, 3)).toBe(3);
    expect(selectionAfterReorder(3, 3, 0)).toBe(0);
  });
  it('points the move passes over shift by one', () => {
    expect(selectionAfterReorder(2, 0, 3)).toBe(1); // 0→3: items 1,2,3 shift down
    expect(selectionAfterReorder(1, 3, 0)).toBe(2); // 3→0: items 0,1,2 shift up
  });
  it('points outside the moved range are unchanged', () => {
    expect(selectionAfterReorder(5, 1, 3)).toBe(5);
    expect(selectionAfterReorder(0, 2, 4)).toBe(0);
  });
});

describe('selectionAfterRemove', () => {
  it('null stays null', () => {
    expect(selectionAfterRemove(null, 1)).toBeNull();
  });
  it('clears when the selected point is removed', () => {
    expect(selectionAfterRemove(2, 2)).toBeNull();
  });
  it('shifts down when an earlier point is removed', () => {
    expect(selectionAfterRemove(3, 1)).toBe(2);
  });
  it('is unchanged when a later point is removed', () => {
    expect(selectionAfterRemove(1, 3)).toBe(1);
  });
});

describe('nearestSegment', () => {
  it('returns null for fewer than two points', () => {
    expect(nearestSegment([stop(0, 0)], 0, 0)).toBeNull();
  });
  it('picks the closest segment and projects onto it', () => {
    const points = [stop(0, 0), stop(0, 10), stop(10, 10)];
    // Click near the first (horizontal) segment, above its midpoint.
    const hit = nearestSegment(points, 1, 5);
    expect(hit?.segmentIndex).toBe(0);
    expect(hit?.lat).toBeCloseTo(0);
    expect(hit?.lng).toBeCloseTo(5);
  });
  it('projects onto the second segment when nearer', () => {
    const points = [stop(0, 0), stop(0, 10), stop(10, 10)];
    const hit = nearestSegment(points, 5, 9);
    expect(hit?.segmentIndex).toBe(1);
    expect(hit?.lng).toBeCloseTo(10);
    expect(hit?.lat).toBeCloseTo(5);
  });
});
