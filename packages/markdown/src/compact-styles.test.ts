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

// Roles the legacy stylesheet already defined itself (not part of the profile).
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

describe('markdown compact profile stylesheet', () => {
  let compact = '';
  let blocks = '';
  beforeAll(async () => {
    compact = stripComments(await readSource('../styles/markdown-compact.css'));
    blocks = stripComments(await readSource('../styles/markdown-blocks.css'));
  });

  it('is imported by the shared block stylesheet', () => {
    expect(blocks).toContain("@import './markdown-compact.css';");
  });

  it('defines nothing outside .coar-compact', () => {
    const selectors = [...compact.matchAll(/([^{};]+)\{/g)].flatMap((m) => m[1]!.split(','));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector.trim()).toContain('.coar-compact');
  });

  it('defines every role the block stylesheet reads, and only those or its own', () => {
    const read = new Set(
      [...blocks.matchAll(/var\(\s*(--coar-markdown-[a-z0-9-]+)\s*,/g)]
        .map((m) => m[1]!)
        .filter((name) => !LEGACY_ROLES.has(name)),
    );
    const defined = new Set([...compact.matchAll(/(--coar-markdown-[a-z0-9-]+)\s*:/g)].map((m) => m[1]!));
    const used = new Set([...compact.matchAll(/var\(\s*(--coar-markdown-[a-z0-9-]+)\s*\)/g)].map((m) => m[1]!));
    // `--coar-markdown-block-gap` is a legacy hook (read with a 1em fallback).
    read.delete('--coar-markdown-block-gap');
    for (const name of read) expect(defined, name).toContain(name);
    for (const name of defined) {
      expect(read.has(name) || used.has(name) || name === '--coar-markdown-block-gap', name).toBe(true);
    }
  });
});
