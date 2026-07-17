import { describe, it, expect } from 'vitest';
import { headingTag, compilePagePattern } from './renderSafety';

describe('headingTag', () => {
  it('maps 1–6 to the matching tag', () => {
    expect([1, 2, 3, 4, 5, 6].map(headingTag)).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  });

  it('clamps out-of-range numbers', () => {
    expect(headingTag(0)).toBe('h1');
    expect(headingTag(-3)).toBe('h1');
    expect(headingTag(7)).toBe('h6');
    expect(headingTag(99)).toBe('h6');
  });

  it('rounds fractional levels', () => {
    expect(headingTag(3.6)).toBe('h4');
  });

  it('falls back to h2 for anything that is not a finite number', () => {
    expect(headingTag(undefined)).toBe('h2');
    expect(headingTag(null)).toBe('h2');
    expect(headingTag('1 onclick=x')).toBe('h2');
    expect(headingTag(Number.NaN)).toBe('h2');
    expect(headingTag(Infinity)).toBe('h2');
  });
});

describe('compilePagePattern', () => {
  it('compiles a valid pattern', () => {
    expect(compilePagePattern('\\d+')).toBeInstanceOf(RegExp);
  });

  it('returns null instead of throwing on an invalid pattern', () => {
    expect(compilePagePattern('[')).toBeNull();
    expect(compilePagePattern('(')).toBeNull();
  });

  it('anchors to full-string semantics (HTML pattern-attribute behavior)', () => {
    const re = compilePagePattern('\\d+')!;
    expect(re.test('123')).toBe(true);
    expect(re.test('a123')).toBe(false);
    expect(re.test('123a')).toBe(false);
  });

  it('keeps alternations contained by the anchor group', () => {
    const re = compilePagePattern('a|b')!;
    expect(re.test('a')).toBe(true);
    expect(re.test('xa')).toBe(false);
  });
});
