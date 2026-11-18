import { beforeAll, describe, expect, it } from 'vitest';
import directiveSource from './vScrollbar.ts?raw';

let css = '';

beforeAll(async () => {
  // Vitest blanks `.css?raw` imports (CSS is not processed), so read the file from disk.
  // A non-literal specifier keeps @types/node out of the package typecheck.
  const fsModule = 'node:fs';
  const fs = (await import(/* @vite-ignore */ fsModule)) as {
    readFileSync(path: string, encoding: 'utf8'): string;
  };
  // A plain path from the file: URL — happy-dom replaces the global URL class.
  const dir = decodeURIComponent(import.meta.url)
    .replace(/^file:\/\//, '')
    .replace(/^\/([A-Za-z]:)/, '$1')
    .replace(/\/[^/]*$/, '');
  css = fs.readFileSync(`${dir}/vScrollbar-roles.css`, 'utf8');
});

// The handle roles reach overlayscrollbars as its own theme variables. Unset, each
// variable keeps its inherited value, so a scrollbar outside a role theme looks exactly
// as the theme draws it and no rule of ours competes with a consumer's.
describe('vScrollbar handle roles', () => {
  it('adds a competing handle style only for the `.coar-compact` entry', () => {
    const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    expect(rules.length).toBeGreaterThan(1);
    for (const [, selectors, body] of rules) {
      const names = [...body!.matchAll(/^\s*([\w-]+)\s*:/gm)].map((match) => match[1]!);
      if (names.every((name) => name.startsWith('--os-handle-bg'))) continue;
      for (const selector of selectors!.split(',')) expect(selector).toContain('.coar-compact');
    }
  });

  it.each([
    ['--os-handle-bg', '--coar-scrollbar-handle-bg'],
    ['--os-handle-bg-hover', '--coar-scrollbar-handle-bg-hover'],
    ['--os-handle-bg-active', '--coar-scrollbar-handle-bg-active'],
  ])('%s takes the role and otherwise inherits the theme variable', (themeVar, role) => {
    expect(css).toContain(`${themeVar}: var(${role}, inherit);`);
    expect(css).toMatch(/\.os-theme-dark \.os-scrollbar-handle\s*\{/);
  });

  it('leaves an explicit light theme to overlayscrollbars', () => {
    expect(css).not.toMatch(/\.os-theme-light\s/);
  });

  it('is loaded after the overlayscrollbars stylesheet', () => {
    const osImport = directiveSource.indexOf("import 'overlayscrollbars/overlayscrollbars.css'");
    const rolesImport = directiveSource.indexOf("import './vScrollbar-roles.css'");
    expect(osImport).toBeGreaterThanOrEqual(0);
    expect(rolesImport).toBeGreaterThan(osImport);
  });
});
