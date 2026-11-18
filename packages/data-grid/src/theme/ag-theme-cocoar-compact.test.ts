import { describe, expect, it } from 'vitest';
import { cocoarTheme } from './cocoar-theme';

/**
 * The grid follows a role theme (Compact, with or without `.coar-compact`) through CSS
 * only: `ag-theme-cocoar-compact.css` derives AG Grid variables and grid roles from the
 * shared roles. Geometry is checked in the playground visual stories
 * (`compact-data-grid-*`); here the contracts that keep it safe:
 *
 * - every `--ag-*` variable it sets is one AG Grid 35 actually reads,
 * - no rule depends on the class `.coar-compact`,
 * - without a role theme nothing changes: every derived value is gated by
 *   `--coar-role-derivation`, every variable falls back to the value it had, and the
 *   default sources read every role with the historical value as fallback,
 * - the constants of Compact are in the value module of `@cocoar/vue-ui`.
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

/** Opt-in tokens: defined only by a role theme, so every read needs a fallback. */
const OPT_IN = /var\(\s*(--coar-(?:ui-font-size|ui-line-height|ui-font-weight|label-font-weight|field-font-size|caption-font-size|interactive-row-height|panel-padding|content-gap|control-radius|panel-radius|data-grid-[a-z-]+))\s*([,)])/g;

function optInReadsWithoutFallback(source: string): string[] {
  return [...stripComments(source).matchAll(OPT_IN)].filter((m) => m[2] === ')').map((m) => m[1]);
}

