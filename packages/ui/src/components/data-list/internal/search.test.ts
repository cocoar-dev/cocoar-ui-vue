import { describe, expect, it } from 'vitest';
import {
  defaultSearchText,
  matchesSearchTerms,
  normalizeSearchText,
  searchTerms,
  searchTextOf,
} from './search';

describe('normalizeSearchText', () => {
  it('lower-cases and strips diacritics', () => {
    expect(normalizeSearchText('Café Überstraße')).toBe('cafe uberstraße');
  });
});

describe('searchTerms', () => {
  it('splits on whitespace and drops empties', () => {
    expect(searchTerms('  Foo   bar ')).toEqual(['foo', 'bar']);
    expect(searchTerms('')).toEqual([]);
    expect(searchTerms(undefined)).toEqual([]);
  });
});

describe('matchesSearchTerms', () => {
  it('requires every term', () => {
    const haystack = normalizeSearchText('Vienna Gateway Active');
    expect(matchesSearchTerms(haystack, ['vienna', 'active'])).toBe(true);
    expect(matchesSearchTerms(haystack, ['vienna', 'offline'])).toBe(false);
    expect(matchesSearchTerms(haystack, [])).toBe(true);
  });
});

describe('defaultSearchText / searchTextOf', () => {
  const item = { id: 7, name: 'Danube', active: true, nested: { skip: 'me' }, fn: () => 1 };

  it('joins primitive own properties only', () => {
    expect(defaultSearchText(item)).toBe('7 Danube true');
  });

  it('uses a field list when given', () => {
    expect(searchTextOf(item, ['name', 'id'])).toBe('Danube 7');
  });

  it('uses an extractor when given', () => {
    expect(searchTextOf(item, (row) => `${row.name}!`)).toBe('Danube!');
  });
});
