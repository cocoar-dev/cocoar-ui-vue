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

  it('offers the middle band as "inside" for nestable rows', () => {
    const nestable = { nestable: true };
    expect(computeDropTarget('list', rect, { x: 250, y: 105 }, 'a', nestable).position).toBe('before');
    expect(computeDropTarget('list', rect, { x: 250, y: 120 }, 'a', nestable).position).toBe('inside');
    expect(computeDropTarget('list', rect, { x: 250, y: 135 }, 'a', nestable).position).toBe('after');
    // never in grid layout
    expect(computeDropTarget('grid', rect, { x: 250, y: 120 }, 'a', nestable).position).toBe('after');
  });
});

describe('resolveInsertion', () => {
  const siblings = [1, 2, 3, 4, 5];
  const self = { fromSelf: true, sameParent: true };

  it('inserts before / after a neighbour, dragged items excluded', () => {
    expect(resolveInsertion(siblings, new Set([2]), { key: 4, position: 'before' }, self)).toEqual({
      toIndex: 2, afterKey: 3, beforeKey: 4,
    });
    expect(resolveInsertion(siblings, new Set([2]), { key: 4, position: 'after' }, self)).toEqual({
      toIndex: 3, afterKey: 4, beforeKey: 5,
    });
  });

  it('appends without a target', () => {
    expect(resolveInsertion(siblings, new Set([1]), null, self)).toEqual({ toIndex: 4, afterKey: 5, beforeKey: null });
    expect(resolveInsertion([], new Set(), null, { fromSelf: false, sameParent: false })).toEqual({ toIndex: 0, afterKey: null, beforeKey: null });
  });

  it('returns null for no-op moves among the same siblings', () => {
    expect(resolveInsertion(siblings, new Set([2]), { key: 1, position: 'after' }, self)).toBeNull();
    expect(resolveInsertion(siblings, new Set([2]), { key: 3, position: 'before' }, self)).toBeNull();
    expect(resolveInsertion(siblings, new Set([2]), { key: 2, position: 'before' }, self)).toBeNull();
    expect(resolveInsertion(siblings, new Set([2, 3]), { key: 4, position: 'before' }, self)).toBeNull();
  });

  it('never treats a move to another parent as a no-op', () => {
    // Dragged key 9 lives elsewhere; appending it under this parent is a real change.
    expect(resolveInsertion(siblings, new Set([9]), null, { fromSelf: true, sameParent: false })).toEqual({
      toIndex: 5, afterKey: 5, beforeKey: null,
    });
  });

  it('keeps a multi-selection as one block', () => {
    expect(resolveInsertion(siblings, new Set([1, 3]), { key: 5, position: 'after' }, self)).toEqual({
      toIndex: 3, afterKey: 5, beforeKey: null,
    });
  });

  it('does not treat cross-list drops as no-ops', () => {
    expect(resolveInsertion(siblings, new Set(['x']), { key: 1, position: 'before' }, { fromSelf: false, sameParent: false })).toEqual({
      toIndex: 0, afterKey: null, beforeKey: 1,
    });
  });

  it('ignores an unknown target key', () => {
    expect(resolveInsertion(siblings, new Set([2]), { key: 99, position: 'before' }, self)).toBeNull();
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
