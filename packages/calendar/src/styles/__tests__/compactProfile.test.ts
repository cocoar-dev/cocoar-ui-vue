/// <reference types="vite/client" />
/**
 * Compact presentation (Preview) — token wiring of the package for role themes.
 *
 * The presentation is a set of VALUES, not a class: a role theme (`.coar-compact`
 * or any theme class carrying the same values) sets the constants and activates
 * the derivation with `--coar-role-derivation`. Without one nothing changes. The
 * package guarantees that by construction, and these tests pin it at the source
 * level:
 *
 *   - no stylesheet rule, component or script of the package keys on
 *     `.coar-compact`;
 *   - `styles/compact.css` only derives: every role has a private
 *     `--coar-d-calendar-*` value gated by `var(--coar-role-derivation)` and
 *     falls back to `inherit`, at zero specificity;
 *   - every constant of the presentation is in the value module of vue-ui
 *     (`src/theme/compact-packages/calendar.ts`), none in the stylesheet;
 *   - each role is consumed only with a fallback, and the fallbacks are
 *     exactly the values the components used before the roles existed
 *     (the table below; changing one changes the default look);
 *   - every role a component reads is declared (no dead / misspelt role);
 *   - every dark-mode value of `tokens-dark.css` reads the derived value
 *     first, so package dark values never leak into a role theme;
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
// The constants of the presentation live in vue-ui (another package root: read, not imported).
const valueModule = fs.readFileSync(
  `${stylesDir}/../../../ui/src/theme/compact-packages/calendar.ts`,
  'utf8',
);
const constants = new Map(
  [
    ...valueModule
      .slice(valueModule.indexOf('COMPACT_CALENDAR_TOKENS'))
      .matchAll(/'(--[a-z0-9-]+)':\s*'([^']*)'/g),
  ].map((m) => [m[1], m[2]]),
);
const indexTs = Object.values(
  import.meta.glob<string>('../../index.ts', { query: '?raw', import: 'default', eager: true }),
)[0];

const sources = Object.entries(componentSources).filter(
  ([path]) => !/__tests__|\.test\.ts$/.test(path),
);

/**
 * A role read without a fallback. Allowed only inside a private `--coar-i-*`
 * property, whose own consumer carries the fallback.
 */
const BARE = '(bare, in a private --coar-i-* property)';
/** The layer below: the rule declares nothing where the role is undefined. */
const NOTHING = 'revert-layer';

