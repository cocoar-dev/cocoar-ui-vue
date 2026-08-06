import { describe, expect, it } from 'vitest';
import { contentAwareCascadeFrames } from '../cascadeLayout';

describe('contentAwareCascadeFrames', () => {
  it('cascades overlapping cards while keeping readable leading content', () => {
    const frames = contentAwareCascadeFrames([
      {
        id: 'a',
        lane: 0,
        laneCount: 2,
        startMinutes: 60,
        endMinutes: 180,
        textEndMinutes: 95,
        preferredVisibleWidth: 34,
      },
      {
        id: 'b',
        lane: 1,
        laneCount: 2,
        startMinutes: 70,
        endMinutes: 120,
        textEndMinutes: 100,
        preferredVisibleWidth: 30,
      },
    ]);
    expect(frames.get('a')).toMatchObject({ x: 1.5, visibleContentWidth: 34 });
    expect(frames.get('b')!.x).toBeCloseTo(35.5);
    expect(frames.get('a')!.width).toBeCloseTo(63);
  });

  it('allows stronger overlap when the front card begins below the back text', () => {
    const frames = contentAwareCascadeFrames([
      {
        id: 'a',
        lane: 0,
        laneCount: 2,
        startMinutes: 60,
        endMinutes: 180,
        textEndMinutes: 80,
        preferredVisibleWidth: 50,
      },
      {
        id: 'b',
        lane: 1,
        laneCount: 2,
        startMinutes: 90,
        endMinutes: 120,
        textEndMinutes: 110,
        preferredVisibleWidth: 30,
      },
    ]);
    expect(frames.get('a')!.visibleContentWidth).toBeCloseTo(frames.get('a')!.width);
    expect(frames.get('a')!.width).toBeGreaterThan(70);
  });

  it('falls back to equal lanes for unknown custom content', () => {
    const frames = contentAwareCascadeFrames([
      {
        id: 'a',
        lane: 0,
        laneCount: 2,
        startMinutes: 0,
        endMinutes: 60,
        textEndMinutes: Infinity,
        preferredVisibleWidth: Infinity,
      },
      {
        id: 'b',
        lane: 1,
        laneCount: 2,
        startMinutes: 10,
        endMinutes: 50,
        textEndMinutes: Infinity,
        preferredVisibleWidth: Infinity,
      },
    ]);
    expect(frames.get('a')!.width).toBeCloseTo(48.5);
    expect(frames.get('b')!.x).toBeCloseTo(50);
  });
});
