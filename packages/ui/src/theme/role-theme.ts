/**
 * A theme as values for the shared role contract. The library derives everything
 * that follows from them (styles/tokens/derived.css); a theme never brings formulas
 * of its own.
 */
export interface CoarRoleTheme {
  /** Token values on the theme scope. */
  tokens: Record<string, string>;
  /** Token values where the scope meets `.coar-mobile`, in either nesting order. */
  mobileTokens: Record<string, string>;
}

/** Set by a theme (empty value = on) to have the library derive from its values. */
export const ROLE_DERIVATION_TOKEN = '--coar-role-derivation';

/** What `ROLE_DERIVATION_TOKEN` resolves to on an element where derivation is active. */
export const ROLE_DERIVATION_MARKER = '--coar-d-role-derivation';

/** Optional inputs a surrounding `CoarThemeScope` hands to a theme; `.coar-theme-none` clears them. */
export const APPEARANCE_INPUT_TOKENS = [
  'accent', 'font-body', 'font-title', 'button-radius', 'input-radius', 'card-radius',
].map((role) => `--coar-appearance-${role}`);

/** Boundaries inside a theme scope that set their own text and colour scheme again. */
const NESTED_BOUNDARIES =
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
    rules.push(rule([
      `.coar-mobile ${s}`, `${s}.coar-mobile`, `${s} .coar-mobile`,
      `.coar-mobile ${s} .coar-theme-none`, `${s}.coar-mobile .coar-theme-none`,
      `${s} .coar-mobile .coar-theme-none`,
    ], Object.entries(theme.mobileTokens)));
  }
  return `${rules.join('\n\n')}\n`;
}
