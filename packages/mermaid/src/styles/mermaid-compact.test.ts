import { describe, expect, it } from 'vitest';

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

describe('mermaid compact stylesheet', () => {
  it('defines nothing outside .coar-compact', async () => {
    const source = await readSource('mermaid-compact.css');
    const selectors = [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].flatMap(
      (match) => match[1]!.split(','),
    );
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toContain('.coar-compact');
  });
});
