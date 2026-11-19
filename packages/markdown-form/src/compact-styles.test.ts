import { beforeAll, describe, expect, it } from 'vitest';

// Vitest blanks CSS imports (also `?raw`), so read the stylesheet from disk. A
// non-literal specifier keeps @types/node out of the package typecheck (as in
// `@cocoar/vue-ui`'s mobile-controls.test.ts).
async function readSource(path: string): Promise<string> {
  const fsModule = 'node:fs';
  const fs = (await import(/* @vite-ignore */ fsModule)) as {
    readFileSync(path: string, encoding: 'utf8'): string;
  };
  const dir = decodeURIComponent(import.meta.url)
    .replace(/^file:\/\//, '')
    .replace(/^\/([A-Za-z]:)/, '$1')
    .replace(/\/[^/]*$/, '');
  return fs.readFileSync(`${dir}/${path}`, 'utf8');
}

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Token names a block of the value module (`export const NAME … = { … };`) sets. */
function moduleTokens(source: string, name: string): Set<string> {
  const block = source.match(new RegExp(`export const ${name}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!block) throw new Error(`${name} not found`);
  return new Set([...block[1]!.matchAll(/^\s*'(--coar-[a-z0-9-]+)':/gm)].map((m) => m[1]!));
}

describe('markdown-form presentation roles', () => {
  let roles = '';
  let base = '';
  let constants = new Set<string>();
  beforeAll(async () => {
    roles = stripComments(await readSource('../styles/markdown-form-compact.css'));
    base = stripComments(await readSource('../styles/markdown-form.css'));
    const values = await readSource('../../ui/src/theme/compact-packages/markdown.ts');
    constants = new Set(
      [...moduleTokens(values, 'COMPACT_MARKDOWN_TOKENS')].filter((name) => name.startsWith('--coar-markdown-form-')),
    );
  });

  it('is imported by the form stylesheet', () => {
    expect(base).toContain("@import './markdown-form-compact.css';");
  });

  it('does not depend on the class .coar-compact', () => {
    expect(roles).not.toContain('coar-compact');
    expect(base).not.toContain('coar-compact');
  });

  it('derives a role only where a theme activates derivation, and keeps what it inherits otherwise', () => {
    // Zero specificity, on the form element: a consumer rule on it wins.
    const derivations = roles.slice(0, roles.indexOf('@layer'));
    const selectors = [...derivations.matchAll(/([^{};]+)\{/g)].map((m) => m[1]!.trim());
    expect(selectors).toEqual([':where(.coar-markdown-form)']);
    const declared = [...derivations.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()] as const);
    expect(declared.length).toBeGreaterThan(0);
    for (const [name, value] of declared) {
      if (name.startsWith('--coar-d-')) {
        expect(value.startsWith('var(--coar-role-derivation) '), name).toBe(true);
        const input = name.replace('--coar-d-', '--coar-theme-');
        expect(value.startsWith(`var(--coar-role-derivation) var(${input}, `), name).toBe(true);
      } else {
        expect(value, name).toBe(`var(${name.replace('--coar-', '--coar-d-')}, inherit)`);
      }
    }
  });

  it('only changes native color schemes when the theme supplies a package input', () => {
    const layer = roles.slice(roles.indexOf('@layer'));
    expect(layer).toContain('@layer cocoar.components');
    expect(layer).toContain('color-scheme: var(--coar-theme-markdown-form-control-color-scheme, revert-layer);');
    expect(layer).toContain('.coar-markdown-form input,');
    expect(layer).toContain('.coar-markdown-form select,');
    expect(layer).toContain('.coar-markdown-form textarea');
  });

  it('reads every role with a fallback, and a theme gives each one as a constant or a derivation', () => {
    const read = new Set([...base.matchAll(/var\(\s*(--coar-markdown-form-[a-z0-9-]+)\s*,/g)].map((m) => m[1]!));
    const derived = new Set([...roles.matchAll(/(--coar-markdown-form-[a-z0-9-]+)\s*:/g)].map((m) => m[1]!));
    for (const name of constants) expect(derived.has(name), `${name} is a constant, not derived`).toBe(false);
    expect([...derived, ...constants].sort()).toEqual([...read].sort());
  });
});
