import { describe, expect, it } from 'vitest';

/**
 * Presentation of the viewer under a role theme such as Compact (`compact.css` and the
 * values in `@cocoar/vue-ui`). Geometry is checked by the playground visual stories
 * (`compact-document-viewer-*`); here the contracts that keep the default look unchanged
 * and the teleported popover in context.
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

  it('keys nothing on the `.coar-compact` class', async () => {
    for (const path of [...SOURCES, 'compact.css']) {
      const source = await read(path);
      const css = path.endsWith('.vue') ? styleOf(source) : source.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(css, path).not.toContain('coar-compact');
    }
  });

  it('derives every role of compact.css behind the activation of the theme', async () => {
    const css = (await read('compact.css')).replace(/\/\*[\s\S]*?\*\//g, '');
    const block = /:where\(\.coar-pdf-viewer, \.coar-pdf-annotation-popover\) \{([^}]*)\}/.exec(css)?.[1] ?? '';
    const declarations = [...css.matchAll(/(--coar-[a-z-]+):\s*([^;]+);/g)];
    expect(declarations.every((m) => block.includes(m[0]))).toBe(true);

    const derived = declarations.filter((m) => m[1].startsWith('--coar-d-'));
    const roles = declarations.filter((m) => !m[1].startsWith('--coar-d-'));
    expect(derived.length).toBe(35);
    for (const m of derived) {
      const input = m[1].replace('--coar-d-', '--coar-theme-');
      expect(m[2], m[1]).toMatch(new RegExp(`^var\\(--coar-role-derivation\\) var\\(${input}, `));
    }
    expect(roles.map((m) => m[0])).toEqual(
      derived.map((m) => {
        const role = m[1].replace('--coar-d-', '--coar-');
        return `${role}: var(${m[1]}, inherit);`;
      }),
    );
  });

  it('keeps the constants of the profile in the value module', async () => {
    const values = await read('../../ui/src/theme/compact-packages/document-viewer.ts');
    const [desktop, mobile] = values.split('COMPACT_DOCUMENT_VIEWER_MOBILE_TOKENS');
    for (const value of [
      "'--coar-document-viewer-header-height': '40px'",
      "'--coar-document-viewer-target-size': '28px'",
      "'--coar-document-viewer-input-height': '28px'",
      "'--coar-document-viewer-outline-link-display': 'flex'",
    ]) expect(desktop).toContain(value);
    for (const value of [
      "'--coar-document-viewer-header-height': '48px'",
      "'--coar-document-viewer-target-size': '44px'",
      // Native fields stand on the shared touch floor.
      "'--coar-document-viewer-input-height': 'var(--coar-control-min-size, 44px)'",
      "'--coar-document-viewer-swatch-size': '32px'",
      "'--coar-document-viewer-pin-target-outset': '11px'",
    ]) expect(mobile).toContain(value);

    const css = await read('compact.css');
    for (const m of values.matchAll(/'(--coar-document-viewer-[a-z-]+)':/g)) {
      expect(css.replace(/\/\*[\s\S]*?\*\//g, ''), m[1]).not.toContain(`${m[1]}:`);
    }
  });

  it('declares nothing without the value where the default presentation is silent', async () => {
    const css = (await read('compact.css')).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(
      /@layer cocoar\.components \{[^}]*\.coar-pdf-viewer \.coar-pdf-searchbar__input \{\s*box-sizing: var\(--coar-control-box-sizing, revert-layer\);/,
    );
    const sidebar = styleOf(await read('internal/DocumentSidebar.vue'));
    expect(sidebar).toMatch(
      /@layer cocoar\.components \{[^}]*outline-link\) \{\s*min-height: var\(--coar-interactive-row-height, revert-layer\);/,
    );
    expect(sidebar).toContain('display: var(--coar-document-viewer-outline-link-display, block);');
    expect(styleOf(await read('internal/AnnotationLayer.vue'))).toContain(
      'inset: calc(-1 * var(--coar-document-viewer-pin-target-outset, 0px));',
    );
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
