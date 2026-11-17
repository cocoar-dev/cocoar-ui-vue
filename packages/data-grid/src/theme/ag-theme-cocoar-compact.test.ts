import { describe, expect, it } from 'vitest';
import { cocoarTheme } from './cocoar-theme';

/**
 * The compact presentation (`.coar-compact`) of the grid is CSS only
 * (`ag-theme-cocoar-compact.css`). Geometry is checked in the playground visual
 * stories (`compact-data-grid-*`); here the contracts that keep it safe:
 *
 * - every `--ag-*` variable it sets is one AG Grid 35 actually reads,
 * - every rule is scoped to the compact profile,
 * - outside it, nothing the default grid reads changes: opt-in tokens read by the
 *   default sources always carry the original value as fallback.
 */

// Vitest blanks style blocks, so read the sources from disk. A non-literal specifier
// keeps @types/node out of the package typecheck (as in packages/ui).
async function read(path: string): Promise<string> {
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

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Opt-in tokens: defined only inside the compact profile, so every read needs a fallback. */
const OPT_IN = /var\(\s*(--coar-(?:ui-font-size|ui-line-height|ui-font-weight|label-font-weight|field-font-size|caption-font-size|interactive-row-height|panel-padding|content-gap|control-radius|panel-radius|data-grid-[a-z-]+))\s*([,)])/g;

function optInReadsWithoutFallback(source: string): string[] {
  return [...stripComments(source).matchAll(OPT_IN)].filter((m) => m[2] === ')').map((m) => m[1]);
}

describe('compact grid adapter', () => {
  it('gives grid and popup roots the same originating color scheme', async () => {
    const css = await read('ag-theme-cocoar-compact.css');
    expect(css).toContain('--ag-browser-color-scheme: var(--coar-compact-color-scheme, light)');
    expect(css).not.toMatch(/\.ag-root-wrapper\s*\{\s*color-scheme:\s*inherit/);
  });

  it('sets only variables AG Grid 35 reads', async () => {
    const css = stripComments(await read('ag-theme-cocoar-compact.css'));
    const agGrid = await read('../../node_modules/ag-grid-community/dist/package/main.esm.mjs');
    const set = [...new Set([...css.matchAll(/(--ag-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))];
    expect(set.length).toBeGreaterThan(10);
    const unread = set.filter((name) => !agGrid.includes(`var(${name}`) && !agGrid.includes(`"${name}"`));
    expect(unread).toEqual([]);
  });

  it('scopes every rule to the compact profile', async () => {
    const css = stripComments(await read('ag-theme-cocoar-compact.css'));
    // Top-level selectors: text before a `{` at nesting depth 0.
    const selectors: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < css.length; i += 1) {
      if (css[i] === '{') {
        if (depth === 0) selectors.push(css.slice(start, i).trim());
        depth += 1;
      } else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) start = i + 1;
      }
    }
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      for (const part of selector.split(/,(?![^(]*\))/)) {
        expect(part, selector).toContain('.coar-compact');
      }
    }
  });

  it('keeps the default grid sources independent of opt-in tokens', async () => {
    const sources = [
      'ag-theme-cocoar.css',
      '../CoarDataGrid.vue',
      '../CoarDataGridSearch.vue',
      '../header/CoarGridHeader.vue',
      '../cell-renderers/TreeCellRenderer.vue',
      '../cell-renderers/WrapperCellRenderer.vue',
      '../cell-renderers/TagCellRenderer.vue',
    ];
    for (const path of sources) {
      expect(optInReadsWithoutFallback(await read(path)), path).toEqual([]);
    }
  });

  it('falls back to the default values inside the adapter', async () => {
    const css = await read('ag-theme-cocoar-compact.css');
    expect(css).toContain('--ag-row-height: var(--coar-data-grid-row-height, var(--coar-interactive-row-height, 40px))');
    expect(css).toContain('--ag-header-height: var(--coar-data-grid-header-height, var(--coar-interactive-row-height, 40px))');
    expect(css).toContain('var(--coar-ui-font-size, var(--coar-font-size-xs, 14px))');
  });

  it('leaves the default theme params unchanged', () => {
    // `cocoarTheme` serves default and compact grids alike; the profile never edits it.
    const css = (cocoarTheme as unknown as { _getPerInstanceCss(c: string): string })._getPerInstanceCss('probe');
    expect(css).toContain('--ag-row-height: var(--ag-inherited-row-height, 40px)');
    expect(css).toContain('--ag-header-height: var(--ag-inherited-header-height, 40px)');
    expect(css).toContain('--ag-font-size: var(--ag-inherited-font-size, 14px)');
    expect(css).toContain('--ag-header-font-weight: var(--ag-inherited-header-font-weight, 600)');
  });
});
