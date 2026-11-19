import { describe, expect, it } from 'vitest';
import { hexToOklch } from './color-preview';

describe('hexToOklch', () => {
  it('matches the CSS Color 4 reference values', () => {
    const white = hexToOklch('#ffffff')!;
    expect(white.l).toBeCloseTo(1, 3);
    expect(white.c).toBeCloseTo(0, 3);
    expect(hexToOklch('#000000')!.l).toBeCloseTo(0, 3);
    const red = hexToOklch('#FF0000')!;
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
  });

  it('reads only six-digit hex colours', () => {
    expect(hexToOklch('red')).toBeNull();
    expect(hexToOklch('#fff')).toBeNull();
  });
});
