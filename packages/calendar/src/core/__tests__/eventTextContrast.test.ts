import { describe, expect, it } from 'vitest';
import { eventTextColor } from '../eventTextContrast';

describe('eventTextColor', () => {
  it('chooses WCAG black/white contrast for event colours', () => {
    expect(eventTextColor('#000000')).toBe('#ffffff');
    expect(eventTextColor('#ffffff')).toBe('#000000');
    expect(eventTextColor('#f59e0b')).toBe('#000000');
    expect(eventTextColor('#2563eb')).toBe('#ffffff');
  });

  it('supports short hex and preserves a fallback for CSS expressions', () => {
    expect(eventTextColor('#fff')).toBe('#000000');
    expect(eventTextColor('var(--event)')).toBe('var(--coar-text-base, #1a1c1f)');
  });
});
