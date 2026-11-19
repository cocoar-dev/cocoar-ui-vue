import { describe, expect, it } from 'vitest';

/**
 * Roles of the map a theme can set (`internal/map-compact.css`; the Compact presentation
 * sets them). Browser parity is checked by the playground integration tests; here
 * the contracts that keep the default look and the marker anchors unchanged.
 */

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

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const styleOf = (source: string) =>
  stripComments(source.includes('<style') ? source.slice(source.indexOf('<style')) : source);

describe('compact map: default look unchanged', () => {
  it('reads opt-in tokens and compact-only map roles only with a fallback', async () => {
    const optIn =
      /var\(\s*(--coar-(?:ui-font-size|ui-line-height|ui-font-weight|label-font-weight|caption-font-size|interactive-row-height|content-gap|control-radius|panel-radius|map-[a-z-]+))\s*([,)])/g;
    for (const path of [
      'internal/map-base.css',
      'internal/map-compact.css',
      'CoarMap.vue',
      'CoarMapEditor.vue',
      'CoarMapPointList.vue',
      'internal/MapPointForm.vue',
    ]) {
      const missing = [...styleOf(await read(path)).matchAll(optIn)].filter((m) => m[2] === ')').map((m) => m[1]);
      expect(missing, path).toEqual([]);
    }
  });

  it('depends on no class: without a role theme every role keeps what it inherits', async () => {
    for (const path of [
      'internal/map-base.css',
      'internal/map-compact.css',
      'CoarMap.vue',
      'CoarMapEditor.vue',
      'CoarMapPointList.vue',
      'internal/MapPointForm.vue',
    ]) {
      expect(styleOf(await read(path)), path).not.toContain('coar-compact');
    }
    const css = stripComments(await read('internal/map-compact.css'));
    expect(css).not.toContain('@layer');
    const block = /:where\(\.coar-map, \.coar-map-point-list, \.coar-map-form\)\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    const declared = [...block.matchAll(/(--coar-[a-z-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]);
    const derived = declared.filter(([name]) => name.startsWith('--coar-d-map-'));
    const roles = declared.filter(([name]) => !name.startsWith('--coar-d-'));
    expect(derived.length).toBe(39);
    expect(roles.length).toBe(derived.length);
    // Private values are invalid unless the theme activates derivation …
    for (const [name, value] of derived) {
      const input = name.replace('--coar-d-', '--coar-theme-');
      expect(value, name).toMatch(new RegExp(`^var\\(--coar-role-derivation\\)\\s+var\\(${input}[,)]`));
    }
    // … and each role then falls back to what the map inherits.
    for (const [name, value] of roles) {
      expect(value, name).toBe(`var(${name.replace('--coar-', '--coar-d-')}, inherit)`);
    }
    // Custom properties are declared nowhere else, and the activation token gates only them.
    const rest = css.replace(block, '');
    expect(rest).not.toMatch(/--coar-[a-z-]+\s*:/);
    expect(rest).not.toContain('--coar-role-derivation');
  });

  it('supplies every map input in Enterprise, without changing Compact values', async () => {
    const css = stripComments(await read('internal/map-compact.css'));
    const inputs = [...css.matchAll(/--coar-d-map-([a-z-]+):/g)]
      .map((m) => `--coar-theme-map-${m[1]}`).sort();
    const enterprise = await read('../../ui/src/theme/enterprise-packages/map.ts');
    expect([...enterprise.matchAll(/'(--coar-theme-map-[a-z-]+)':/g)].map((m) => m[1]).sort()).toEqual(inputs);
    expect(await read('../../ui/src/theme/compact-packages/map.ts')).not.toContain('--coar-theme-map-');
  });

  it('keeps constants in the value module of the theme', async () => {
    // Read as text: the module belongs to @cocoar/vue-ui, outside this package's sources.
    const values = await read('../../ui/src/theme/compact-packages/map.ts');
    expect(values).toMatch(/COMPACT_MAP_TOKENS: Record<string, string> = \{\};/);
    expect(values).toMatch(/COMPACT_MAP_MOBILE_TOKENS: Record<string, string> = \{\s*'--coar-map-target-size': '44px',\s*\};/);
    expect(styleOf(await read('CoarMapPointList.vue'))).toContain('min-width: var(--coar-map-target-size, auto);');
  });

  it('restyles Leaflet only on a map that found a role theme, anchored at its canvas', async () => {
    const css = stripComments(await read('internal/map-compact.css'));
    const rules = [...css.matchAll(/(^|})\s*([^{}]+)\{([^}]*)/g)]
      .map((m) => ({ selectors: m[2].trim().split(/\s*,\s*/), body: m[3] }))
      .filter((rule) => rule.selectors.some((selector) => selector.includes('.leaflet-')));
    expect(rules.length).toBeGreaterThan(10);
    for (const { selectors, body } of rules) {
      for (const selector of selectors) expect(selector).toMatch(/^\.coar-map--role-theme \.coar-map__canvas[. ]/);
      // Every declaration is one role with the value Leaflet declares as fallback.
      for (const declaration of body.split(';').map((d) => d.trim()).filter(Boolean)) {
        expect(declaration, selectors[0]).toMatch(/^[a-z-]+: var\(--coar-[a-z-]+, .+\)$/);
      }
    }
    // Leaflet's values per state (leaflet/dist/leaflet.css 1.9): plain and `.leaflet-touch`.
    const fallbacks = (selector: string) =>
      rules.find((rule) => rule.selectors[0] === selector)?.body.replace(/\s+/g, ' ').trim();
    expect(fallbacks('.coar-map--role-theme .coar-map__canvas.leaflet-container')).toBe(
      "font-family: var(--coar-map-chrome-font-family, 'Helvetica Neue', Arial, Helvetica, sans-serif); " +
        'font-size: var(--coar-map-chrome-font-size, var(--coar-ui-font-size, 0.75rem)); ' +
        'line-height: var(--coar-map-chrome-line-height, var(--coar-ui-line-height, 1.5));',
    );
    expect(fallbacks('.coar-map--role-theme .coar-map__canvas.leaflet-touch .leaflet-bar')).toBe(
      'border-color: var(--coar-map-touch-border, var(--coar-map-chrome-border, rgba(0, 0, 0, 0.2))); ' +
        'box-shadow: var(--coar-map-touch-shadow, var(--coar-map-chrome-shadow, none));',
    );
    expect(fallbacks('.coar-map--role-theme .coar-map__canvas.leaflet-touch .leaflet-bar a')).toBe(
      'width: var(--coar-map-target-size, 30px); height: var(--coar-map-target-size, 30px); ' +
        'line-height: var(--coar-map-target-size, 30px);',
    );
    expect(fallbacks('.coar-map--role-theme .coar-map__canvas .leaflet-popup-content')).toBe(
      'font-size: var(--coar-map-popup-font-size, var(--coar-ui-font-size, 1.08333em)); ' +
        'line-height: var(--coar-map-popup-line-height, var(--coar-ui-line-height, 1.3));',
    );
  });

  it('marks the root from the values in effect, in the viewer and the editor', async () => {
    for (const file of ['CoarMap.vue', 'CoarMapEditor.vue']) {
      const source = await read(file);
      expect(source, file).toContain("'coar-map--role-theme': roleTheme");
      expect(source, file).toContain('const roleTheme = useRoleTheme(rootEl);');
    }
    const helper = await read('internal/role-theme.ts');
    expect(helper).toContain("'--coar-d-role-derivation'");
    expect(helper).not.toMatch(/classList|closest\(/);
  });

  it('keeps the Leaflet marker boxes and anchors of pins and vertices', async () => {
    const map = await read('CoarMap.vue');
    const editor = await read('internal/use-map-editor.ts');
    for (const source of [map, editor]) {
      expect(source).toContain('iconSize: [26, 26],\n');
      expect(source).toContain('iconAnchor: [13, 13],\n');
    }
    expect(editor).toContain('iconSize: [14, 14],\n');
    expect(editor).toContain('iconAnchor: [7, 7],\n');
    // Invisible halos must not intercept neighbouring markers' centres.
    const css = stripComments(await read('internal/map-compact.css'));
    expect(css).not.toMatch(/(?:coar-map-pin-wrap|coar-map-edit-vertex-wrap)[^{]*::before/);
  });
});
