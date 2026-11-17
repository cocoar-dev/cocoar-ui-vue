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

describe('markdown-form compact profile stylesheet', () => {
  let compact = '';
  let base = '';
  beforeAll(async () => {
    compact = stripComments(await readSource('../styles/markdown-form-compact.css'));
    base = stripComments(await readSource('../styles/markdown-form.css'));
  });

  it('is imported by the form stylesheet', () => {
    expect(base).toContain("@import './markdown-form-compact.css';");
  });

  it('defines nothing outside .coar-compact', () => {
    const selectors = [...compact.matchAll(/([^{};]+)\{/g)].flatMap((m) => m[1]!.split(','));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector.trim()).toContain('.coar-compact');
  });

  it('defines exactly the roles the form stylesheet reads', () => {
    const readRoles = new Set(
      [...base.matchAll(/var\(\s*(--coar-markdown-form-[a-z0-9-]+)\s*,/g)].map((m) => m[1]!),
    );
    const defined = new Set(
      [...compact.matchAll(/(--coar-markdown-form-[a-z0-9-]+)\s*:/g)].map((m) => m[1]!),
    );
    expect([...readRoles].sort()).toEqual([...defined].sort());
  });
});