/** `name: value` of every custom property declared in a stylesheet. */
function declarations(css: string): Map<string, string> {
  return new Map(
    [...stripComments(css).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  );
}

const SOURCES = [
  'ag-theme-cocoar.css',
  '../CoarDataGrid.vue',
  '../CoarDataGridSearch.vue',
  '../header/CoarGridHeader.vue',
  '../cell-renderers/TreeCellRenderer.vue',
  '../cell-renderers/WrapperCellRenderer.vue',
  '../cell-renderers/TagCellRenderer.vue',
];

describe('grid role adapter', () => {
  it('gives grid and popup roots the same originating color scheme', async () => {
    const css = await read('ag-theme-cocoar-compact.css');
    expect(css).toContain(
      '--coar-d-ag-browser-color-scheme: var(--coar-role-derivation) var(--coar-compact-color-scheme, light)',
    );
    expect(css).not.toMatch(/\.ag-root-wrapper\s*\{\s*color-scheme:\s*inherit/);
  });

  it('sets only variables AG Grid 35 reads', async () => {
    const css = stripComments(await read('ag-theme-cocoar-compact.css'));
    const agGrid = await read('../../node_modules/ag-grid-community/dist/package/main.esm.mjs');
    const base = declarations(await read('ag-theme-cocoar.css'));
    const set = [
      ...new Set([
        ...[...css.matchAll(/(--ag-[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
        ...[...css.matchAll(/--coar-d-(ag-[a-z0-9-]+)\s*:/g)].map((m) => `--${m[1]}`),
      ]),
    ];
    expect(set.length).toBeGreaterThan(10);
    const unread = set.filter((name) => !agGrid.includes(`var(${name}`) && !agGrid.includes(`"${name}"`));
    expect(unread).toEqual([]);
    // Each derived AG value reaches its variable: here, or in the default stylesheet.
    const adapter = declarations(css);
    for (const name of set) {
      const reader = adapter.get(name) ?? base.get(name) ?? '';
      expect(reader, name).toContain(`var(--coar-d-${name.slice(2)},`);
    }
  });

  it('does not depend on the class, in any source of the package', async () => {
    for (const path of ['ag-theme-cocoar-compact.css', ...SOURCES]) {
      expect(stripComments(await read(path)), path).not.toContain('.coar-compact');
    }
  });

  it('is one block of custom properties on the wrapper, without specificity', async () => {
    const css = stripComments(await read('ag-theme-cocoar-compact.css')).trim();
    expect(css.startsWith(':where(.ag-theme-cocoar) {')).toBe(true);
    expect(css.match(/\{/g)).toHaveLength(1);
    const body = css.slice(css.indexOf('{') + 1, css.lastIndexOf('}'));
    for (const declaration of body.split(';').map((d) => d.trim()).filter(Boolean)) {
      expect(declaration).toMatch(/^--(ag|coar)-[a-z0-9-]+\s*:/);
    }
  });

  it('changes nothing without a role theme', async () => {
    const adapter = declarations(await read('ag-theme-cocoar-compact.css'));
    const derived = [...adapter.keys()].filter((name) => name.startsWith('--coar-d-'));
    expect(derived.length).toBeGreaterThan(20);
    for (const [name, value] of adapter) {
      if (name.startsWith('--coar-d-')) {
        // Invalid unless a theme activates derivation.
        expect(value.startsWith('var(--coar-role-derivation) '), name).toBe(true);
      } else {
        // As if not declared.
        const source = name.startsWith('--ag-') ? name.slice(2) : name.slice('--coar-'.length);
        expect(value, name).toBe(`var(--coar-d-${source}, inherit)`);
      }
    }
  });

  it('keeps the static values of the default theme as fallbacks', async () => {
    const base = await read('ag-theme-cocoar.css');
    for (const declaration of [
      '--ag-font-size: var(--coar-d-ag-font-size, var(--coar-font-size-xs, 14px));',
      '--ag-cell-horizontal-padding: var(--coar-d-ag-cell-horizontal-padding, var(--coar-spacing-m, 16px));',
      '--ag-row-height: var(--coar-d-ag-row-height, 40px);',
      '--ag-header-height: var(--coar-d-ag-header-height, 40px);',
      '--ag-list-item-height: var(--coar-d-ag-list-item-height, 36px);',
      '--ag-border-radius: var(--coar-d-ag-border-radius, var(--coar-radius-m, 8px));',
      '--ag-wrapper-border-radius: var(--coar-d-ag-wrapper-border-radius, var(--coar-radius-m, 8px));',
    ]) {
      expect(base).toContain(declaration);
    }
    // The dark block declares none of the derived variables, so nothing there needs the wrap.
    const dark = base.slice(base.indexOf('.dark-mode .ag-theme-cocoar'), base.indexOf('ADDITIONAL STYLING REFINEMENTS'));
    const adapter = stripComments(await read('ag-theme-cocoar-compact.css'));
    for (const m of adapter.matchAll(/--coar-d-(ag-[a-z0-9-]+)\s*:/g)) {
      expect(dark, m[1]).not.toContain(`--${m[1]}:`);
    }
  });

  it('reads every grid role with the historical value as fallback', async () => {
    const base = await read('ag-theme-cocoar.css');
    for (const declaration of [
      'font-weight: var(--coar-data-grid-header-font-weight, var(--coar-label-font-weight, 600));',
      'padding-left: var(--coar-data-grid-cell-padding-x, var(--coar-spacing-m, 16px));',
      'padding-right: var(--coar-data-grid-cell-padding-x, var(--coar-spacing-m, 16px));',
      'background-color: var(--coar-data-grid-drop-target-bg, var(--coar-surface-accent-subtle, rgba(0, 102, 204, 0.1))) !important;',
      'outline: 2px solid var(--coar-data-grid-drop-target-outline-color, var(--coar-border-accent, #0066cc));',
      'outline: 2px dashed var(--coar-data-grid-drop-target-outline-color, var(--coar-border-accent, #0066cc));',
      'background-color: var(--coar-data-grid-drop-target-invalid-bg, var(--coar-surface-semantic-error-subtle, rgba(204, 0, 0, 0.06))) !important;',
      'border-radius: var(--coar-control-radius, var(--coar-radius-s, 6px));',
      'border-radius: var(--coar-panel-radius, var(--coar-radius-s, 6px));',
      'border-radius: var(--coar-panel-radius, var(--coar-radius-s));',
      'text-decoration-color: var(--coar-data-grid-search-highlight-color, var(--coar-border-accent, #0066cc));',
    ]) {
      expect(base).toContain(declaration);
    }
    const hover =
      'background-color: var(--coar-data-grid-cell-action-hover-bg, var(--coar-surface-neutral-hover, rgba(0, 0, 0, 0.06)));';
    expect(await read('../cell-renderers/TreeCellRenderer.vue')).toContain(hover);
    expect(await read('../cell-renderers/WrapperCellRenderer.vue')).toContain(hover);
    for (const path of SOURCES) {
      expect(optInReadsWithoutFallback(await read(path)), path).toEqual([]);
    }
  });

  it('derives every grid role the sources read, or leaves it to the theme values', async () => {
    const adapter = declarations(await read('ag-theme-cocoar-compact.css'));
    // Constants: set by a theme (Compact: compact-packages/data-grid.ts) or a consumer.
    const inputs = [
      '--coar-data-grid-font-size', '--coar-data-grid-row-height', '--coar-data-grid-header-height',
      '--coar-data-grid-list-item-height', '--coar-data-grid-cell-padding-x',
      '--coar-data-grid-header-font-weight', '--coar-data-grid-control-radius', '--coar-data-grid-radius',
      '--coar-data-grid-tree-indent', '--coar-data-grid-tree-toggle-size',
    ];
    const roles = new Set<string>();
    for (const path of ['ag-theme-cocoar-compact.css', ...SOURCES]) {
      for (const m of stripComments(await read(path)).matchAll(/var\(\s*(--coar-data-grid-[a-z-]+)/g)) roles.add(m[1]);
    }
    for (const role of roles) {
      expect(inputs.includes(role) !== adapter.has(role), role).toBe(true);
    }
  });

  it('has the constants of Compact in the value module', async () => {
    const values = await read('../../../ui/src/theme/compact-packages/data-grid.ts');
    expect(values).toMatch(/COMPACT_DATA_GRID_TOKENS[^;]*'--coar-data-grid-cell-padding-x': '12px'/);
    expect(values).toMatch(/COMPACT_DATA_GRID_MOBILE_TOKENS[^;]*'--coar-data-grid-tree-toggle-size': '44px'/);
  });

  it('leaves the default theme params unchanged', () => {
    // `cocoarTheme` serves every presentation; a role theme never edits it.
    const css = (cocoarTheme as unknown as { _getPerInstanceCss(c: string): string })._getPerInstanceCss('probe');
    expect(css).toContain('--ag-row-height: var(--ag-inherited-row-height, 40px)');
    expect(css).toContain('--ag-header-height: var(--ag-inherited-header-height, 40px)');
    expect(css).toContain('--ag-font-size: var(--ag-inherited-font-size, 14px)');
    expect(css).toContain('--ag-header-font-weight: var(--ag-inherited-header-font-weight, 600)');
  });
});
