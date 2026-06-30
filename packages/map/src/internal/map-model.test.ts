import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  fallbackEntries,
  legendCategories,
  resolveBasemap,
  stopColor,
  stopEmoji,
} from './map-model';
import type { MapConfig, MapData } from '../types';

const config: MapConfig = {
  defaultBasemap: 'osm',
  basemaps: [
    { id: 'osm', url: 'https://osm/{z}/{x}/{y}.png' },
    { id: 'sat', url: 'https://sat/{z}/{x}/{y}.png' },
    { id: 'gmap', url: '', google: true },
  ],
  categories: [
    { id: 'sight', label: 'Sights', emoji: '🏛️', color: '#a855f7' },
    { id: 'food', label: 'Food', emoji: '🍽️', color: '#f97316' },
  ],
};

describe('stopColor / stopEmoji', () => {
  it('resolves from the category', () => {
    expect(stopColor({ lat: 0, lng: 0, kind: 'stop', category: 'sight' }, config)).toBe('#a855f7');
    expect(stopEmoji({ lat: 0, lng: 0, kind: 'stop', category: 'sight' }, config)).toBe('🏛️');
  });
  it('explicit icon overrides the category emoji', () => {
    expect(stopEmoji({ lat: 0, lng: 0, kind: 'stop', category: 'sight', icon: '🏰' }, config)).toBe('🏰');
  });
  it('falls back to a neutral color / empty emoji for an unknown category', () => {
    expect(stopColor({ lat: 0, lng: 0, kind: 'stop' }, config)).toBe('#3b82f6');
    expect(stopEmoji({ lat: 0, lng: 0, kind: 'stop' }, config)).toBe('');
  });
});

describe('fallbackEntries', () => {
  it('lists stops + named shape points, excludes unnamed shapes', () => {
    const data: MapData = {
      type: 'route',
      points: [
        { lat: 1, lng: 1, kind: 'stop', label: 'Start', category: 'sight' },
        { lat: 2, lng: 2, kind: 'shape', label: 'Bend' },
        { lat: 3, lng: 3, kind: 'shape' }, // unnamed → excluded
        { lat: 4, lng: 4, kind: 'stop', label: 'End', category: 'food', icon: '🥐' },
      ],
    };
    expect(fallbackEntries(data, config)).toEqual([
      { index: 0, emoji: '🏛️', label: 'Start', lat: 1, lng: 1 },
      { index: 1, emoji: '•', label: 'Bend', lat: 2, lng: 2 },
      { index: 3, emoji: '🥐', label: 'End', lat: 4, lng: 4 },
    ]);
  });
});

describe('legendCategories', () => {
  it('returns distinct stop categories in first-seen order', () => {
    const data: MapData = {
      type: 'multi',
      points: [
        { lat: 0, lng: 0, kind: 'stop', category: 'food' },
        { lat: 0, lng: 0, kind: 'stop', category: 'sight' },
        { lat: 0, lng: 0, kind: 'stop', category: 'food' },
        { lat: 0, lng: 0, kind: 'shape', label: 'x' },
      ],
    };
    expect(legendCategories(data, config).map((c) => c.id)).toEqual(['food', 'sight']);
  });
});

describe('resolveBasemap', () => {
  it('uses the map basemap when valid', () => {
    expect(resolveBasemap({ type: 'single', basemap: 'sat', points: [] }, config)?.id).toBe('sat');
  });
  it('skips a Google basemap and falls back to the default', () => {
    expect(resolveBasemap({ type: 'single', basemap: 'gmap', points: [] }, config)?.id).toBe('osm');
  });
  it('falls back to the default when none specified', () => {
    expect(resolveBasemap({ type: 'single', points: [] }, config)?.id).toBe('osm');
  });
});

describe('boundsOf', () => {
  it('computes the bounding box', () => {
    expect(
      boundsOf([
        { lat: 1, lng: 5, kind: 'stop' },
        { lat: 3, lng: 2, kind: 'shape' },
      ]),
    ).toEqual([
      [1, 2],
      [3, 5],
    ]);
  });
  it('returns null for no points', () => {
    expect(boundsOf([])).toBeNull();
  });
});
