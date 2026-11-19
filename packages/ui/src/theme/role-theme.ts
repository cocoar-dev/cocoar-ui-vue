import { COLOR_PALETTES } from './palette-inputs';
import { ROLE_DERIVED_TOKENS } from './role-derived-tokens';
import { ROLE_MOBILE_DEFAULTS, ROLE_ROOT_DEFAULTS, ROLE_SCHEME_DEFAULTS } from './role-input-defaults';
import { ROLE_THEME_INPUT_DEFAULTS, ROLE_THEME_MOBILE_INPUTS, ROLE_THEME_ROLES } from './role-theme-contract';

/**
 * A theme as values for the shared role contract. The library derives everything
 * that follows from them (styles/tokens/derived.css); a theme never brings formulas
 * of its own.
 */
export interface CoarRoleTheme {
  /** Token values on the theme scope. */
  tokens: Record<string, string>;
  /** Inputs and role overrides where the scope meets `.coar-mobile`, in either nesting order. */
  mobileTokens: Record<string, string>;
  /** Explicit derived-role values, reapplied at every boundary inside the scope. */
  roles?: Record<string, string>;
}

/** Set by a theme (empty value = on) to have the library derive from its values. */
export const ROLE_DERIVATION_TOKEN = '--coar-role-derivation';

/** What `ROLE_DERIVATION_TOKEN` resolves to on an element where derivation is active. */
export const ROLE_DERIVATION_MARKER = '--coar-d-role-derivation';

/** Optional inputs a surrounding `CoarThemeScope` hands to a theme; `.coar-theme-none` clears them. */
export const APPEARANCE_INPUT_TOKENS = [
  ...Object.keys(COLOR_PALETTES),
  'font-body', 'font-title', 'button-radius', 'input-radius', 'card-radius',
].map((role) => `--coar-appearance-${role}`);

/** Theme-owned bases survive the library defaults at nested scheme boundaries. */
export const THEME_COLOR_INPUT_TOKENS = Object.keys(COLOR_PALETTES).map((role) => `--coar-theme-${role}`);

/**
 * The tokens that carry a font family. Without a role theme each role holds its own
 * family, so naming another font means setting them all; a role theme derives the
 * roles from the first entry of each list.
 */
export const BODY_FAMILY_TOKENS = [
  '--coar-font-family-body',
  '--coar-body-base-family',
  '--coar-body-bold-family',
  '--coar-body-caption-family',
  '--coar-body-footnote-family',
  '--coar-body-small-base-family',
  '--coar-body-small-bold-family',
];
export const TITLE_FAMILY_TOKENS = [
  '--coar-font-family-title',
  '--coar-headings-heading-family',
  '--coar-headings-subheading-family',
  '--coar-titles-display-family',
  '--coar-titles-subtitle-family',
  '--coar-titles-title-family',
];

/** Boundaries inside a theme scope that set their own text and colour scheme again. */
export const NESTED_BOUNDARIES =
  ':where(.coar-mobile, .coar-theme-scope, .coar-theme-none, .light-mode, .dark-mode, [data-theme])';

function rule(selectors: string[], declarations: [string, string][]): string {
  const body = declarations.map(([name, value]) => `  ${name}: ${value};`);
  return `${selectors.join(',\n')} {\n${body.join('\n')}\n}`;
}

/**
 * The CSS of a role theme for one scope selector (`.coar-theme--acme`). The same
 * text styles the live Theme Editor, its download and the `.coar-compact` entry.
 *
 * Besides the values it states what a scope is: its own text and colour scheme, on
 * the scope and on every boundary nested in it, so a dark scope inside a light page
 * resolves `light-dark()` values and plain text correctly.
 */
export function serializeRoleTheme(selector: string, theme: CoarRoleTheme): string {
  const s = selector;
  const none = [`${s}.coar-theme-none`, `${s} .coar-theme-none`];
  const mobile = [
    `.coar-mobile ${s}`, `${s}.coar-mobile`, `${s} .coar-mobile`,
    `.coar-mobile ${s} .coar-theme-none`, `${s}.coar-mobile .coar-theme-none`,
    `${s} .coar-mobile .coar-theme-none`,
  ];
  const rules = [
    // A reset inside the scope returns to the theme's own defaults, not to a
    // mixture with the tokens `.coar-theme-none` restores.
    rule([`:root${s}`, s, ...none], Object.entries(theme.tokens)),
    rule([`:root${s}`, s, `${s} ${NESTED_BOUNDARIES}`], [
      ['color-scheme', 'var(--coar-compact-color-scheme, light)'],
      ['font-family', 'var(--coar-body-base-family)'],
      ['font-size', 'var(--coar-body-base-size)'],
      ['font-weight', 'var(--coar-body-base-weight)'],
      ['line-height', 'var(--coar-body-base-line-height)'],
      ['color', 'var(--coar-text-neutral-primary)'],
    ]),
    rule(none, [
      ...APPEARANCE_INPUT_TOKENS.map((token): [string, string] => [token, 'initial']),
      ['--coar-compact-color-scheme', 'light'],
    ]),
  ];
  if (Object.keys(theme.mobileTokens).length > 0) {
    rules.push(rule(mobile, Object.entries(theme.mobileTokens)));
  }
  if (theme.roles && Object.keys(theme.roles).length > 0) {
    // Match the specificity of preset inputs on the root and reset scopes too.
    rules.push(rule([`:root${s}`, ...none, s, `${s} ${NESTED_BOUNDARIES}`], Object.entries(theme.roles)));
    // A boundary must not restore a desktop role over an inherited mobile value.
    const mobileRoles = Object.entries(theme.mobileTokens)
      .filter(([token]) => Object.hasOwn(theme.roles ?? {}, token));
    if (mobileRoles.length > 0) {
      rules.push(rule([
        ...mobile,
        `.coar-mobile ${s} ${NESTED_BOUNDARIES}`,
        `${s}.coar-mobile ${NESTED_BOUNDARIES}`,
        `${s} .coar-mobile ${NESTED_BOUNDARIES}`,
      ], mobileRoles));
    }
  }
  // Keep the original rules as a complete fallback. Older browsers must not lose
  // a flat preset, its mobile presentation, or ordinary scheme/scope boundaries.
  return `${rules.join('\n\n')}\n\n${isolatedRoleTheme(selector, theme)}`;
}

