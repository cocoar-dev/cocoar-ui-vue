import { describe, it, expect } from 'vitest';
import {
  indexTree,
  applyCheckToggle,
  reconcileChecked,
  computeIndeterminate,
  type TreeIndex,
} from './selection';

interface N {
  id: string;
  children?: N[];
}

const tree: N[] = [
  { id: 'a', children: [{ id: 'a1' }, { id: 'a2' }] },
  { id: 'b', children: [{ id: 'b1' }] },
  { id: 'c' },
];

function build(roots: N[] = tree): TreeIndex {
  return indexTree(
    roots,
    (n) => n.id,
    (n) => n.children,
  );
}

describe('tree selection engine', () => {
  describe('indexTree', () => {
    it('captures children, parents and DFS pre-order', () => {
      const ix = build();
      expect(ix.children.get('a')).toEqual(['a1', 'a2']);
      expect(ix.children.get('c')).toEqual([]);
      expect(ix.parent.get('a1')).toBe('a');
      expect(ix.parent.get('a')).toBeNull();
      expect(ix.order).toEqual(['a', 'a1', 'a2', 'b', 'b1', 'c']);
    });

    it('treats an unloaded lazy folder (null children) as a leaf', () => {
      const lazy: N[] = [{ id: 'a', children: undefined }];
      const ix = indexTree(
        lazy,
        (n) => n.id,
        (n) => n.children,
      );
      expect(ix.children.get('a')).toEqual([]);
      expect(ix.order).toEqual(['a']);
    });
  });

  describe('applyCheckToggle', () => {
    it('checking a folder cascades to all loaded descendants + the folder', () => {
      const next = applyCheckToggle(new Set(), 'a', true, build());
      expect([...next].sort()).toEqual(['a', 'a1', 'a2']);
    });

    it('unchecking one child drops the parent from the checked set', () => {
      const all = applyCheckToggle(new Set(), 'a', true, build());
      const next = applyCheckToggle(all, 'a1', false, build());
      expect([...next].sort()).toEqual(['a2']);
      expect(next.has('a')).toBe(false);
    });

    it('checking the last remaining child re-checks the parent', () => {
      let s = applyCheckToggle(new Set(), 'a1', true, build());
      expect(s.has('a')).toBe(false);
      s = applyCheckToggle(s, 'a2', true, build());
      expect([...s].sort()).toEqual(['a', 'a1', 'a2']);
    });

    it('does not mutate the input set', () => {
      const input = new Set<string>();
      applyCheckToggle(input, 'a', true, build());
      expect(input.size).toBe(0);
    });
  });

  describe('computeIndeterminate', () => {
    it('marks an ancestor with some-but-not-all checked descendants', () => {
      const ind = computeIndeterminate(new Set(['a2']), build());
      expect([...ind]).toEqual(['a']);
    });

    it('does not mark a fully checked ancestor', () => {
      const ind = computeIndeterminate(new Set(['a', 'a1', 'a2']), build());
      expect(ind.has('a')).toBe(false);
    });

    it('is empty when nothing is checked', () => {
      expect(computeIndeterminate(new Set(), build()).size).toBe(0);
    });
  });

  describe('reconcileChecked (lazy inheritance)', () => {
    it('propagates a checked folder down to newly loaded children', () => {
      // `a` was checked while its children were unloaded; now they exist.
      const next = reconcileChecked(new Set(['a']), build());
      expect([...next].sort()).toEqual(['a', 'a1', 'a2']);
    });

    it('returns the same reference when nothing changes', () => {
      const input = new Set(['c']);
      expect(reconcileChecked(input, build())).toBe(input);
    });

    it('materializes a full closure from a sparse consumer-supplied set', () => {
      const next = reconcileChecked(new Set(['b']), build());
      expect(next.has('b1')).toBe(true);
    });
  });
});
