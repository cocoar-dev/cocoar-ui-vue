import { describe, it, expect } from 'vitest';
import { computeDropPosition, isFileDrag } from './tree-dnd';

const rect = { top: 0, height: 100 };
const at = (ratio: number, expandable: boolean) =>
  computeDropPosition({ clientY: ratio * 100 }, rect, { expandable });

describe('computeDropPosition', () => {
  describe('expandable target (before / inside / after bands)', () => {
    it('top quarter → before', () => {
      expect(at(0.1, true)).toBe('before');
      expect(at(0.24, true)).toBe('before');
    });
    it('the 0.25 / 0.75 boundaries fall inside', () => {
      expect(at(0.25, true)).toBe('inside');
      expect(at(0.5, true)).toBe('inside');
      expect(at(0.75, true)).toBe('inside');
    });
    it('bottom quarter → after', () => {
      expect(at(0.76, true)).toBe('after');
      expect(at(0.99, true)).toBe('after');
    });
  });

  describe('leaf target (50/50, no inside band)', () => {
    it('top half → before, bottom half → after', () => {
      expect(at(0.49, false)).toBe('before');
      expect(at(0.5, false)).toBe('after');
      expect(at(0.9, false)).toBe('after');
    });
  });

  it('zero-height row → before (no divide-by-zero)', () => {
    expect(computeDropPosition({ clientY: 0 }, { top: 0, height: 0 }, { expandable: true })).toBe('before');
    expect(computeDropPosition({ clientY: 0 }, { top: 0, height: 0 }, { expandable: false })).toBe('before');
  });
});

describe('isFileDrag', () => {
  const dt = (types: string[]) => ({ types }) as unknown as DataTransfer;
  it('is false for null / empty / non-file types', () => {
    expect(isFileDrag(null)).toBe(false);
    expect(isFileDrag(dt([]))).toBe(false);
    expect(isFileDrag(dt(['text/plain']))).toBe(false);
  });
  it('is true when types include "Files"', () => {
    expect(isFileDrag(dt(['Files']))).toBe(true);
    expect(isFileDrag(dt(['text/plain', 'Files']))).toBe(true);
  });
});
