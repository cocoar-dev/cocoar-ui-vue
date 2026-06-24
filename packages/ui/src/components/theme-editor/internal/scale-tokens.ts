/**
 * List the tokens of a scale (e.g. every `--coar-radius-*`) from the live
 * CSSOM, so a value editor can offer "pick a parent token" options that stay in
 * sync with the shipped library instead of being hand-maintained.
 *
 * Naming-schema based: a scale is `--coar-{category}-{step}`. Only DECLARATIONS
 * are collected (`--coar-radius-m:`), never usages (`var(--coar-radius-m)`), so
 * component tokens that *reference* the scale don't leak in.
 */
export interface ScaleToken {
  /** Full custom-property name, e.g. `--coar-radius-m`. */
  name: string;
  /** Display label, e.g. `M`. */
  label: string;
  /** CSS value to assign, e.g. `var(--coar-radius-m)`. */
  value: string;
}

// Canonical scale ordering; unknown steps sort after, alphabetically.
const ORDER = ['none', 'xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'full'];

export function listScaleTokens(category: string): ScaleToken[] {
  if (typeof document === 'undefined') return [];
  const declRe = new RegExp(`--coar-${category}-[a-z0-9-]+(?=\\s*:)`, 'g');
  const names = new Set<string>();

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | undefined;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet — not readable, skip
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      const text = (rule as CSSStyleRule).cssText;
      if (!text || !text.includes(`--coar-${category}-`)) continue;
      const matches = text.match(declRe);
      if (matches) matches.forEach((n) => names.add(n));
    }
  }

  const prefix = `--coar-${category}-`;
  const step = (n: string) => n.slice(prefix.length);
  const rank = (n: string) => {
    const i = ORDER.indexOf(step(n));
    return i < 0 ? ORDER.length : i;
  };
  return [...names]
    .sort((a, b) => rank(a) - rank(b) || step(a).localeCompare(step(b)))
    .map((name) => ({ name, label: step(name).toUpperCase(), value: `var(${name})` }));
}
