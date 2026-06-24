import { describe, it, expect } from 'vitest';
import { resolveCapabilities } from './flavor';
import { isToolAllowedByCapabilities } from './toolbar-helpers';

describe('resolveCapabilities', () => {
  it('defaults to cocoar (everything on) when undefined — no breaking change', () => {
    expect(resolveCapabilities(undefined)).toEqual({ gfm: true, textColor: true });
  });

  it('maps the named presets', () => {
    expect(resolveCapabilities('commonmark')).toEqual({ gfm: false, textColor: false });
    expect(resolveCapabilities('gfm')).toEqual({ gfm: true, textColor: false });
    expect(resolveCapabilities('cocoar')).toEqual({ gfm: true, textColor: true });
  });

  it('treats a partial object as opt-in (unspecified = off)', () => {
    expect(resolveCapabilities({})).toEqual({ gfm: false, textColor: false });
    expect(resolveCapabilities({ gfm: true })).toEqual({ gfm: true, textColor: false });
    expect(resolveCapabilities({ textColor: true })).toEqual({ gfm: false, textColor: true });
    expect(resolveCapabilities({ gfm: true, textColor: true })).toEqual({ gfm: true, textColor: true });
  });

  it('falls back to cocoar for an unknown preset string', () => {
    expect(resolveCapabilities('nonsense' as 'gfm')).toEqual({ gfm: true, textColor: true });
  });
});

describe('isToolAllowedByCapabilities', () => {
  const commonmark = { gfm: false, textColor: false };
  const gfm = { gfm: true, textColor: false };
  const cocoar = { gfm: true, textColor: true };

  it('always allows portable CommonMark tools', () => {
    for (const caps of [commonmark, gfm, cocoar]) {
      expect(isToolAllowedByCapabilities('bold', caps)).toBe(true);
      expect(isToolAllowedByCapabilities('headings', caps)).toBe(true);
      expect(isToolAllowedByCapabilities('image', caps)).toBe(true);
      expect(isToolAllowedByCapabilities('codeBlock', caps)).toBe(true);
    }
  });

  it('gates GFM tools behind the gfm capability', () => {
    for (const tool of (['table', 'tableOps', 'taskList', 'strikethrough'] as const)) {
      expect(isToolAllowedByCapabilities(tool, commonmark)).toBe(false);
      expect(isToolAllowedByCapabilities(tool, gfm)).toBe(true);
      expect(isToolAllowedByCapabilities(tool, cocoar)).toBe(true);
    }
  });

  it('gates textColor behind the textColor capability', () => {
    expect(isToolAllowedByCapabilities('textColor', commonmark)).toBe(false);
    expect(isToolAllowedByCapabilities('textColor', gfm)).toBe(false);
    expect(isToolAllowedByCapabilities('textColor', cocoar)).toBe(true);
  });
});
