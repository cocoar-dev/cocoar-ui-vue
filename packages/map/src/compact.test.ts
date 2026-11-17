import { describe, expect, it } from 'vitest';

/**
 * Compact presentation of the map (`.coar-compact`, `internal/map-compact.css`).
 * Geometry is checked by the playground visual stories (`compact-map-*`); here the
 * contracts that keep the default look and the marker anchors unchanged.
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
      /var\(\s*(--coar-(?:ui-font-size|ui-line-height|ui-font-weight|label-font-weight|caption-font-size|interactive-row-height|content-gap|control-radius|panel-radius|map-(?:text|text-muted|error-color|selection-color|selection-ring|popup-shadow|target-size)))\s*([,)])/g;
    for (const path of [
      'internal/map-base.css',
      'CoarMap.vue',
      'CoarMapEditor.vue',
      'CoarMapPointList.vue',
      'internal/MapPointForm.vue',
    ]) {
      const missing = [...styleOf(await read(path)).matchAll(optIn)].filter((m) => m[2] === ')').map((m) => m[1]);
      expect(missing, path).toEqual([]);
    }
  });

  it('scopes every compact rule to the profile and Leaflet rules to the map canvas', async () => {
    const css = stripComments(await read('internal/map-compact.css'));
    const selectors = [...css.matchAll(/(^|})\s*([^{}]+)\{/g)].map((m) => m[2].trim());
    expect(selectors.length).toBeGreaterThan(10);
    for (const selector of selectors) {
      expect(selector).toContain('.coar-compact');
      if (selector.includes('.leaflet-')) expect(selector).toContain('.coar-map__canvas');
    }
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
