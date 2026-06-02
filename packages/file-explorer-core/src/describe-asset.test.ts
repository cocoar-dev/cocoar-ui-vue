import { describe, it, expect } from 'vitest';

import type { Asset } from './asset-store';
import { buildAssetProperties, type AssetProperty } from './describe-asset';

/** Build a minimal file asset with sensible defaults. */
function file(name: string, extra: Partial<Asset> = {}): Asset {
  return { id: name, name, kind: 'file', parentId: null, ...extra };
}
function folder(name: string, extra: Partial<Asset> = {}): Asset {
  return { id: name, name, kind: 'folder', parentId: null, ...extra };
}

/** Index the rows by key for terse assertions. */
function byKey(rows: AssetProperty[]): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

describe('buildAssetProperties', () => {
  it('describes a script file with its editor, language, and extension', () => {
    const rows = buildAssetProperties(file('main.ts'), {
      meta: { editor: 'script', language: 'typescript' },
      path: ['main.ts'],
    });
    expect(byKey(rows)).toEqual({
      name: 'main.ts',
      type: 'Script',
      language: 'TypeScript',
      extension: '.ts',
    });
  });

  it('describes a markdown file (no language row)', () => {
    const rows = buildAssetProperties(file('README.md'), {
      meta: { editor: 'markdown' },
      path: ['README.md'],
    });
    expect(byKey(rows)).toEqual({ name: 'README.md', type: 'Markdown', extension: '.md' });
    expect(rows.some((r) => r.key === 'language')).toBe(false);
  });

  it('labels pdf and image editors', () => {
    expect(byKey(buildAssetProperties(file('a.pdf'), { meta: { editor: 'pdf' }, path: ['a.pdf'] })).type).toBe('PDF');
    expect(byKey(buildAssetProperties(file('a.png'), { meta: { editor: 'image' }, path: ['a.png'] })).type).toBe('Image');
  });

  it('falls back to "File" when the editor is unknown (null meta)', () => {
    const rows = buildAssetProperties(file('data.bin'), { meta: null, path: ['data.bin'] });
    expect(byKey(rows)).toEqual({ name: 'data.bin', type: 'File', extension: '.bin' });
  });

  it('describes a folder with Name + Type only', () => {
    const rows = buildAssetProperties(folder('src'), { meta: null, path: ['src'] });
    expect(byKey(rows)).toEqual({ name: 'src', type: 'Folder' });
  });

  it('adds a Path row only when the asset is nested', () => {
    const nested = buildAssetProperties(file('Button.vue'), {
      meta: null,
      path: ['src', 'components', 'Button.vue'],
    });
    expect(byKey(nested).path).toBe('src / components / Button.vue');

    const root = buildAssetProperties(file('Button.vue'), { meta: null, path: ['Button.vue'] });
    expect(root.some((r) => r.key === 'path')).toBe(false);
  });

  it('omits the extension for dotfiles and extension-less names', () => {
    expect(buildAssetProperties(file('.gitignore'), { meta: null, path: ['.gitignore'] }).some((r) => r.key === 'extension')).toBe(false);
    expect(buildAssetProperties(file('LICENSE'), { meta: null, path: ['LICENSE'] }).some((r) => r.key === 'extension')).toBe(false);
  });

  it('prettifies common languages and falls back to the raw token otherwise', () => {
    const csharp = buildAssetProperties(file('a.cs'), { meta: { editor: 'script', language: 'csharp' }, path: ['a.cs'] });
    expect(byKey(csharp).language).toBe('C#');
    const plain = buildAssetProperties(file('notes.txt'), { meta: { editor: 'script', language: 'plaintext' }, path: ['notes.txt'] });
    expect(byKey(plain).language).toBe('Plain text');
    // An unmapped language token is shown verbatim rather than dropped.
    const exotic = buildAssetProperties(file('a.zig'), { meta: { editor: 'script', language: 'zig' as never }, path: ['a.zig'] });
    expect(byKey(exotic).language).toBe('zig');
  });

  it('always leads with Name and returns a fresh array each call', () => {
    const asset = file('main.ts');
    const ctx = { meta: { editor: 'script' as const, language: 'typescript' as const }, path: ['main.ts'] };
    const a = buildAssetProperties(asset, ctx);
    const b = buildAssetProperties(asset, ctx);
    expect(a[0]).toEqual({ key: 'name', label: 'Name', value: 'main.ts' });
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
