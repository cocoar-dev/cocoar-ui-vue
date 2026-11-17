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

const components = import.meta.glob<string>('./**/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('markdown-editor compact stylesheet', () => {
  it('uses the shared live context for both body-teleported tools', () => {
    for (const [file, style] of [
      ['./CoarMarkdownEditor.vue', 'presentation.value.style'],
      ['./table/TableHandles.vue', 'presentation.style'],
    ]) {
      expect(components[file]).toContain('useCompactPresentationContext');
      expect(components[file]).toContain(style);
    }
  });

  it('protects the compact embed selection from the editable outline reset only inside the profile', () => {
    expect(components['./CoarMarkdownEditor.vue']).toContain(
      '.coar-markdown-embed-host--selected,\n.coar-compact .coar-md-area .milkdown .coar-markdown-embed-host--selected {',
    );
    expect(components['./CoarMarkdownEditor.vue']).toContain(
      '.coar-md-area .milkdown [contenteditable] {\n  outline: none;',
    );
  });
  let css = '';
  beforeAll(async () => {
    css = (await readSource('styles/markdown-editor-compact.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  });

  it('defines nothing outside .coar-compact', () => {
    const selectors = [...css.matchAll(/([^{};]+)\{/g)].flatMap((m) => m[1]!.split(','));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector.trim()).toContain('.coar-compact');
  });

  it('defines every --coar-markdown-editor-* role the components read', () => {
    expect(Object.keys(components)).toContain('./CoarMarkdownEditor.vue');
    const read = new Set(
      Object.values(components).flatMap((source) =>
        [...source.matchAll(/var\(\s*(--coar-markdown-editor-[a-z0-9-]+)\s*,/g)].map((m) => m[1]!),
      ),
    );
    const defined = new Set([...css.matchAll(/(--coar-markdown-editor-[a-z0-9-]+)\s*:/g)].map((m) => m[1]!));
    expect(read.size).toBeGreaterThan(0);
    for (const name of read) expect(defined, name).toContain(name);
  });
});
