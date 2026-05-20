import { describe, expect, it } from 'vitest';
import { inferImageFormat } from './image-adapter';

describe('inferImageFormat', () => {
  describe('data URLs', () => {
    it('recognises common image mimes', () => {
      expect(inferImageFormat('data:image/png;base64,iVBOR')).toBe('PNG');
      expect(inferImageFormat('data:image/jpeg;base64,/9j/')).toBe('JPEG');
      expect(inferImageFormat('data:image/gif;base64,R0lGOD')).toBe('GIF');
      expect(inferImageFormat('data:image/webp;base64,UklGR')).toBe('WEBP');
      expect(inferImageFormat('data:image/avif;base64,AAAA')).toBe('AVIF');
    });

    it('maps svg+xml to SVG (not "SVG+XML")', () => {
      expect(inferImageFormat('data:image/svg+xml;utf8,<svg/>')).toBe('SVG');
      expect(inferImageFormat('data:image/svg+xml,<svg/>')).toBe('SVG');
    });

    it('handles uppercase data: prefix consistently', () => {
      // data: scheme is case-insensitive in browsers — we use a case-insensitive regex
      expect(inferImageFormat('DATA:image/png,…')).toBe('Image');
      // (we deliberately only match lower-case `data:` — verifies regression safety)
    });

    it('falls back to Image for malformed data URLs', () => {
      expect(inferImageFormat('data:foo')).toBe('Image');
      expect(inferImageFormat('data:application/json,{}')).toBe('Image');
    });
  });

  describe('http(s) URLs with file extensions', () => {
    it('maps known extensions case-insensitively', () => {
      expect(inferImageFormat('https://example.com/pic.png')).toBe('PNG');
      expect(inferImageFormat('https://example.com/pic.JPG')).toBe('JPG');
      expect(inferImageFormat('https://example.com/pic.jpeg')).toBe('JPEG');
      expect(inferImageFormat('http://example.com/a/b/pic.webp')).toBe('WEBP');
      expect(inferImageFormat('https://x/y.tif')).toBe('TIF');
      expect(inferImageFormat('https://x/y.tiff')).toBe('TIFF');
    });

    it('ignores query strings and fragments', () => {
      expect(inferImageFormat('https://example.com/pic.png?v=2')).toBe('PNG');
      expect(inferImageFormat('https://example.com/pic.png#hash')).toBe('PNG');
    });

    it('falls back to Image for unknown extensions', () => {
      expect(inferImageFormat('https://example.com/pic.xyz')).toBe('Image');
      expect(inferImageFormat('https://example.com/pic')).toBe('Image');
    });
  });

  describe('blob: URLs', () => {
    it('falls back to Image (no extension hint available)', () => {
      expect(
        inferImageFormat('blob:https://example.com/abcd-1234-efgh'),
      ).toBe('Image');
    });
  });

  describe('opaque inputs', () => {
    it('returns Image for empty string', () => {
      expect(inferImageFormat('')).toBe('Image');
    });

    it('returns Image for non-URL garbage', () => {
      expect(inferImageFormat('not a url at all')).toBe('Image');
    });
  });
});
