import { describe, it, expect } from 'vitest';
import { classifyValue, extractReferences } from './classify-value';
import type { TokenValueType } from './types';

describe('classifyValue', () => {
  // Real values drawn from packages/ui/styles/tokens/*.css.
  const cases: Array<[string, TokenValueType, string[]]> = [
    // colors
    ['#1183CD', 'color', []],
    ['#fff', 'color', []],
    ['oklch(from var(--coar-error) 0.47 0.13 h)', 'color', ['--coar-error']],
    ['color-mix(in srgb, var(--coar-accent) 8%, transparent)', 'color', ['--coar-accent']],
    ['transparent', 'color', []],
    // pure references (type inherited from target later)
    ['var(--coar-color-red-600)', 'reference', ['--coar-color-red-600']],
    ['var(--coar-radius-m, 6px)', 'reference', ['--coar-radius-m']],
    // dimensions
    ['8px', 'dimension', []],
    ['0.5rem', 'dimension', []],
    ['calc(var(--coar-spacing-s) + var(--coar-spacing-xs))', 'dimension',
      ['--coar-spacing-s', '--coar-spacing-xs']],
    // numbers
    ['1.5', 'number', []],
    ['400', 'number', []],
    // durations
    ['200ms', 'duration', []],
    ['0.2s', 'duration', []],
    // easings
    ['cubic-bezier(0.4, 0, 0.2, 1)', 'cubicBezier', []],
    ['ease-in-out', 'cubicBezier', []],
    // font families
    ["'Poppins', sans-serif", 'fontFamily', []],
    ['Poppins, sans-serif', 'fontFamily', []],
    // font stack with many fallbacks (the "em" in system-ui must NOT read as a unit)
    ['Poppins, ui-sans-serif, system-ui, "Segoe UI", sans-serif', 'fontFamily', []],
    // shadow — literal color, var() color, and bare-zero offsets
    ['0 1px 2px rgba(0,0,0,.1)', 'shadow', []],
    ['0 1px 2px var(--coar-shadow-color)', 'shadow', ['--coar-shadow-color']],
    ['0 0 0 var(--coar-focus-width) var(--coar-focus-color)', 'shadow',
      ['--coar-focus-width', '--coar-focus-color']],
    // dimension shorthands (padding/margin), literal and via refs
    ['0.5rem 0.75rem', 'dimension', []],
    ['2px 0', 'dimension', []],
    ['var(--coar-spacing-s) var(--coar-spacing-m)', 'dimension',
      ['--coar-spacing-s', '--coar-spacing-m']],
    // composite CSS shorthands
    ['all var(--coar-duration-normal) var(--coar-ease-out)', 'composite',
      ['--coar-duration-normal', '--coar-ease-out']],
    ['1px solid var(--coar-border-neutral-tertiary)', 'composite',
      ['--coar-border-neutral-tertiary']],
    // keywords
    ['uppercase', 'keyword', []],
    ['solid', 'keyword', []],
    ['none', 'keyword', []],
    ['inline-flex', 'keyword', []],
    ["'/'", 'keyword', []],
  ];

  it.each(cases)('classifies %s as %s', (value, type, refs) => {
    const result = classifyValue(value);
    expect(result.type).toBe(type);
    expect(result.references).toEqual(refs);
  });
});

describe('extractReferences', () => {
  it('captures multiple refs in source order, de-duplicated', () => {
    expect(extractReferences('calc(var(--a) + var(--b) - var(--a))')).toEqual(['--a', '--b']);
  });

  it('ignores var() fallbacks but keeps the primary target', () => {
    expect(extractReferences('var(--a, var(--b))')).toEqual(['--a', '--b']);
  });

  it('returns empty for leaf values', () => {
    expect(extractReferences('8px')).toEqual([]);
  });
});
