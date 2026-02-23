import { describe, it, expect } from 'vitest';
import {
  computeOverlayCoordinates,
  rectFromPoint,
  type Rect,
  type OverlaySize,
  type ViewportRect,
} from './overlay-position';
import type { PositionSpec } from './overlay-types';

const viewport: ViewportRect = { width: 1024, height: 768 };
const overlaySize: OverlaySize = { width: 200, height: 100 };

function makeAnchorRect(x: number, y: number, w: number, h: number): Rect {
  return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
}

describe('overlay-position', () => {
  describe('rectFromPoint', () => {
    it('creates a rect from point with zero size', () => {
      const rect = rectFromPoint({ x: 100, y: 200 }, 0, 0);
      expect(rect).toEqual({ left: 100, top: 200, right: 100, bottom: 200, width: 0, height: 0 });
    });

    it('creates a rect from point with size', () => {
      const rect = rectFromPoint({ x: 50, y: 50 }, 100, 40);
      expect(rect).toEqual({ left: 50, top: 50, right: 150, bottom: 90, width: 100, height: 40 });
    });
  });

  describe('computeOverlayCoordinates', () => {
    const anchorCenter = makeAnchorRect(400, 300, 100, 40);

    it('places bottom (default)', () => {
      const pos: PositionSpec = { placement: 'bottom', offset: 8 };
      const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport);
      expect(result.placement).toBe('bottom');
      expect(result.top).toBe(anchorCenter.bottom + 8);
      expect(result.left).toBe(anchorCenter.left + anchorCenter.width / 2 - overlaySize.width / 2);
    });

    it('places top', () => {
      const pos: PositionSpec = { placement: 'top', offset: 8 };
      const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport);
      expect(result.placement).toBe('top');
      expect(result.top).toBe(anchorCenter.top - overlaySize.height - 8);
    });

    it('places bottom-start', () => {
      const pos: PositionSpec = { placement: 'bottom-start', offset: 4 };
      const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport);
      expect(result.placement).toBe('bottom-start');
      expect(result.left).toBe(anchorCenter.left);
      expect(result.top).toBe(anchorCenter.bottom + 4);
    });

    it('places bottom-end', () => {
      const pos: PositionSpec = { placement: 'bottom-end', offset: 4 };
      const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport);
      expect(result.left).toBe(anchorCenter.right - overlaySize.width);
    });

    it('places left', () => {
      const pos: PositionSpec = { placement: 'left', offset: 8 };
      const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport);
      expect(result.left).toBe(anchorCenter.left - overlaySize.width - 8);
    });

    it('places right', () => {
      const pos: PositionSpec = { placement: 'right', offset: 8 };
      const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport);
      expect(result.left).toBe(anchorCenter.right + 8);
    });

    it('places center', () => {
      const pos: PositionSpec = { placement: 'center', offset: 0 };
      const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport);
      const cx = anchorCenter.left + anchorCenter.width / 2;
      const cy = anchorCenter.top + anchorCenter.height / 2;
      expect(result.left).toBe(cx - overlaySize.width / 2);
      expect(result.top).toBe(cy - overlaySize.height / 2);
    });

    it('flips to alternate placement when primary overflows', () => {
      // Anchor near bottom of viewport — bottom placement overflows
      const anchorNearBottom = makeAnchorRect(400, 700, 100, 40);
      const pos: PositionSpec = {
        placement: ['bottom', 'top'],
        offset: 8,
        flip: true,
      };
      const result = computeOverlayCoordinates(anchorNearBottom, overlaySize, pos, viewport);
      // Should flip to top since bottom doesn't fit
      expect(result.placement).toBe('top');
      expect(result.top).toBe(anchorNearBottom.top - overlaySize.height - 8);
    });

    it('chooses best-fit when no placement fits completely', () => {
      // Very large overlay that won't fit anywhere
      const bigOverlay: OverlaySize = { width: 2000, height: 2000 };
      const pos: PositionSpec = {
        placement: ['bottom', 'top', 'left', 'right'],
        offset: 0,
        flip: true,
      };
      const result = computeOverlayCoordinates(anchorCenter, bigOverlay, pos, viewport);
      // Should pick one with least overflow
      expect(result.placement).toBeDefined();
    });

    it('shifts into boundary', () => {
      // Anchor near right edge — bottom placement overflows right
      const anchorNearRight = makeAnchorRect(900, 300, 100, 40);
      const pos: PositionSpec = {
        placement: 'bottom',
        offset: 4,
        shift: true,
      };
      const result = computeOverlayCoordinates(anchorNearRight, overlaySize, pos, viewport);
      // Should be shifted left to fit within viewport
      expect(result.left + overlaySize.width).toBeLessThanOrEqual(viewport.width);
    });

    it('shifts into boundary top', () => {
      const anchorNearLeft = makeAnchorRect(10, 10, 100, 40);
      const pos: PositionSpec = {
        placement: 'top',
        offset: 4,
        shift: true,
      };
      const result = computeOverlayCoordinates(anchorNearLeft, overlaySize, pos, viewport);
      expect(result.left).toBeGreaterThanOrEqual(0);
    });

    it('uses custom boundary rect', () => {
      const boundary: Rect = { left: 100, top: 100, right: 500, bottom: 400, width: 400, height: 300 };
      const pos: PositionSpec = {
        placement: 'bottom',
        offset: 4,
        shift: true,
      };
      const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport, boundary);
      expect(result.left).toBeGreaterThanOrEqual(boundary.left);
      expect(result.left + overlaySize.width).toBeLessThanOrEqual(boundary.right);
    });

    it('handles placement array with single item', () => {
      const pos: PositionSpec = { placement: ['right'], offset: 0 };
      const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport);
      expect(result.placement).toBe('right');
    });

    it('handles all start/end variants', () => {
      const variants: Array<{ placement: string; checkLeft?: boolean; checkTop?: boolean }> = [
        { placement: 'top-start', checkLeft: true },
        { placement: 'top-end', checkLeft: true },
        { placement: 'left-start', checkTop: true },
        { placement: 'left-end', checkTop: true },
        { placement: 'right-start', checkTop: true },
        { placement: 'right-end', checkTop: true },
      ];

      for (const v of variants) {
        const pos: PositionSpec = { placement: v.placement as 'top-start', offset: 0 };
        const result = computeOverlayCoordinates(anchorCenter, overlaySize, pos, viewport);
        expect(result.placement).toBe(v.placement);
      }
    });
  });
});
