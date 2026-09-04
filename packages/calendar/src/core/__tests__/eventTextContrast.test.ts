import { describe, expect, it } from 'vitest';
import { apcaContrast, eventInkColor, eventTextColor, parseHex } from '../eventTextContrast';

describe('eventTextColor — WCAG (default policy)', () => {
  it('chooses WCAG black/white contrast for event colours', () => {
    expect(eventTextColor('#000000')).toBe('#ffffff');
    expect(eventTextColor('#ffffff')).toBe('#000000');
    expect(eventTextColor('#f59e0b')).toBe('#000000');
    expect(eventTextColor('#2563eb')).toBe('#ffffff');
  });

  it('supports short hex and preserves a fallback for CSS expressions', () => {
    expect(eventTextColor('#fff')).toBe('#000000');
    expect(eventTextColor('var(--event)')).toBe('var(--coar-text-base, #1a1c1f)');
    expect(eventTextColor('var(--event)', 'inherit')).toBe('inherit');
    expect(eventTextColor('var(--event)', { fallback: 'inherit', policy: 'apca' })).toBe('inherit');
  });

  it('documents the known WCAG flaw: black wins on saturated red by three percent', () => {
    expect(eventTextColor('#e03131', { policy: 'wcag' })).toBe('#000000');
  });
});

describe('eventTextColor — APCA', () => {
  it('reproduces the reference Lc magnitudes for #e03131 (white ≈ 75, black ≈ 34)', () => {
    const red = parseHex('#e03131')!;
    expect(Math.abs(apcaContrast([255, 255, 255], red))).toBeCloseTo(75, 0);
    expect(Math.abs(apcaContrast([0, 0, 0], red))).toBeCloseTo(34, 0);
  });

  it('picks white on saturated red where WCAG picked black', () => {
    expect(eventTextColor('#e03131', { policy: 'apca' })).toBe('#ffffff');
  });

  it('agrees with WCAG on yellow — black', () => {
    expect(eventTextColor('#f2c010', { policy: 'apca' })).toBe('#000000');
    expect(eventTextColor('#f2c010', { policy: 'wcag' })).toBe('#000000');
  });

  it('keeps the extremes sane', () => {
    expect(eventTextColor('#000000', { policy: 'apca' })).toBe('#ffffff');
    expect(eventTextColor('#ffffff', { policy: 'apca' })).toBe('#000000');
  });
});

describe('eventInkColor', () => {
  it('a consumer textColor wins over both policies', () => {
    expect(eventInkColor({ background: '#e03131', textColor: '#fde68a', policy: 'wcag' })).toBe(
      '#fde68a',
    );
    expect(eventInkColor({ background: '#e03131', textColor: '#fde68a', policy: 'apca' })).toBe(
      '#fde68a',
    );
  });

  it('ignores non-string / blank textColor and falls through to the policy', () => {
    expect(eventInkColor({ background: '#e03131', textColor: 42, policy: 'apca' })).toBe('#ffffff');
    expect(eventInkColor({ background: '#e03131', textColor: '  ', policy: 'wcag' })).toBe(
      '#000000',
    );
    expect(eventInkColor({ background: '#e03131' })).toBe('#000000');
  });
});
