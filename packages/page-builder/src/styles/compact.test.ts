/**
 * Contract of the page builder under a role theme (the Compact values).
 *
 * The roles are plain custom properties; vitest does not load component CSS,
 * so these checks read the sources: every consumer keeps its legacy value as
 * the fallback, every derived role is gated by the theme's activation token,
 * every constant is a value of the theme, no rule depends on a class of the
 * theme (without a role theme nothing changes, desktop and `.coar-mobile`
 * alike), and authored page content never consumes a chrome role.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COMPACT_PAGE_BUILDER_MOBILE_TOKENS,
  COMPACT_PAGE_BUILDER_TOKENS,
} from '../../../ui/src/theme/compact-packages/page-builder';

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

const CSS_WITHOUT_COMMENTS = COMPACT_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const CONSTANTS = { ...COMPACT_PAGE_BUILDER_TOKENS, ...COMPACT_PAGE_BUILDER_MOBILE_TOKENS };

/** `name: value` of every custom property the stylesheet declares. */
function declarations(): Map<string, string> {
  const found = new Map<string, string>();
  for (const m of CSS_WITHOUT_COMMENTS.matchAll(/(--coar-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    expect(found.has(m[1]), `${m[1]} is declared once`).toBe(false);
    found.set(m[1], m[2].trim());
  }
  return found;
}

describe('role theme of the page builder', () => {
  it('every component use keeps a legacy fallback', () => {
    const missing: string[] = [];
    for (const file of vueFiles) {
      for (const use of roleUses(readFileSync(file, 'utf8'))) {
        if (!use.fallback) missing.push(`${rel(file)}: ${use.role}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every derived role has a private value gated by the activation token', () => {
    const declared = declarations();
    const roles = [...declared.keys()].filter((name) => name.startsWith('--coar-page-builder-'));
    expect(roles.length).toBeGreaterThan(30);
    for (const role of roles) {
      const derived = role.replace('--coar-', '--coar-d-');
      // Without a role theme the private value is invalid and the role inherits,
      // which is the same as not declaring it.
      expect(declared.get(role), role).toBe(`var(${derived}, inherit)`);
      expect(declared.get(derived), derived).toMatch(/^var\(--coar-role-derivation\) \S/);
    }
    const others = [...declared.keys()].filter((name) => !name.startsWith('--coar-page-builder-'));
    expect(others.sort()).toEqual(roles.map((role) => role.replace('--coar-', '--coar-d-')).sort());
  });

  it('every constant is a value of the theme, not a formula', () => {
    const derived = declarations();
    for (const [role, value] of Object.entries(CONSTANTS)) {
      expect(role).toMatch(/^--coar-page-builder-/);
      expect(value, role).not.toContain('var(');
      expect(derived.has(role), `${role} is either a constant or derived`).toBe(false);
    }
  });

  it('every consumed role is derived or a constant, and each of those is consumed', () => {
    const defined = new Set([
      ...[...declarations().keys()].filter((name) => name.startsWith('--coar-page-builder-')),
      ...Object.keys(CONSTANTS),
    ]);
    const consumed = new Set<string>();
    for (const file of vueFiles) {
      for (const use of roleUses(readFileSync(file, 'utf8'))) consumed.add(use.role);
    }
    // Roles the stylesheet itself consumes (derivations, the layered rules).
    for (const use of roleUses(CSS_WITHOUT_COMMENTS)) consumed.add(use.role);

    expect([...consumed].filter((r) => !defined.has(r)).sort()).toEqual([]);
    expect([...defined].filter((r) => !consumed.has(r)).sort()).toEqual([]);
  });

  it('depends on values, never on a class of the theme', () => {
    expect(CSS_WITHOUT_COMMENTS).not.toContain('coar-compact');
    for (const file of walk(SRC).filter((f) => /\.(vue|ts)$/.test(f) && !f.endsWith('.test.ts'))) {
      expect(readFileSync(file, 'utf8').includes('.coar-compact'), rel(file)).toBe(false);
    }
    // The activation token only gates derivations of tokens from tokens.
    for (const m of CSS_WITHOUT_COMMENTS.matchAll(/([a-z-]+)\s*:[^;]*var\(--coar-role-derivation\)/g)) {
      expect(m[1], m[0]).toMatch(/^--coar-d-page-builder-/);
    }
    for (const file of vueFiles) {
      expect(readFileSync(file, 'utf8').includes('--coar-role-derivation'), rel(file)).toBe(false);
    }
  });

  it('declares nothing without a role theme', () => {
    // Role derivations have no specificity; every other rule sits in the
    // library's cascade layer and reverts to the layers below without its role.
    const layer = CSS_WITHOUT_COMMENTS.indexOf('@layer cocoar.components {');
    expect(layer).toBeGreaterThan(0);
    const unlayered = CSS_WITHOUT_COMMENTS.slice(0, layer);
    const unlayeredSelectors = [...unlayered.matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim());
    expect(unlayeredSelectors).toHaveLength(1);
    expect(unlayeredSelectors[0].startsWith(':where(')).toBe(true);

    const layered = CSS_WITHOUT_COMMENTS.slice(layer + '@layer cocoar.components {'.length);
    const properties = [...layered.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)];
    expect(properties.length).toBeGreaterThan(5);
    for (const [, property, value] of properties) {
      expect(value.trim(), property).toMatch(/^var\(--coar-page-builder-[a-z0-9-]+, revert-layer\)$/);
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
      /:is\(\.pb-canvas__content, \.pb-builder__preview-frame\) \{\s*font-size: var\(--coar-page-builder-authored-font-size, revert-layer\);\s*font-weight: var\(--coar-page-builder-authored-font-weight, revert-layer\);\s*\}/,
    );
    expect(COMPACT_PAGE_BUILDER_TOKENS['--coar-page-builder-authored-font-size']).toBe('13px');
    expect(COMPACT_PAGE_BUILDER_TOKENS['--coar-page-builder-authored-font-weight']).toBe('400');
  });

  it('keeps the outline action tray in the row only where the theme says so', () => {
    const source = readFileSync(join(SRC, 'builder/BuilderOutlineNode.vue'), 'utf8');
    expect(source).toContain('position: var(--coar-page-builder-tree-actions-position, absolute);');
    expect(source).toContain('transform: var(--coar-page-builder-tree-actions-transform, translateY(-50%));');
    expect(source).toContain('margin-right: var(--coar-page-builder-tree-issue-reserve, 30px);');
    // The row height is not a layout mode: a wrapping row keeps the height of its role.
    expect(source).toContain('height: var(--coar-page-builder-row-height, 30px);');
    // The focus rule must not hide the tray of a hovered row in the default presentation.
    expect(source.indexOf('.pb-tree-row:focus-within .pb-tree-actions'))
      .toBeLessThan(source.indexOf('.pb-tree-row:hover .pb-tree-actions'));
  });

  it('uses theme-aware selection ink only under a role theme, preserving the legacy accent', () => {
    expect(COMPACT_CSS).toContain(
      '--coar-d-page-builder-canvas-selection-color: var(--coar-role-derivation) var(--coar-text-accent-primary, #315f91);',
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
