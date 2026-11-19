import { describe, expect, it } from 'vitest';
import { schemeColor, schemeCurve, schemePair } from './scheme-values';

describe('scheme values', () => {
  it.each<[string, [string, string]]>([
    ['#1183cd', ['#1183cd', '#1183cd']],
    [' light-dark(#fff, #000) ', ['#fff', '#000']],
    ['LIGHT-DARK(#fff, #000)', ['#fff', '#000']],
    ['light-dark(rgb(1, 2, 3), var(--ink, #000))', ['rgb(1, 2, 3)', 'var(--ink, #000)']],
    ['light-dark(color-mix(in srgb, red 30%, white), oklch(from var(--base) .7 .1 h))',
      ['color-mix(in srgb, red 30%, white)', 'oklch(from var(--base) .7 .1 h)']],
  ])('splits %s without breaking its inner functions', (value, expected) => {
    expect(schemePair(value)).toEqual(expected);
  });

  it('omits a completely calculated colour', () => {
    expect(schemeColor({}, 'var(--coar-d-text-on-accent)')).toBeUndefined();
  });

  it('lets a calculated dark base follow the authored light base', () => {
    expect(schemeColor({ light: '#facc15' }, '#1183cd', true)).toBe('#facc15');
  });

  it('records an explicitly unlocked dark base even when its value equals light', () => {
    expect(schemeColor({ dark: '#1183cd' }, '#1183cd', true))
      .toBe('light-dark(#1183cd, #1183cd)');
  });

  it('retains an explicit preset dark colour when only light is edited', () => {
    expect(schemeColor({ light: '#facc15' }, 'light-dark(#1183cd, #334155)', true))
      .toBe('light-dark(#facc15, #334155)');
    expect(schemeColor({ light: '#facc15' }, 'light-dark(#1183cd, #1183cd)', true))
      .toBe('light-dark(#facc15, #1183cd)');
    expect(schemeColor({ light: '#334155' }, 'light-dark(#1183cd, #334155)', true))
      .toBe('light-dark(#334155, #334155)');
  });

  it('does not make calculated dark ink follow an authored light ink', () => {
    expect(schemeColor({ light: '#000000' }, 'var(--coar-d-text-on-accent)'))
      .toBe('light-dark(#000000, var(--coar-d-text-on-accent))');
  });

  it('retains calculated light ink when only dark is unlocked', () => {
    expect(schemeColor({ dark: '#ffffff' }, 'var(--coar-d-text-on-accent)'))
      .toBe('light-dark(var(--coar-d-text-on-accent), #ffffff)');
  });

  it('collapses equal authored channels but retains different ones', () => {
    expect(schemeColor({ light: '#000', dark: '#000' }, '#fff')).toBe('#000');
    expect(schemeColor({ light: '#fff', dark: '#000' }, '#fff')).toBe('light-dark(#fff, #000)');
  });

  it('serializes only authored curve channels', () => {
    expect(schemeCurve('--coar-color-accent-600', {})).toEqual([]);
    expect(schemeCurve('--coar-color-accent-600', { dark: { l: .72, c: .12 } }))
      .toEqual([['--coar-color-accent-600-lc-dark', '0.72 0.12']]);
    expect(schemeCurve('--coar-color-accent-600', { light: { l: .5, c: .1 }, dark: { l: .7, c: .2 } }))
      .toEqual([['--coar-color-accent-600-lc', '0.5 0.1'], ['--coar-color-accent-600-lc-dark', '0.7 0.2']]);
  });
});
