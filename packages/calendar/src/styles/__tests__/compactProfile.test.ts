/// <reference types="vite/client" />
/**
 * Compact presentation profile (`.coar-compact`, Preview) — token wiring.
 *
 * The profile must change nothing outside `.coar-compact`. The package
 * guarantees that by construction: every new `--coar-calendar-*` role is
 * declared only in `styles/compact.css` under `.coar-compact`, and every
 * usage wraps the historical value as its fallback —
 * `var(--coar-calendar-event-radius, 3px)` renders `3px` wherever the role
 * is undefined. These tests pin that contract at the source level:
 *
 *   - compact.css declares nothing outside `.coar-compact`;
 *   - each role is consumed only with a fallback, and the fallbacks are
 *     exactly the values the components used before the profile existed
 *     (the table below; changing one changes the default look);
 *   - every role a component reads is declared (no dead / misspelt role);
 *   - every dark-mode value of `tokens-dark.css` is re-declared in the
 *     profile, so package dark values never leak into it;
 *   - consumer-owned colours (`meta.color` → `--event-*`, band colours)
 *     are never touched.
 *
 * Computed values in a real cascade (nested `.dark-mode` / `.coar-mobile`
 * scopes, the outermost-root selector) are a browser concern — happy-dom
 * cannot evaluate the selector; see the compact visual stories.
 */

import { describe, expect, it } from 'vitest';

