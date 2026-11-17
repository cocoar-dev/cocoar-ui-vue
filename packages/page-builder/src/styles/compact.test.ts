/**
 * Contract of the opt-in compact presentation of the page builder.
 *
 * The roles are plain custom properties; vitest does not load component CSS,
 * so these checks read the sources: every consumer keeps its legacy value as
 * the fallback (the default and `.coar-mobile` presentations are unchanged
 * outside `.coar-compact`), every role is defined only inside the profile, and
 * authored page content never consumes a chrome role.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');
const COMPACT_CSS = readFileSync(join(__dirname, 'compact.css'), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const vueFiles = walk(SRC).filter((f) => f.endsWith('.vue'));
const rel = (f: string) => relative(SRC, f).split('\\').join('/');

/** Top-level `var(--coar-page-builder-…` uses with what follows the name. */
function roleUses(source: string): { role: string; fallback: string | null }[] {
  const uses: { role: string; fallback: string | null }[] = [];
  const re = /var\(\s*(--coar-page-builder-[a-z0-9-]+)\s*(,|\))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (m[2] === ')') {
      uses.push({ role: m[1], fallback: null });
      continue;
    }
    // Read the fallback up to the matching parenthesis.
    let depth = 1;
    let i = re.lastIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === '(') depth++;
      else if (source[i] === ')') depth--;
      i++;
    }
    uses.push({ role: m[1], fallback: source.slice(re.lastIndex, i - 1).trim() });
  }
  return uses;
}

function definedRoles(): Set<string> {
  const defined = new Set<string>();
  for (const m of COMPACT_CSS.matchAll(/(--coar-page-builder-[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
  return defined;
}

describe('compact presentation roles', () => {
  it('every component use keeps a legacy fallback', () => {
    const missing: string[] = [];
    for (const file of vueFiles) {
      for (const use of roleUses(readFileSync(file, 'utf8'))) {
        if (!use.fallback) missing.push(`${rel(file)}: ${use.role}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every consumed role is defined by the profile, and every defined role is consumed', () => {
    const defined = definedRoles();
    const consumed = new Set<string>();
    for (const file of vueFiles) {
      for (const use of roleUses(readFileSync(file, 'utf8'))) consumed.add(use.role);
    }
    // Roles the profile file itself consumes (derivations, the line-height rule).
    for (const use of roleUses(COMPACT_CSS)) consumed.add(use.role);

    expect([...consumed].filter((r) => !defined.has(r)).sort()).toEqual([]);
    expect([...defined].filter((r) => !consumed.has(r)).sort()).toEqual([]);
  });

  it('defines nothing outside a .coar-compact scope', () => {
    const withoutComments = COMPACT_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    const preludes = [...withoutComments.matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim());
    expect(preludes.length).toBeGreaterThan(0);
    for (const prelude of preludes) {
      // Split the selector list at top-level commas only.
      const selectors: string[] = [];
      let depth = 0;
      let start = 0;
      for (let i = 0; i < prelude.length; i++) {
        if (prelude[i] === '(') depth++;
        else if (prelude[i] === ')') depth--;
        else if (prelude[i] === ',' && depth === 0) {
          selectors.push(prelude.slice(start, i).trim());
          start = i + 1;
        }
      }
      selectors.push(prelude.slice(start).trim());
      for (const selector of selectors) {
        expect(selector.startsWith(':is(.coar-compact, .coar-compact *)'), selector).toBe(true);
      }
    }
  });

  it('authored content never consumes a chrome role', () => {
    const contentFiles = vueFiles.filter((f) =>
      /(^|\/)(CoarPageRenderer|PageNode)\.vue$/.test(rel(f)) || /Renderer\.vue$/.test(rel(f)),
    );
    expect(contentFiles.length).toBeGreaterThan(20);
    const offenders = contentFiles.filter((f) => readFileSync(f, 'utf8').includes('--coar-page-builder-'));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('keeps the authored canvas and preview text out of the chrome typography', () => {
    expect(COMPACT_CSS).toMatch(
      /:is\(\.pb-canvas__content, \.pb-builder__preview-frame\) \{\s*font-size: 13px;\s*font-weight: 400;\s*\}/,
    );
  });

  it('uses theme-aware selection ink only in compact, preserving the legacy accent', () => {
    expect(COMPACT_CSS).toContain(
      '--coar-page-builder-canvas-selection-color: var(--coar-text-accent-primary, #315f91);',
    );
    const source = readFileSync(join(SRC, 'builder/BuilderCanvasNode.vue'), 'utf8');
    expect(source).toContain(
      '--canvas-border-selected: var(--coar-page-builder-canvas-selection-color, var(--canvas-accent));',
    );
    expect(source).toContain(
      '--canvas-accent: oklch(from var(--coar-background-accent-primary, #315f91) 0.44 0.07 h);',
    );
    expect(source).toContain(
      '--canvas-border-hover: var(--coar-page-builder-canvas-border-hover, rgba(80, 86, 96, 0.34));',
    );
    expect(source).toContain(
      '.canvas-node:hover:not(:has(.canvas-node:hover)) { border-color: var(--canvas-border-hover); }',
    );
    expect(source).toContain(
      '--canvas-border-hover: var(--coar-page-builder-canvas-selection-color, var(--coar-page-builder-canvas-border-hover, rgba(80, 86, 96, 0.34)));',
    );
  });

  it('is part of the package stylesheet', () => {
    expect(readFileSync(join(SRC, 'index.ts'), 'utf8')).toContain("import './styles/compact.css';");
  });
});
