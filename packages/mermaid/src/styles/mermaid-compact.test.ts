import { describe, expect, it } from 'vitest';

// Vitest blanks CSS imports (also `?raw`), so read the sources from disk. A
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

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** `name: value` of every declaration in the stylesheet of the roles. */
async function roleDeclarations(): Promise<[string, string][]> {
  const source = withoutComments(await readSource('mermaid-compact.css'));
  return [...source.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1]!, m[2]!]);
}

/** The Compact values of this package: the constants a role theme sets itself. */
async function compactValues(): Promise<Record<string, string>[]> {
  const source = await readSource('../../../ui/src/theme/compact-packages/mermaid.ts');
  const blocks = [...source.matchAll(/export const (\w+): Record<string, string> = \{([\s\S]*?)\n\};/g)];
  expect(blocks.map((block) => block[1])).toEqual(['COMPACT_MERMAID_TOKENS', 'COMPACT_MERMAID_MOBILE_TOKENS']);
  return blocks.map((block) =>
    Object.fromEntries([...block[2]!.matchAll(/'(--[\w-]+)': '([^']*)'/g)].map((m) => [m[1]!, m[2]!])));
}

/** Every role the component reads, with the fallback of the default presentation. */
const HISTORICAL_FALLBACKS: Record<string, string> = {
  '--coar-mermaid-height': '420px',
  '--coar-mermaid-radius': 'var(--coar-input-radius, 8px)',
  '--coar-mermaid-control-size': '26px',
  '--coar-mermaid-padding': 'var(--coar-spacing-m, 1rem)',
  '--coar-mermaid-ui-font-size': 'var(--coar-font-size-xs, 14px)',
  '--coar-mermaid-code-radius': 'var(--coar-input-radius, 8px)',
  '--coar-mermaid-code-font-size': 'var(--coar-font-size-xs, 14px)',
};

describe('mermaid roles', () => {
  it('changes nothing without a role theme: only gated derivations, without specificity', async () => {
    const source = withoutComments(await readSource('mermaid-compact.css'));
    const selectors = [...source.matchAll(/([^{}]+)\{/g)].map((match) => match[1]!.trim());
    expect(selectors).toEqual([':where(.coar-mermaid)']);

    const declarations = await roleDeclarations();
    expect(declarations.length).toBeGreaterThan(0);
    for (const [name, value] of declarations) {
      if (name.startsWith('--coar-d-')) {
        // Invalid, so not declared in effect, unless a theme activates the derivation.
        expect(value, name).toMatch(/^var\(--coar-role-derivation\) \S/);
      } else {
        // The derived value, else what the element inherits: as if not declared.
        expect(value, name).toBe(`var(${name.replace('--coar-', '--coar-d-')}, inherit)`);
      }
    }
  });

  it('gives every derived role its gated private value, and back', async () => {
    const names = (await roleDeclarations()).map(([name]) => name);
    const derived = names.filter((name) => name.startsWith('--coar-d-'));
    const roles = names.filter((name) => !name.startsWith('--coar-d-'));
    expect(roles.map((name) => name.replace('--coar-', '--coar-d-')).sort()).toEqual([...derived].sort());
    expect(roles.sort()).toEqual([
      '--coar-mermaid-code-radius',
      '--coar-mermaid-radius',
      '--coar-mermaid-ui-font-size',
    ]);
  });

  it('keeps the constants in the Compact values, none of them derived here', async () => {
    const [tokens, mobileTokens] = await compactValues();
    expect(tokens).toEqual({
      '--coar-mermaid-control-size': '28px',
      '--coar-mermaid-padding': '12px',
      '--coar-mermaid-code-font-size': '13px',
    });
    expect(mobileTokens).toEqual({ '--coar-mermaid-control-size': '44px' });

    const declared = new Set((await roleDeclarations()).map(([name]) => name));
    for (const [name, value] of Object.entries({ ...tokens, ...mobileTokens })) {
      expect(declared.has(name), `${name} is a value, not derived`).toBe(false);
      expect(value, name).not.toContain('var(');
    }
  });

  it('reads every role with the fallback of the default presentation', async () => {
    const component = await readSource('../CoarMermaidDiagram.vue');
    const style = withoutComments(component.slice(component.indexOf('<style>')));
    const read = [...style.matchAll(/var\((--coar-mermaid-[\w-]+)(?:, ((?:[^()]|\([^()]*\))+))?\)/g)];
    for (const [, name, fallback] of read) expect(fallback, name).toBe(HISTORICAL_FALLBACKS[name!]);
    expect([...new Set(read.map((match) => match[1]!))].sort()).toEqual(Object.keys(HISTORICAL_FALLBACKS).sort());

    const [tokens, mobileTokens] = await compactValues();
    const set = [...(await roleDeclarations()).map(([name]) => name), ...Object.keys({ ...tokens, ...mobileTokens })];
    for (const name of set) {
      if (!name.startsWith('--coar-d-')) expect(Object.keys(HISTORICAL_FALLBACKS)).toContain(name);
    }
  });

  it('keys nothing on the class of a presentation', async () => {
    const component = await readSource('../CoarMermaidDiagram.vue');
    const stylesheet = await readSource('mermaid-compact.css');
    const code = withoutComments(component).replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
    expect(code).not.toContain('coar-compact');
    expect(withoutComments(stylesheet)).not.toContain('coar-compact');
    // The activation token derives tokens from tokens; no component rule reads it.
    expect(code).not.toContain('--coar-role-derivation');
  });
});
