import { describe, expect, it } from 'vitest';
import { COMPACT_THEME } from './compact-theme';
import { ROLE_DERIVATION_TOKEN, serializeRoleTheme } from './role-theme';

async function source(relativePath: string): Promise<string> {
  const fsModule = 'node:fs';
  const fs = (await import(/* @vite-ignore */ fsModule)) as {
    readFileSync(path: string, encoding: 'utf8'): string;
  };
  const dir = decodeURIComponent(import.meta.url)
    .replace(/^file:\/\//, '')
    .replace(/^\/([A-Za-z]:)/, '$1')
    .replace(/\/[^/]*$/, '');
  return fs.readFileSync(`${dir}/${relativePath}`, 'utf8');
}

describe('Compact theme, one source for preset and class', () => {
  it('styles/tokens/compact.css is the serialized Compact theme', async () => {
    const css = await source('../../styles/tokens/compact.css');
    // Regenerate with: node --experimental-strip-types packages/ui/scripts/write-compact-css.mjs
    expect(css.replace(/^\/\*\*[\s\S]*?\*\/\n/, '')).toBe(
      serializeRoleTheme('.coar-compact', COMPACT_THEME),
    );
  });

  it('brings only values: the library owns every derivation', async () => {
    const derived = await source('../../styles/tokens/derived.css');
    const derivedNames = new Set(
      Array.from(derived.matchAll(/^ {2}(--coar-[\w-]+): var\(--coar-d-/gm), (m) => m[1]),
    );
    const all = { ...COMPACT_THEME.tokens, ...COMPACT_THEME.mobileTokens };
    for (const name of Object.keys(all)) {
      expect(derivedNames.has(name), `${name} is derived, not a theme value`).toBe(false);
      expect(name.startsWith('--coar-d-'), name).toBe(false);
    }
    expect(COMPACT_THEME.tokens[ROLE_DERIVATION_TOKEN]).toBe('');
  });

  it('gives every curve the derivation reads a value', async () => {
    const derived = await source('../../styles/tokens/derived.css');
    const read = new Set(Array.from(derived.matchAll(/var\((--coar-[\w-]+-lc(?:-dark)?)[,)]/g), (m) => m[1]));
    const given = Object.keys(COMPACT_THEME.tokens).filter((name) => /-lc(-dark)?$/.test(name));
    expect(given.sort()).toEqual([...read].sort());
  });

  it('writes the same rules for any scope selector', () => {
    const theme = { tokens: { '--coar-role-derivation': '', '--coar-ui-font-size': '13px' }, mobileTokens: {} };
    const css = serializeRoleTheme('.coar-theme--acme', theme);
    expect(css).toContain(':root.coar-theme--acme,\n.coar-theme--acme,');
    expect(css).toContain('  --coar-role-derivation: ;\n  --coar-ui-font-size: 13px;');
    expect(css).toContain('color-scheme: var(--coar-compact-color-scheme, light);');
    expect(css).not.toContain('.coar-compact');
    expect(css).not.toContain('.coar-mobile .coar-theme--acme');
    expect(serializeRoleTheme('.x', { ...theme, mobileTokens: { '--coar-ui-font-size': '14px' } }))
      .toContain('.coar-mobile .x,\n.x.coar-mobile,\n.x .coar-mobile,');
  });
});