/** The historical value(s) each new role falls back to, whitespace-normalised. */
const FALLBACKS: Record<string, string[]> = {
  '--coar-calendar-continuous-weekday-positional-bg': ['var(--coar-i-continuous-weekday-bg, var(--coar-calendar-bg-weekend, #f6f7f9))'],
  '--coar-calendar-faint-text-color': ['var(--coar-text-subtle, #9ca3af)'],
  '--coar-calendar-today-danger-color': ['var(--coar-calendar-today-color, var(--coar-text-danger, #d70015))'],
  '--coar-calendar-today-label-color': ['var(--coar-calendar-today-color, var(--coar-text-accent, #2563eb))'],
  '--coar-calendar-small-caption-font-size': ['var(--coar-calendar-caption-font-size, 11px)'],
  '--coar-calendar-badge-caption-font-size': ['var(--coar-calendar-caption-font-size, var(--coar-component-xs-font-size))'],
  '--coar-calendar-strong-caption-font-weight': ['var(--coar-calendar-caption-font-weight, 650)'],
  '--coar-calendar-large-label-font-size': ['var(--coar-calendar-label-font-size, var(--coar-component-m-font-size))'],
  '--coar-calendar-small-control-radius': ['var(--coar-calendar-control-radius, var(--coar-radius-xs, 2px))'],
  '--coar-calendar-button-control-radius': ['var(--coar-calendar-control-radius, var(--coar-button-radius, var(--coar-radius-xs, 2px)))'],
  '--coar-calendar-agenda-header-border': ['var(--coar-calendar-border, #e3e5e9)'],
  '--coar-calendar-year-muted-color': ['var(--coar-text-subtle, #6b7280)'],
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
  '--coar-calendar-heading-font-weight': ['700', NOTHING],
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
  '--coar-calendar-on-accent': [
    'var(--coar-text-on-accent, #fff)',
    'var(--coar-text-on-accent, white)',
    'var(--coar-text-on-accent, var(--coar-text-on-bold, white))',
  ],
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
  '--coar-calendar-other-month-color': ['var(--coar-text-neutral-primary)'],
  '--coar-calendar-time-grid-overflow-x': ['hidden'],
  '--coar-calendar-time-grid-day-min-width': [BARE],
  '--coar-calendar-resize-max-size': [NOTHING],
  '--coar-calendar-continuous-weekday-bg': [BARE],
  '--coar-calendar-continuous-weekday-weekend-bg': ['var(--coar-calendar-continuous-weekday-bg)'],
  '--coar-calendar-continuous-weekday-weekend-color': [
    'color-mix(in srgb, var(--coar-text-subtle, #6c7280) 58%, transparent)',
  ],
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
    [...stripComments(css).matchAll(/(?<![a-z0-9-])(--coar-calendar-[a-z0-9-]+)\s*:/g)].map(
      (m) => m[1],
    ),
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

/**
 * `var(<role>, <fallback>)` usages with balanced-paren fallback, whitespace-normalised.
 * A usage without fallback is `BARE` inside a private `--coar-i-*` declaration, else null.
 */
function usagesOf(role: string, text: string): Array<string | null> {
  const out: Array<string | null> = [];
  const re = new RegExp(`var\\(\\s*${role.replace(/-/g, '\\-')}\\s*([,)])`, 'g');
  for (const match of text.matchAll(re)) {
    if (match[1] === ')') {
      const before = text.slice(0, match.index!);
      const declaration = before.slice(Math.max(before.lastIndexOf(';'), before.lastIndexOf('{')) + 1);
      out.push(/^\s*--coar-i-[a-z0-9-]+\s*:/.test(declaration) ? BARE : null);
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

const derivedDeclared = declaredIn(compactCss);
const darkDeclared = declaredIn(darkCss);
const calendarConstants = [...constants.keys()].filter((role) => role.startsWith('--coar-calendar-'));
const declared = new Set([...derivedDeclared, ...calendarConstants]);
const newRoles = [...declared].filter((role) => !darkDeclared.has(role));

/** `--coar-calendar-bg` / `--coar-text-base` → their private derived name. */
const derivedNameOf = (token: string): string =>
  `--coar-d-calendar-${token.replace(/^--coar-(calendar-)?/, '')}`;

/** Declarations of a stylesheet: name → value, whitespace-normalised. */
function declarationsOf(css: string): Array<[string, string]> {
  return [...stripComments(css).matchAll(/(?<=^|[;{])\s*(--[a-z0-9-]+)\s*:([^;{}]*);/g)].map(
    (m) => [m[1], m[2].replace(/\s+/g, ' ').trim()],
  );
}

describe('compact presentation — values, not a class', () => {
  it('nothing in the package keys on .coar-compact', () => {
    expect(stripComments(compactCss)).not.toContain('coar-compact');
    expect(stripComments(darkCss)).not.toContain('coar-compact');
    const keyed = sources.filter(([, text]) => text.includes('coar-compact')).map(([path]) => path);
    expect(keyed).toEqual([]);
  });

  it('every rule of compact.css has zero specificity', () => {
    const css = stripComments(compactCss);
    const specific: string[] = [];
    let rules = 0;
    for (const match of css.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
      rules += 1;
      for (const selector of splitSelectors(match[1])) {
        // `:where(…)`, optionally narrowed by `:not(:where(…) *)` (outermost root only).
        if (!/^:where\([^()]*\)(:not\(\s*:where\([^()]*\)\s*\*\s*\))?$/.test(selector)) {
          specific.push(selector);
        }
      }
    }
    expect(rules).toBeGreaterThan(0);
    expect(specific).toEqual([]);
  });

  it('compact.css only derives: a gated private value, and the role falling back to inherit', () => {
    const declarations = declarationsOf(compactCss);
    const privateValues = new Map(declarations.filter(([name]) => name.startsWith('--coar-d-')));
    const roles = declarations.filter(([name]) => !name.startsWith('--coar-d-'));
    expect(roles.length).toBeGreaterThan(0);
    expect(privateValues.size).toBe(roles.length);
    for (const [name, value] of roles) {
      const derivedName = derivedNameOf(name);
      expect(value, name).toBe(`var(${derivedName}, inherit)`);
      // Invalid, hence unset, unless a theme activates the derivation.
      expect(privateValues.get(derivedName), derivedName).toMatch(/^var\(--coar-role-derivation\) \S/);
    }
  });

  it('the constants are in the value module, the derivations in the stylesheet', () => {
    expect(calendarConstants.length).toBe(constants.size);
    expect(calendarConstants.filter((role) => derivedDeclared.has(role))).toEqual([]);
    for (const [role, value] of constants) expect(value, role).not.toContain('var(');
    // A formula of other tokens is resolved where it is declared: it must not be a constant.
    for (const [name, value] of declarationsOf(compactCss)) {
      if (name.startsWith('--coar-d-')) expect(value, name).toMatch(/var\(--(?!coar-role-derivation)/);
    }
  });

  it('optional calendar geometry inputs retain the historical default values', () => {
    const enterpriseModule = fs.readFileSync(
      `${stylesDir}/../../../ui/src/theme/enterprise-packages/calendar.ts`,
      'utf8',
    );
    const inputs = [...enterpriseModule.matchAll(/'(--coar-theme-calendar-[a-z-]+)':\s*'([^']*)'/g)]
      .filter(([, input]) => /(?:font-(?:size|weight)|radius|padding|gap|height(?:-wide)?|size)$/.test(input));
    expect(inputs.length).toBe(27);
    const aliases: Record<string, string> = {
      'small-caption-font-size': 'caption-font-size',
      'badge-caption-font-size': 'caption-font-size',
      'strong-caption-font-weight': 'caption-font-weight',
      'large-label-font-size': 'label-font-size',
      'small-control-radius': 'control-radius',
      'button-control-radius': 'control-radius',
    };
    for (const [, input, value] of inputs) {
      const suffix = input.slice('--coar-theme-calendar-'.length);
      expect(FALLBACKS[`--coar-calendar-${aliases[suffix] ?? suffix}`], input).toContain(value);
    }
  });

  it('every Enterprise input uses the same gated package derivation', () => {
    const enterpriseModule = fs.readFileSync(
      `${stylesDir}/../../../ui/src/theme/enterprise-packages/calendar.ts`,
      'utf8',
    );
    const inputs = [...enterpriseModule.matchAll(/'(--coar-theme-calendar-[a-z-]+)':\s*'([^']*)'/g)];
    expect(inputs.length).toBe(70);
    const declarations = new Map(declarationsOf(compactCss));
    for (const [, input] of inputs) {
      const suffix = input.slice('--coar-theme-calendar-'.length);
      expect(declarations.get(`--coar-d-calendar-${suffix}`), input).toMatch(
        new RegExp(`^var\\(--coar-role-derivation\\) var\\(${input}(?:,|\\))`),
      );
    }
  });

  it('paired calendar inputs retain the original dark token defaults', () => {
    const enterpriseModule = fs.readFileSync(
      `${stylesDir}/../../../ui/src/theme/enterprise-packages/calendar.ts`,
      'utf8',
    );
    const pairs = [...enterpriseModule.matchAll(/'--coar-theme-calendar-([a-z-]+)':\s*'(light-dark\([^']*)'/g)];
    expect(pairs.length).toBe(19);
    const darkDefaults = new Map(
      [...darkCss.matchAll(/var\(--coar-d-calendar-([a-z-]+),\s*([^)]+)\)/g)]
        .map(([, suffix, value]) => [suffix, value.trim()]),
    );
    const aliases: Record<string, string> = {
      'year-muted-color': 'text-subtle',
      'agenda-header-border': 'border',
      'faint-text-color': 'text-subtle',
      'continuous-weekday-positional-bg': 'bg-weekend',
    };
    for (const [, suffix, value] of pairs) {
      const original = aliases[suffix] ?? suffix;
      expect(darkDefaults.has(original), suffix).toBe(true);
      expect(value.endsWith(`, ${darkDefaults.get(original)})`), suffix).toBe(true);
    }
  });

  it('is imported by the package entry with the dark tokens', () => {
    expect(indexTs).toContain("import './styles/tokens-dark.css'");
    expect(indexTs).toContain("import './styles/compact.css'");
  });

  it('every package dark value reads the derived value first, so none leaks into a role theme', () => {
    const dark = declarationsOf(darkCss);
    expect(dark.length).toBeGreaterThan(0);
    const derived = new Set(declarationsOf(compactCss).map(([name]) => name));
    for (const [name, value] of dark) {
      const derivedName = derivedNameOf(name);
      // Without a role theme the private value is undefined: the literal applies, as before.
      expect(value, name).toMatch(new RegExp(`^var\\(${derivedName}, #[0-9a-f]{6,8}\\)$`));
      expect(derived.has(derivedName), derivedName).toBe(true);
    }
    // The package-only text names are derived too.
    expect(stripComments(compactCss)).toMatch(
      /--coar-d-calendar-text-base:\s*var\(--coar-role-derivation\) var\(--coar-theme-calendar-text-base, var\(--coar-text-neutral-primary, #444\)\)/,
    );
    expect(stripComments(compactCss)).toMatch(
      /--coar-d-calendar-text-subtle:\s*var\(--coar-role-derivation\) var\(--coar-theme-calendar-text-subtle, var\(--coar-text-neutral-tertiary, #6b6b6b\)\)/,
    );
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
      .filter((name) => !name.startsWith('--coar-calendar-') && !name.startsWith('--coar-d-calendar-'))
      .filter((name) => name !== '--coar-text-base' && name !== '--coar-text-subtle');
    expect(foreign).toEqual([]);
  });
});

describe('compact presentation — roles and fallbacks', () => {
  it('the fallback table covers exactly the roles the presentation introduces', () => {
    expect(newRoles.sort()).toEqual(Object.keys(FALLBACKS).sort());
  });

  it.each(Object.entries(FALLBACKS))(
    '%s is consumed only with its historical fallback',
    (role, expected) => {
      const found = new Set<string>();
      for (const [path, text] of sources) {
        for (const fallback of usagesOf(role, text)) {
          // A bare `var(--role)` would render nothing without a role theme.
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
        if (!declared.has(role) && !HOST_CONTRACTS.has(role)) undeclared.add(role);
      }
    }
    expect([...undeclared]).toEqual([]);
  });
});
