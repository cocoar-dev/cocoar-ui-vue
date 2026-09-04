import { describe, expect, it } from 'vitest';
import { autoscrollDelta, computeDropTarget, resolveInsertion } from './reorder-core';

describe('computeDropTarget', () => {
  const rect = { top: 100, left: 200, width: 100, height: 40 };

  it('splits rows vertically in list layout', () => {
    expect(computeDropTarget('list', rect, { x: 250, y: 105 }, 'a')).toEqual({ key: 'a', position: 'before' });
    expect(computeDropTarget('list', rect, { x: 250, y: 135 }, 'a')).toEqual({ key: 'a', position: 'after' });
  });

  it('splits tiles horizontally in grid layout', () => {
    expect(computeDropTarget('grid', rect, { x: 210, y: 135 }, 'a')).toEqual({ key: 'a', position: 'before' });
    expect(computeDropTarget('grid', rect, { x: 290, y: 105 }, 'a')).toEqual({ key: 'a', position: 'after' });
  });
});

describe('resolveInsertion', () => {
  const visible = [1, 2, 3, 4, 5];

  it('inserts before / after a neighbour, dragged items excluded', () => {
    expect(resolveInsertion(visible, new Set([2]), { key: 4, position: 'before' }, { fromSelf: true })).toEqual({
      toIndex: 2, afterKey: 3, beforeKey: 4,
    });
    expect(resolveInsertion(visible, new Set([2]), { key: 4, position: 'after' }, { fromSelf: true })).toEqual({
      toIndex: 3, afterKey: 4, beforeKey: 5,
    });
  });

  it('appends without a target', () => {
    expect(resolveInsertion(visible, new Set([1]), null, { fromSelf: true })).toEqual({
      toIndex: 4, afterKey: 5, beforeKey: null,
    });
    expect(resolveInsertion([], new Set(), null, { fromSelf: false })).toEqual({ toIndex: 0, afterKey: null, beforeKey: null });
  });

  it('returns null for no-op moves inside the same list', () => {
    expect(resolveInsertion(visible, new Set([2]), { key: 1, position: 'after' }, { fromSelf: true })).toBeNull();
    expect(resolveInsertion(visible, new Set([2]), { key: 3, position: 'before' }, { fromSelf: true })).toBeNull();
    expect(resolveInsertion(visible, new Set([2]), { key: 2, position: 'before' }, { fromSelf: true })).toBeNull();
    expect(resolveInsertion(visible, new Set([2, 3]), { key: 4, position: 'before' }, { fromSelf: true })).toBeNull();
  });

  it('keeps a multi-selection as one block', () => {
    expect(resolveInsertion(visible, new Set([1, 3]), { key: 5, position: 'after' }, { fromSelf: true })).toEqual({
      toIndex: 3, afterKey: 5, beforeKey: null,
    });
  });

  it('does not treat cross-list drops as no-ops', () => {
    expect(resolveInsertion(visible, new Set(['x']), { key: 1, position: 'before' }, { fromSelf: false })).toEqual({
      toIndex: 0, afterKey: null, beforeKey: 1,
    });
  });

  it('ignores an unknown target key', () => {
    expect(resolveInsertion(visible, new Set([2]), { key: 99, position: 'before' }, { fromSelf: true })).toBeNull();
  });
});

describe('autoscrollDelta', () => {
  const rect = { top: 0, bottom: 300 };
  it('scrolls up near the top, down near the bottom, not in between', () => {
    expect(autoscrollDelta(5, rect)).toBeLessThan(0);
    expect(autoscrollDelta(295, rect)).toBeGreaterThan(0);
    expect(autoscrollDelta(150, rect)).toBe(0);
  });
});