const componentSources = import.meta.glob<string>(
  ['../../components/**/*.{vue,ts}', '../../composables/*.ts'],
  { query: '?raw', import: 'default', eager: true },
);
// Vitest blanks `.css?raw` imports (CSS is not processed), so the stylesheets are read
// from disk. A non-literal specifier keeps @types/node out of the package typecheck
// (same pattern as vue-ui's CoarOverlayOutlet.test.ts).
const fsModule = 'node:fs';
const fs = (await import(/* @vite-ignore */ fsModule)) as {
  readFileSync(path: string, encoding: 'utf8'): string;
};
// A plain path from the file: URL — happy-dom replaces the global URL class.
const stylesDir = decodeURIComponent(import.meta.url)
  .replace(/^file:\/\//, '')
  .replace(/^\/([A-Za-z]:)/, '$1')
  .replace(/\/__tests__\/[^/]*$/, '');
const readStyle = (name: string): string => fs.readFileSync(`${stylesDir}/${name}`, 'utf8');
const compactCss = readStyle('compact.css');
const darkCss = readStyle('tokens-dark.css');
const indexTs = Object.values(
  import.meta.glob<string>('../../index.ts', { query: '?raw', import: 'default', eager: true }),
)[0];

const sources = Object.entries(componentSources).filter(
  ([path]) => !/__tests__|\.test\.ts$/.test(path),
);

/** The historical value(s) each new role falls back to, whitespace-normalised. */
const FALLBACKS: Record<string, string[]> = {
  '--coar-calendar-avatar-auto-bg': ['${person.color}'],
  '--coar-calendar-avatar-ink': ['white'],
  '--coar-calendar-all-day-action-size': ['auto'],
  '--coar-calendar-all-day-lane-height': ['24px'],
  '--coar-calendar-month-overflow-target-size': ['0px'],
  '--coar-calendar-resize-target-size': ['6px', 'auto'],
  '--coar-calendar-agenda-continuation-opacity': ['0.7'],
  '--coar-calendar-axis-marker-text-color': ['var(--marker-color)'],
  '--coar-calendar-draft-border-color': ['var(--coar-background-accent-primary, #2563eb)'],
  '--coar-calendar-event-meta-opacity': ['0.8'],
  '--coar-calendar-other-month-opacity': ['0.42'],
  '--coar-calendar-selection-border-color': [
    'color-mix( in srgb, var(--coar-calendar-selection-color, var(--coar-background-accent-primary, #2563eb)) 55%, transparent )',
  ],
  '--coar-calendar-accent': ['var(--coar-color-accent, var(--coar-color-accent-500, #2563eb))'],
  '--coar-calendar-agenda-header-padding': ['8px 16px'],
  '--coar-calendar-agenda-row-gap': ['12px'],
  '--coar-calendar-agenda-row-padding': ['10px 16px'],
  '--coar-calendar-agenda-title-font-size': ['var(--coar-font-size-base, 14px)'],
  '--coar-calendar-avatar-overflow-bg': ['var(--coar-surface-muted, #6b7280)'],
  '--coar-calendar-badge-font-weight': ['700'],
  '--coar-calendar-caption-font-size': [
    '11px',
    'var(--coar-component-xs-font-size)',
    'var(--coar-font-size-xs, 11px)',
  ],
  '--coar-calendar-caption-font-weight': ['600', '650'],
  '--coar-calendar-control-radius': [
    '5px',
    'var(--coar-button-radius, var(--coar-radius-xs, 2px))',
    'var(--coar-radius-xs, 2px)',
  ],
  '--coar-calendar-day-min-height': ['42px'],
  '--coar-calendar-day-min-height-wide': ['50px'],
  '--coar-calendar-day-overlay-close-size': ['20px'],
  '--coar-calendar-drag-outline-color': ['var(--coar-background-accent-primary, #2563eb)'],
  '--coar-calendar-drag-shadow': ['0 4px 12px rgba(0, 0, 0, 0.12)'],
  '--coar-calendar-event-default-color': [
    'var(--coar-color-accent, var(--coar-color-accent-500, #2563eb))',
  ],
  '--coar-calendar-event-font-size': ['var(--coar-font-size-xs, 11px)'],
  '--coar-calendar-event-font-size-dense': ['10px'],
  '--coar-calendar-event-meta-font-size': ['10px'],
  '--coar-calendar-event-radius': ['3px', 'var(--coar-radius-xs, 4px)'],
  '--coar-calendar-event-title-font-weight': ['600'],
  '--coar-calendar-focus-color': [
    'var(--coar-background-accent-primary, #2563eb)',
    'var(--coar-border-accent, #2563eb)',
    'var(--coar-color-focus, #2563eb)',
  ],
  '--coar-calendar-header-cell-padding': ['8px 12px'],
  '--coar-calendar-header-gap': ['var(--coar-spacing-m)'],
  '--coar-calendar-header-padding': ['var(--coar-spacing-s) var(--coar-spacing-m)'],
  '--coar-calendar-heading-font-weight': ['700'],
  '--coar-calendar-hover-bg': [
    'var(--coar-background-neutral-tertiary, #f3f4f6)',
    'var(--coar-surface-subtle, #f3f4f6)',
    'var(--coar-surface-subtle, #f6f7f9)',
  ],
  '--coar-calendar-invalid-color': ['var(--coar-color-danger, #dc2626)'],
  '--coar-calendar-invalid-shadow': ['0 4px 12px rgba(220, 38, 38, 0.15)'],
  '--coar-calendar-invalid-stripe': ['rgba(220, 38, 38, 0.18)'],
  '--coar-calendar-label-font-size': [
    'var(--coar-component-m-font-size)',
    'var(--coar-font-size-sm, 13px)',
  ],
  '--coar-calendar-label-font-weight': ['600'],
  '--coar-calendar-link-color': ['var(--coar-color-accent, var(--coar-color-accent-500, #2563eb))'],
  '--coar-calendar-now-color': ['var(--coar-color-danger, #dc2626)'],
  '--coar-calendar-on-accent': ['#fff', 'var(--coar-text-on-accent, white)', 'white'],
  '--coar-calendar-overlay-shadow': [
    '0 12px 32px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.08)',
  ],
  '--coar-calendar-panel-radius': ['var(--coar-radius-md, 8px)'],
  '--coar-calendar-scrollbar-color': ['var(--coar-border-neutral-tertiary, #d1d5db)'],
  '--coar-calendar-section-title-font-size': ['1.35rem', 'clamp(1.55rem, 2.1vw, 2rem)'],
  '--coar-calendar-section-title-font-weight': ['750'],
  '--coar-calendar-strong-font-weight': ['700', '750'],
  '--coar-calendar-timeline-today-bg': ['var(--coar-background-accent-soft, #eff6ff)'],
  '--coar-calendar-title-font-size': ['var(--coar-component-m-font-size)'],
  '--coar-calendar-today-color': [
    'var(--coar-color-accent, var(--coar-color-accent-500, #2563eb))',
    'var(--coar-text-accent, #2563eb)',
    'var(--coar-text-danger, #d70015)',
  ],
  '--coar-calendar-today-marker-bg': ['var(--coar-color-danger, #ff3b30)'],
  '--coar-calendar-ui-font-size': [
    'var(--coar-body-s-size, 13px)',
    'var(--coar-component-s-font-size)',
  ],
  '--coar-calendar-week-day-min-height': ['48px'],
  '--coar-calendar-weekday-cell-padding': ['8px 12px'],
};

/** Calendar tokens that are host / inline contracts, not profile roles. */
const HOST_CONTRACTS = new Set([
  '--coar-calendar-scroll-inset-bottom',
  '--coar-calendar-band-color',
  '--coar-calendar-selection-color',
  '--coar-calendar-draft-color',
  '--coar-calendar-point-body-opacity',
  '--coar-calendar-point-edge-height',
  '--coar-calendar-continuous-separator',
]);

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function declaredIn(css: string): Set<string> {
  return new Set(
    [...stripComments(css).matchAll(/(--coar-calendar-[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
  );
}

/** Top-level comma split (commas inside parentheses stay). */
function splitSelectors(selector: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of selector) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
    } else current += ch;
  }
  out.push(current.trim());
  return out.filter(Boolean);
}

/** `var(<role>, <fallback>)` usages with balanced-paren fallback, whitespace-normalised. */
function usagesOf(role: string, text: string): Array<string | null> {
  const out: Array<string | null> = [];
  const re = new RegExp(`var\\(\\s*${role.replace(/-/g, '\\-')}\\s*([,)])`, 'g');
  for (const match of text.matchAll(re)) {
    if (match[1] === ')') {
      out.push(null);
      continue;
    }
    let depth = 1;
    let i = match.index! + match[0].length;
    const start = i;
    for (; i < text.length && depth > 0; i += 1) {
      if (text[i] === '(') depth += 1;
      if (text[i] === ')') depth -= 1;
    }
    out.push(text.slice(start, i - 1).replace(/\s+/g, ' ').trim());
  }
  return out;
}

const compactDeclared = declaredIn(compactCss);
const darkDeclared = declaredIn(darkCss);
const newRoles = [...compactDeclared].filter((role) => !darkDeclared.has(role));

describe('compact profile — scoping', () => {
  it('every rule of compact.css is scoped by .coar-compact', () => {
    const css = stripComments(compactCss);
    const unscoped: string[] = [];
    let rules = 0;
    for (const match of css.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
      rules += 1;
      for (const selector of splitSelectors(match[1])) {
        if (!selector.startsWith('.coar-compact')) unscoped.push(selector);
      }
    }
    expect(rules).toBeGreaterThan(0);
    expect(unscoped).toEqual([]);
  });

  it('is imported by the package entry after the dark tokens', () => {
    const dark = indexTs.indexOf("import './styles/tokens-dark.css'");
    const compact = indexTs.indexOf("import './styles/compact.css'");
    expect(dark).toBeGreaterThanOrEqual(0);
    expect(compact).toBeGreaterThan(dark);
  });

  it('re-declares every package dark value so none leaks into the profile', () => {
    const missing = [...darkDeclared].filter((role) => !compactDeclared.has(role));
    expect(missing).toEqual([]);
    // The package-only text names are derived too.
    expect(stripComments(compactCss)).toMatch(/--coar-text-base:\s*var\(--coar-text-neutral-primary/);
    expect(stripComments(compactCss)).toMatch(/--coar-text-subtle:\s*var\(--coar-text-neutral-tertiary/);
  });

  it('never redefines consumer-owned colours', () => {
    const css = stripComments(compactCss);
    expect(css).not.toMatch(/--event-(bg|border|ink)\s*:/);
    expect(css).not.toMatch(/--coar-calendar-band-color\s*:/);
    // Shared vue-ui names stay untouched: only package roles and the two
    // package-only text names are declared.
    // Match declarations, not BEM modifiers followed by a pseudo-class
    // (for example `.day--other:not(...)`).
    const foreign = [...css.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+)\s*:/g)]
      .map((m) => m[1])
      .filter((name) => !name.startsWith('--coar-calendar-'))
      .filter((name) => name !== '--coar-text-base' && name !== '--coar-text-subtle');
    expect(foreign).toEqual([]);
  });
});

describe('compact profile — roles and fallbacks', () => {
  it('the fallback table covers exactly the roles compact.css introduces', () => {
    expect(newRoles.sort()).toEqual(Object.keys(FALLBACKS).sort());
  });

  it.each(Object.entries(FALLBACKS))(
    '%s is consumed only with its historical fallback',
    (role, expected) => {
      const found = new Set<string>();
      for (const [path, text] of sources) {
        for (const fallback of usagesOf(role, text)) {
          // A bare `var(--role)` would render nothing outside the profile.
          expect(fallback, `${path}: bare var(${role})`).not.toBeNull();
          found.add(fallback!);
        }
      }
      expect([...found].sort()).toEqual([...expected].sort());
    },
  );

  it('every calendar token a component reads is declared or a host contract', () => {
    const undeclared = new Set<string>();
    for (const [, text] of sources) {
      for (const match of text.matchAll(/var\(\s*(--coar-calendar-[a-z0-9-]+)/g)) {
        const role = match[1];
        if (!compactDeclared.has(role) && !HOST_CONTRACTS.has(role)) undeclared.add(role);
      }
    }
    expect([...undeclared]).toEqual([]);
  });
});
