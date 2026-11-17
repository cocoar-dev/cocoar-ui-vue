import { describe, expect, it } from 'vitest';

/**
 * Compact presentation of the viewer (`.coar-compact`, `compact.css`). Geometry is
 * checked by the playground visual stories (`compact-document-viewer-*`); here the
 * contracts that keep the default look unchanged and the teleported popover in context.
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

const SOURCES = [
  'CoarDocumentViewer.vue',
  'internal/AnnotationLayer.vue',
  'internal/AnnotationPopover.vue',
  'internal/DocumentAnnotationPanel.vue',
  'internal/DocumentInfoSection.vue',
  'internal/DocumentSearchBar.vue',
  'internal/DocumentSidebar.vue',
  'internal/DocumentToolbar.vue',
];

function styleOf(source: string): string {
  return source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('compact profile: default look unchanged', () => {
  it('reads opt-in tokens and viewer roles only with a fallback', async () => {
    const optIn = /var\(\s*(--coar-(?:ui-font-size|label-font-weight|field-font-size|caption-font-size|interactive-row-height|control-radius|panel-radius|document-viewer-[a-z-]+))\s*([,)])/g;
    for (const path of SOURCES) {
      const missing = [...styleOf(await read(path)).matchAll(optIn)].filter((m) => m[2] === ')').map((m) => m[1]);
      expect(missing, path).toEqual([]);
    }
  });

  it('keeps consumer --coar-color-* overrides first and the original value last', async () => {
    for (const path of SOURCES) {
      const css = styleOf(await read(path));
      for (const m of css.matchAll(/var\(--coar-color-[a-z0-9-]+, ([^\n;]*)/g)) {
        expect(m[1], `${path}: ${m[0]}`).toMatch(/^var\(--coar-document-viewer-[a-z-]+, /);
      }
    }
  });

  it('scopes every compact rule to the profile', async () => {
    const css = (await read('compact.css')).replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...css.matchAll(/(^|})\s*([^{}]+)\{/g)].map((m) => m[2].trim());
    expect(selectors.length).toBe(4);
    for (const selector of selectors) {
      const parts = selector.replace(/^:(?:is|where)\(([\s\S]*)\)$/, '$1').split(',');
      for (const part of parts) expect(part.trim(), selector).toContain('.coar-compact');
    }
  });

  it('keeps compact native fields on the shared touch floor with a consistent outer box', async () => {
    const css = await read('compact.css');
    expect(css).toContain('--coar-document-viewer-input-height: var(--coar-control-min-size, 44px);');
    expect(css).toMatch(/\.coar-pdf-viewer\.coar-compact \.coar-pdf-searchbar__input\s*\{\s*box-sizing: border-box;/);
  });
});

describe('annotation popover presentation context', () => {
  it('uses the shared live context, including role overrides', async () => {
    const source = await read('internal/AnnotationPopover.vue');
    expect(source).toContain('useCompactPresentationContext(() => props.contextEl)');
    expect(source).toContain(':class="presentation.classes"');
    expect(source).toContain('...presentation.style');
  });
});
