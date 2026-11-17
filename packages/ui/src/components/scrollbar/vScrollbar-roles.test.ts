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

// The handle roles must resolve to overlayscrollbars' own theme variables when unset,
// so a scrollbar outside the compact profile looks exactly as the theme draws it.
describe('vScrollbar handle roles', () => {
  it('never adds a competing handle rule outside the compact opt-in', () => {
    const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...source.matchAll(/([^{}]+)\{/g)].flatMap((match) => match[1]!.split(','));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toContain('.coar-compact');
  });

  it.each([
    ['', '--coar-scrollbar-handle-bg', '--os-handle-bg'],
    [':hover', '--coar-scrollbar-handle-bg-hover', '--os-handle-bg-hover'],
    [':active', '--coar-scrollbar-handle-bg-active', '--os-handle-bg-active'],
  ])('handle%s falls back to the theme variable', (state, role, themeVar) => {
    const rule = new RegExp(
      `\\.os-theme-dark \\.os-scrollbar-handle${state.replace(':', '\\:')}\\s*\\{\\s*background: var\\(${role}, var\\(${themeVar}\\)\\);\\s*\\}`,
    );
    expect(css).toMatch(rule);
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
