import { describe, expect, it } from 'vitest';
import {
  isColorSpanClose,
  parseColorSpanOpen,
  sanitizeColor,
  sanitizeColorStyle,
  serializeColorSpanClose,
  serializeColorSpanOpen,
} from './color-span';

describe('sanitizeColor', () => {
  it.each([
    ['#f00', '#f00'],
    ['#FF0000', '#ff0000'],
    ['#FFAACCDD', '#ffaaccdd'],
    ['rgb(255, 0, 0)', 'rgb(255, 0, 0)'],
    ['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.5)'],
    ['rgb(255 0 0)', 'rgb(255 0 0)'],
    ['rgb(255 0 0 / 0.5)', 'rgb(255 0 0 / 0.5)'],
    ['hsl(120, 50%, 40%)', 'hsl(120, 50%, 40%)'],
    ['hsl(120deg 50% 40%)', 'hsl(120deg 50% 40%)'],
    ['red', 'red'],
    ['RED', 'red'],
    ['transparent', 'transparent'],
  ])('accepts %s', (input, expected) => {
    expect(sanitizeColor(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'expression(alert(1))',
    'url(http://evil.example/x)',
    'red; background: url(x)',
    'red /* comment */',
    'var(--coar-text-red)',
    'redx', // not a known named color
    '#ggg',
    '#ff', // 2 hex digits — not a valid CSS color
    '<script>alert(1)</script>',
    'rgb(300, 0, 0', // unbalanced
    'rgb(0, 0, 0)/*',
    'red"',
    "red'",
    'red\\hack',
    // Lots of whitespace that hides another decl
    'red​',
    // Long DoS-ish input
    'a'.repeat(200),
  ])('rejects %s', (input) => {
    expect(sanitizeColor(input)).toBeNull();
  });
});

describe('sanitizeColorStyle', () => {
  it('accepts a single color declaration', () => {
    expect(sanitizeColorStyle('color: red')).toBe('red');
    expect(sanitizeColorStyle('color: #f00;')).toBe('#f00');
    expect(sanitizeColorStyle('  color  :  rgb(0, 0, 0)  ')).toBe('rgb(0, 0, 0)');
  });

  it('rejects multi-declarations', () => {
    expect(sanitizeColorStyle('color: red; background: yellow')).toBeNull();
    expect(sanitizeColorStyle('color: red; ')).toBe('red'); // trailing-only is fine
    expect(sanitizeColorStyle('background: red')).toBeNull();
  });

  it('rejects non-color properties even if alone', () => {
    expect(sanitizeColorStyle('background-color: red')).toBeNull();
    expect(sanitizeColorStyle('font-weight: bold')).toBeNull();
  });

  it('rejects when the value fails sanitizeColor', () => {
    expect(sanitizeColorStyle('color: url(x)')).toBeNull();
    expect(sanitizeColorStyle('color: ')).toBeNull();
  });
});

describe('parseColorSpanOpen', () => {
  it('parses a clean span open tag', () => {
    expect(parseColorSpanOpen('<span style="color: red">')).toEqual({ color: 'red' });
    expect(parseColorSpanOpen('<span style="color:#f00">')).toEqual({ color: '#f00' });
    expect(parseColorSpanOpen('<span  style = "color: rgb(0, 0, 0)" >')).toEqual({
      color: 'rgb(0, 0, 0)',
    });
    expect(parseColorSpanOpen("<span style='color: red'>")).toEqual({ color: 'red' });
  });

  it('rejects spans with extra attributes', () => {
    expect(parseColorSpanOpen('<span class="x" style="color: red">')).toBeNull();
    expect(parseColorSpanOpen('<span style="color: red" id="x">')).toBeNull();
    expect(parseColorSpanOpen('<span data-x="1" style="color: red">')).toBeNull();
    expect(parseColorSpanOpen('<span onclick="x" style="color: red">')).toBeNull();
  });

  it('rejects spans with no style', () => {
    expect(parseColorSpanOpen('<span>')).toBeNull();
    expect(parseColorSpanOpen('<span class="x">')).toBeNull();
  });

  it('rejects spans whose style smuggles other declarations', () => {
    expect(
      parseColorSpanOpen('<span style="color: red; background: yellow">'),
    ).toBeNull();
    expect(parseColorSpanOpen('<span style="background: red">')).toBeNull();
  });

  it('rejects non-span tags', () => {
    expect(parseColorSpanOpen('<div style="color: red">')).toBeNull();
    expect(parseColorSpanOpen('<font color="red">')).toBeNull();
    expect(parseColorSpanOpen('</span>')).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(parseColorSpanOpen('span style="color: red"')).toBeNull();
    expect(parseColorSpanOpen('<span')).toBeNull();
    expect(parseColorSpanOpen('')).toBeNull();
  });
});

describe('isColorSpanClose', () => {
  it('matches well-formed close tags', () => {
    expect(isColorSpanClose('</span>')).toBe(true);
    expect(isColorSpanClose('</ span >')).toBe(true);
    expect(isColorSpanClose('</SPAN>')).toBe(true);
  });

  it('rejects opens and other tags', () => {
    expect(isColorSpanClose('<span>')).toBe(false);
    expect(isColorSpanClose('</div>')).toBe(false);
    expect(isColorSpanClose('</span attr="x">')).toBe(false);
  });
});

describe('serialize helpers', () => {
  it('round-trips through parseColorSpanOpen', () => {
    const open = serializeColorSpanOpen('#f00');
    expect(open).toBe('<span style="color: #f00">');
    expect(parseColorSpanOpen(open)).toEqual({ color: '#f00' });
  });

  it('emits a static close tag', () => {
    expect(serializeColorSpanClose()).toBe('</span>');
    expect(isColorSpanClose(serializeColorSpanClose())).toBe(true);
  });
});
