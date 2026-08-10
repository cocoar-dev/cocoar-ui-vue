import { describe, it, expect } from 'vitest';
import { formatBoxSides, parseBoxSides, summariseBoxSides } from './boxSides';

describe('parseBoxSides', () => {
  it('applies the CSS 1-to-4 value rules', () => {
    expect(parseBoxSides('16px')).toEqual({ top: '16px', right: '16px', bottom: '16px', left: '16px' });
    expect(parseBoxSides('16px 32px')).toEqual({ top: '16px', right: '32px', bottom: '16px', left: '32px' });
    expect(parseBoxSides('16px 32px 8px')).toEqual({ top: '16px', right: '32px', bottom: '8px', left: '32px' });
    expect(parseBoxSides('1px 2px 3px 4px')).toEqual({ top: '1px', right: '2px', bottom: '3px', left: '4px' });
  });

  it('treats an unset value as four empty sides', () => {
    expect(parseBoxSides(undefined)).toEqual({ top: '', right: '', bottom: '', left: '' });
    expect(parseBoxSides('   ')).toEqual({ top: '', right: '', bottom: '', left: '' });
  });

  it('refuses to split values it cannot take apart safely', () => {
    // Splitting on whitespace would tear these into meaningless fragments.
    expect(parseBoxSides('calc(100% - 10px)')).toBeNull();
    expect(parseBoxSides('min(2rem, 5%) 1rem')).toBeNull();
    expect(parseBoxSides('1px 2px 3px 4px 5px')).toBeNull();
  });
});

describe('formatBoxSides', () => {
  it('emits the shortest equivalent shorthand', () => {
    expect(formatBoxSides({ top: '8px', right: '8px', bottom: '8px', left: '8px' })).toBe('8px');
    expect(formatBoxSides({ top: '8px', right: '4px', bottom: '8px', left: '4px' })).toBe('8px 4px');
    expect(formatBoxSides({ top: '8px', right: '4px', bottom: '2px', left: '4px' })).toBe('8px 4px 2px');
    expect(formatBoxSides({ top: '1px', right: '2px', bottom: '3px', left: '4px' })).toBe('1px 2px 3px 4px');
  });

  it('returns undefined when nothing is set so the caller can remove the value', () => {
    expect(formatBoxSides({ top: '', right: '', bottom: '', left: '' })).toBeUndefined();
    expect(formatBoxSides({ top: ' ', right: '', bottom: '', left: '' })).toBeUndefined();
  });

  it('fills blanks with 0 rather than shifting the remaining sides', () => {
    // '16px' alone in `top` would otherwise emit '16px', silently padding all
    // four sides instead of only the top.
    expect(formatBoxSides({ top: '16px', right: '', bottom: '', left: '' })).toBe('16px 0 0');
    // Not '0 8px 0': the three-value form derives left from right, which would
    // pad the left side too.
    expect(formatBoxSides({ top: '', right: '8px', bottom: '', left: '' })).toBe('0 8px 0 0');
  });

  it('round-trips every shorthand form', () => {
    for (const value of ['16px', '16px 32px', '16px 32px 8px', '1px 2px 3px 4px']) {
      expect(formatBoxSides(parseBoxSides(value)!)).toBe(value);
    }
  });
});

describe('summariseBoxSides', () => {
  it('collapses to the shortest readable form', () => {
    expect(summariseBoxSides('16px 16px 16px 16px')).toBe('16px');
    expect(summariseBoxSides('16px 32px 16px 32px')).toBe('16px 32px');
    expect(summariseBoxSides(undefined)).toBe('');
  });

  it('passes through values it could not split', () => {
    expect(summariseBoxSides('calc(100% - 10px)')).toBe('calc(100% - 10px)');
  });
});
