import { describe, expect, it } from 'vitest';
import { apcaContrast, APCA_TEXT_ON_THRESHOLD } from './color-contrast';

describe('APCA text on saturated fills', () => {
  it('matches the known APCA red example and keeps its polarity', () => {
    expect(apcaContrast([255, 255, 255], [224, 49, 49])).toBeCloseTo(-75, 0);
    expect(apcaContrast([0, 0, 0], [224, 49, 49])).toBeCloseTo(34, 0);
    expect(apcaContrast([255, 255, 255], [255, 255, 255])).toBe(0);
    expect(apcaContrast([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it('calculates the white/black crossing rather than assuming a WCAG threshold', () => {
    expect(APCA_TEXT_ON_THRESHOLD).toBeCloseTo(0.3419552539852081, 14);
    // The coefficients sum to 1.0000001; a gray at this value has the crossing Y.
    const gray = 255 * (APCA_TEXT_ON_THRESHOLD / 1.0000001) ** (1 / 2.4);
    const contrast = (channel: number, offset = 0) =>
      Math.abs(apcaContrast([channel, channel, channel], [gray + offset, gray + offset, gray + offset]));
    expect(contrast(0)).toBeCloseTo(contrast(255), 10);
    expect(contrast(255, -0.01)).toBeGreaterThan(contrast(0, -0.01));
    expect(contrast(0, 0.01)).toBeGreaterThan(contrast(255, 0.01));
  });

  it('selects white on Enterprise blue and black on yellow', () => {
    for (const [rgb, white] of [
      [[17, 131, 205], true],
      [[250, 204, 21], false],
    ] as const) {
      expect(Math.abs(apcaContrast([255, 255, 255], [...rgb])) >
        Math.abs(apcaContrast([0, 0, 0], [...rgb]))).toBe(white);
    }
  });
});
