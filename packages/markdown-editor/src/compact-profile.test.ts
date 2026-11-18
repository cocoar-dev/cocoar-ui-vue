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

const ROLE = /--coar-markdown-editor-[a-z0-9-]+/g;

describe('markdown-editor role-theme stylesheet', () => {
  let css = '';
  let unlayered = '';
  let layered = '';
  let constants = new Set<string>();
  beforeAll(async () => {
    css = (await readSource('styles/markdown-editor-compact.css')).replace(/\/\*[\s\S]*?\*\//g, '');
    const layer = css.indexOf('@layer cocoar.components {');
    unlayered = css.slice(0, layer);
    layered = css.slice(layer);
    // The theme's values for this package (`@cocoar/vue-ui` does not export them).
    const values = await readSource('../../ui/src/theme/compact-packages/markdown-editor.ts');
    constants = new Set(values.match(ROLE) ?? []);
  });

  it('uses the shared live context for both body-teleported tools', () => {
    for (const [file, style] of [
      ['./CoarMarkdownEditor.vue', 'presentation.value.style'],
      ['./table/TableHandles.vue', 'presentation.style'],
    ]) {
      expect(components[file]).toContain('useCompactPresentationContext');
      expect(components[file]).toContain(style);
    }
  });

  it('keys nothing on the .coar-compact class', () => {
    expect(css).not.toContain('coar-compact');
    for (const [file, source] of Object.entries(components)) {
      expect(source, file).not.toMatch(/\.coar-compact|['"`]coar-compact/);
    }
  });

  it('declares only gated derivations outside the layer, with no specificity', () => {
    const rules = [...unlayered.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    expect(rules.length).toBeGreaterThan(0);
    const derived: string[] = [];
    for (const [, selector, body] of rules) {
      expect(selector!.trim()).toMatch(/^:where\([\s\S]+\)$/);
      const declarations = body!.split(';').map((d) => d.trim()).filter(Boolean);
      for (const declaration of declarations) {
        const [, name, value] = /^(--[a-z0-9-]+)\s*:\s*([\s\S]+)$/.exec(declaration)!;
        if (name!.startsWith('--coar-d-')) {
          // Invalid unless a theme activates the derivation and supplies the input.
          expect(value, name).toMatch(/^var\(--coar-role-derivation\) var\(--coar-[a-z0-9-]+\)$/);
          derived.push(name!.replace('--coar-d-', '--coar-'));
        } else {
          // Without a theme the role is what the element inherited.
          expect(value, name).toBe(`var(${name!.replace('--coar-', '--coar-d-')}, inherit)`);
          expect(derived).toContain(name);
        }
      }
    }
    // A role is either derived here or a constant of the theme, never both.
    for (const name of derived) expect(constants, name).not.toContain(name);
  });

  it('declares layered properties that are no-ops without their value', () => {
    const declarations = [...layered.matchAll(/^\s+([a-z-]+):\s*([^;]+);/gm)];
    expect(declarations.length).toBeGreaterThan(0);
    for (const [, property, value] of declarations) {
      if (value === 'inherit') {
        // An inherited property the default presentation does not declare.
        expect(property).toBe('font-size');
        continue;
      }
      expect(value, property).toMatch(/^var\(--coar-markdown-editor-[a-z0-9-]+, revert-layer\)$/);
    }
  });

  it('lets a theme colour the selected embed over the editable outline reset', () => {
    const source = components['./CoarMarkdownEditor.vue']!;
    expect(source).toContain(
      '.coar-md-area .milkdown .coar-markdown-embed-host.coar-markdown-embed-host--selected {\n'
      + '  --coar-i-embed-selection-outline: 2px solid var(--coar-markdown-editor-selection-outline-color);\n'
      + '  outline: var(--coar-i-embed-selection-outline, none);',
    );
    expect(source).toContain('.coar-md-area .milkdown [contenteditable] {\n  outline: none;');
  });

  it('supplies every --coar-markdown-editor-* role the components read, which keep a fallback', () => {
    expect(Object.keys(components)).toContain('./CoarMarkdownEditor.vue');
    const defined = new Set([...constants, ...(css.match(ROLE) ?? [])]);
    const read = new Set<string>();
    for (const [file, source] of Object.entries(components)) {
      for (const [, name, next] of source.matchAll(/var\(\s*(--coar-markdown-editor-[a-z0-9-]+)\s*([,)])/g)) {
        read.add(name!);
        // Only the private outline shorthand reads a role bare: it is invalid without it.
        if (next === ')') expect(name, file).toBe('--coar-markdown-editor-selection-outline-color');
      }
    }
    for (const [, name] of layered.matchAll(/var\(\s*(--coar-markdown-editor-[a-z0-9-]+)/g)) read.add(name!);
    expect(read.size).toBeGreaterThan(0);
    for (const name of read) expect(defined, name).toContain(name);
    // And nothing is supplied that no rule reads.
    for (const name of defined) expect(read, name).toContain(name);
  });

  it('keeps the historical fallbacks of the default presentation', () => {
    const all = Object.values(components).join('\n');
    for (const declaration of [
      'min-height: var(--coar-markdown-editor-toolbar-size, 2.25rem);',
      'padding: var(--coar-markdown-editor-area-padding, var(--coar-spacing-s) var(--coar-spacing-m));',
      'font-size: var(--coar-markdown-editor-source-font-size, var(--coar-font-size-s, 0.875rem));',
      'width: var(--coar-markdown-editor-float-button-size, 30px);',
      'font-size: var(--coar-markdown-editor-menu-font-size, 13px);',
      'font-weight: var(--coar-markdown-editor-table-picker-label-font-weight, 600);',
      'width: var(--coar-markdown-editor-color-picker-width, 224px);',
      'min-width: var(--coar-markdown-editor-dialog-min-width, 22rem);',
    ]) expect(all).toContain(declaration);
  });
});
