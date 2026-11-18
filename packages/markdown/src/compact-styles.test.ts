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

// Roles the legacy stylesheet already defined itself (not given by a theme).
const LEGACY_ROLES = new Set([
  '--coar-markdown-text',
  '--coar-markdown-link',
  '--coar-markdown-muted-text',
  '--coar-markdown-border',
  '--coar-markdown-surface',
  '--coar-markdown-surface-muted',
  '--coar-markdown-radius',
  '--coar-markdown-space-1',
  '--coar-markdown-space-2',
  '--coar-markdown-heading-block-start',
]);

/** Token names a block of the value module (`export const NAME … = { … };`) sets. */
function moduleTokens(source: string, name: string): Set<string> {
  const block = source.match(new RegExp(`export const ${name}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!block) throw new Error(`${name} not found`);
  return new Set([...block[1]!.matchAll(/^\s*'(--coar-[a-z0-9-]+)':/gm)].map((m) => m[1]!));
}

describe('markdown presentation roles', () => {
  let roles = '';
  let blocks = '';
  let constants = new Set<string>();
  let mobileConstants = new Set<string>();
  beforeAll(async () => {
    roles = stripComments(await readSource('../styles/markdown-compact.css'));
    blocks = stripComments(await readSource('../styles/markdown-blocks.css'));
    const values = await readSource('../../ui/src/theme/compact-packages/markdown.ts');
    constants = moduleTokens(values, 'COMPACT_MARKDOWN_TOKENS');
    mobileConstants = moduleTokens(values, 'COMPACT_MARKDOWN_MOBILE_TOKENS');
  });

  it('is imported by the shared block stylesheet', () => {
    expect(blocks).toContain("@import './markdown-compact.css';");
  });

  it('does not depend on the class .coar-compact', () => {
    expect(roles).not.toContain('coar-compact');
    expect(blocks).not.toContain('coar-compact');
  });

  it('derives a role only where a theme activates derivation, and keeps what it inherits otherwise', () => {
    const declared = [...roles.matchAll(/(--coar-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()] as const);
    const derived = declared.filter(([name]) => !name.startsWith('--coar-d-'));
    expect(derived.length).toBeGreaterThan(0);
    for (const [name, value] of declared) {
      if (name.startsWith('--coar-d-')) {
        expect(value.startsWith('var(--coar-role-derivation) '), name).toBe(true);
      } else {
        expect(value, name).toBe(`var(${name.replace('--coar-', '--coar-d-')}, inherit)`);
        expect(constants.has(name), `${name} is derived, not a theme constant`).toBe(false);
      }
    }
    // Zero specificity: a consumer rule on the element wins.
    const derivationSelectors = [...roles.matchAll(/([^{};]+)\{[^{}]*--coar-d-/g)].map((m) => m[1]!.trim());
    expect(derivationSelectors).toEqual([':where(.coar-markdown)']);
  });

  it('declares a property only from a role, with the layers below as fallback', () => {
    const layer = roles.match(/@layer cocoar\.components\s*\{([\s\S]*)\}\s*$/);
    expect(layer).not.toBeNull();
    const outside = roles.replace(layer![0], '');
    // Outside the layer: custom properties only.
    for (const m of outside.matchAll(/[{;]\s*([a-z-]+)\s*:/g)) expect(m[1]!.startsWith('--'), m[1]).toBe(true);
    const properties = [...layer![1]!.matchAll(/[{;]\s*([a-z-]+)\s*:\s*([^;]+);/g)];
    expect(properties.length).toBeGreaterThan(0);
    for (const [, property, value] of properties) {
      const role = value!.match(/^var\((--coar-markdown-[a-z0-9-]+), revert-layer\)$/);
      expect(role, `${property}: ${value}`).not.toBeNull();
      expect(constants.has(role![1]!), role![1]).toBe(true);
    }
  });

  it('reads every role with a fallback, and a theme gives each one as a constant or a derivation', () => {
    const read = new Set(
      [...blocks.matchAll(/var\(\s*(--coar-markdown-[a-z0-9-]+)\s*,/g)]
        .map((m) => m[1]!)
        .filter((name) => !LEGACY_ROLES.has(name)),
    );
    for (const m of roles.matchAll(/var\(\s*(--coar-markdown-[a-z0-9-]+)\s*,\s*revert-layer\)/g)) read.add(m[1]!);
    const derived = new Set([...roles.matchAll(/(--coar-markdown-[a-z0-9-]+)\s*:/g)].map((m) => m[1]!));
    const given = new Set([...derived, ...[...constants].filter((name) => !name.startsWith('--coar-markdown-form-'))]);
    expect([...given].sort()).toEqual([...read].sort());
    // Mobile values only replace constants of the theme.
    for (const name of mobileConstants) expect(constants.has(name), name).toBe(true);
  });
});