/**
 * Native scoping stops at the NEXT preset, including a repeated preset or an
 * editor preview. Its independent slot values also override legacy ancestor
 * rules that remain necessary for browsers without @scope.
 */
function isolatedRoleTheme(selector: string, theme: CoarRoleTheme): string {
  const derived = new Set(ROLE_DERIVED_TOKENS);
  const roleNames = [...new Set([...ROLE_THEME_ROLES, ...Object.keys(theme.roles ?? {})])];
  const roleValues = Object.fromEntries(roleNames.map(name => [
    name,
    theme.roles?.[name] ?? theme.tokens[name] ?? ROLE_ROOT_DEFAULTS[name]
      ?? (derived.has(name) ? `var(--coar-d-${name.slice('--coar-'.length)}, inherit)` : 'initial'),
  ]));
  // Inputs on a preset root are not boundary overrides. In particular Compact's
  // neutral colours historically yield to explicit light/dark-mode declarations.
  // Re-derive aliases and inherit other roles instead of copying root constants.
  const boundaryRoles = Object.fromEntries(roleNames.map(name => [
    name,
    theme.roles?.[name]
      ?? (derived.has(name) ? `var(--coar-d-${name.slice('--coar-'.length)}, inherit)` : 'inherit'),
  ]));
  const inputs = { ...ROLE_THEME_INPUT_DEFAULTS, ...theme.tokens };
  const state = { ...inputs, ...roleValues };
  // Desktop completion contains unset mobile-only slots. Do not let those
  // erase inherited mobile defaults; explicitly authored theme values still win.
  const mobileState = {
    ...state, ...ROLE_MOBILE_DEFAULTS, ...theme.tokens, ...theme.roles, ...theme.mobileTokens,
  };
  const none = [':scope.coar-theme-none', ':scope .coar-theme-none'];
  const roots = [':root:scope', ':scope', ':scope.coar-mobile', ...none];
  const mobileRoots = ['.coar-mobile :scope', ':scope.coar-mobile'];
  const mobileNone = [
    '.coar-mobile :scope .coar-theme-none', ':scope.coar-mobile .coar-theme-none',
    ':scope .coar-mobile .coar-theme-none', ':scope.coar-mobile.coar-theme-none',
  ];
  const mobileRoles = Object.fromEntries(Object.entries(theme.mobileTokens)
    .filter(([name]) => roleNames.includes(name)));
  // Neutralise an outer preset's unscoped mobile declarations at a local mobile
  // boundary, without replacing inherited consumer edits by constant defaults.
  const inheritedMobileInputs = Object.fromEntries(ROLE_THEME_MOBILE_INPUTS
    .map(name => [name, ROLE_MOBILE_DEFAULTS[name] ?? 'inherit']));
  const scoped = [
    rule(roots, Object.entries(inputs)),
    rule(roots, Object.entries(roleValues)),
    rule([`:scope ${NESTED_BOUNDARIES}`], Object.entries(boundaryRoles)),
    rule(mobileRoots, Object.entries(mobileState)),
    rule([':scope .coar-mobile'], Object.entries({
      ...inheritedMobileInputs, ...theme.mobileTokens,
    })),
    rule([
      `.coar-mobile :scope ${NESTED_BOUNDARIES}`,
      `:scope.coar-mobile ${NESTED_BOUNDARIES}`,
      `:scope .coar-mobile ${NESTED_BOUNDARIES}`,
    ], Object.entries({ ...boundaryRoles, ...mobileRoles })),
    rule(mobileNone, Object.entries(mobileState)),
  ];
  for (const scheme of ['light', 'dark'] as const) {
    const defaults = Object.fromEntries(Object.entries(ROLE_SCHEME_DEFAULTS[scheme])
      .filter(([name]) => !derived.has(name) && !Object.hasOwn(theme.roles ?? {}, name)));
    if (Object.keys(defaults).length > 0) {
      scoped.push(rule([`:scope .${scheme}-mode:where(:not(.coar-theme-none))`], Object.entries(defaults)));
    }
  }
  return `@scope (${selector}) to (:scope :where(.coar-compact, .coar-theme-editor, [class*="coar-theme--"])) {\n${scoped.join('\n\n')}\n}\n`;
}
