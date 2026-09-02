import { describe, expect, it } from 'vitest';
import { createValueComparator, sortByValue, sortWithComparator } from './compare';

describe('createValueComparator', () => {
  const compare = createValueComparator('en');

  it('sorts numbers numerically', () => {
    expect([10, 9, 100].sort(compare)).toEqual([9, 10, 100]);
  });

  it('sorts numeric strings naturally', () => {
    expect(['item 10', 'item 9', 'item 100'].sort(compare)).toEqual(['item 9', 'item 10', 'item 100']);
  });

  it('ignores case and diacritics', () => {
    expect(['zebra', 'Éclair', 'eclair', 'Zebra'].sort(compare)).toEqual(['Éclair', 'eclair', 'zebra', 'Zebra']);
    expect(compare('É', 'e')).toBe(0);
    expect(compare('Äpfel', 'apple')).toBeLessThan(0); // "apfel" < "apple"
  });

  it('puts null and undefined last', () => {
    expect([null, 'b', undefined, 'a'].sort(compare)).toEqual(['a', 'b', null, undefined]);
  });

  it('sorts dates chronologically and booleans false-first', () => {
    const early = new Date('2020-01-01');
    const late = new Date('2024-01-01');
    expect([late, early].sort(compare)).toEqual([early, late]);
    expect([true, false].sort(compare)).toEqual([false, true]);
  });

  it('falls back to the runtime locale for invalid tags', () => {
    expect(() => createValueComparator('not a locale')).not.toThrow();
  });
});

describe('sortByValue / sortWithComparator', () => {
  const rows = [
    { id: 1, name: 'b', score: 2 },
    { id: 2, name: 'a', score: 2 },
    { id: 3, name: 'c', score: 1 },
  ];
  const compare = createValueComparator('en');

  it('is stable for equal values', () => {
    expect(sortByValue(rows, (row) => row.score, compare).map((row) => row.id)).toEqual([3, 1, 2]);
  });

  it('reverses for descending but keeps ties in input order', () => {
    expect(sortByValue(rows, (row) => row.score, compare, true).map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it('applies a custom comparator', () => {
    const byName = sortWithComparator(rows, (a, b) => a.name.localeCompare(b.name));
    expect(byName.map((row) => row.id)).toEqual([2, 1, 3]);
  });

  it('does not mutate the input', () => {
    const copy = [...rows];
    sortByValue(rows, (row) => row.name, compare);
    expect(rows).toEqual(copy);
  });
});
