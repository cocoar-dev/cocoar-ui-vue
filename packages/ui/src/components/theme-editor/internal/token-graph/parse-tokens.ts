/**
 * Parse `--coar-*` custom-property declarations out of CSS *text*.
 *
 * Parsing text (not `getComputedStyle`) is deliberate: computed styles have
 * already resolved every `var()` away, which would destroy the dependency
 * edges we want. The CSS source — or the CSSOM `cssRules`, which preserve the
 * authored `var()` — keeps them.
 *
 * Pure + input-agnostic: hand it a CSS string (a token file, several files
 * concatenated, or `cssRules.map(r => r.cssText).join('')` at runtime). A
 * regex reader is enough for the well-formed Cocoar token files; `postcss`
 * (already in the dep tree via Vite) is the hardening upgrade if the input
 * ever gets gnarlier.
 */

export interface TokenEntry {
  /** Custom-property name, e.g. `--coar-button-danger-bg`. */
  name: string;
  /** Raw value text as authored, e.g. `var(--coar-background-semantic-error-bold)`. */
  value: string;
}

const COMMENT_RE = /\/\*[\s\S]*?\*\//g;
const DECL_RE = /(--coar-[a-z0-9-]+)\s*:\s*([^;]+);/g;

/** Strip CSS block comments so commented-out tokens aren't parsed. */
function stripComments(css: string): string {
  return css.replace(COMMENT_RE, '');
}

/**
 * Extract every `--coar-*` declaration in source order. The same name can
 * appear more than once (light/dark/theme-none redefine it) — callers that
 * want one entry per name should de-duplicate (see {@link dedupeFirstWins}).
 */
export function parseTokenDeclarations(css: string): TokenEntry[] {
  const out: TokenEntry[] = [];
  const clean = stripComments(css);
  let m: RegExpExecArray | null;
  DECL_RE.lastIndex = 0;
  while ((m = DECL_RE.exec(clean)) !== null) {
    out.push({ name: m[1], value: m[2].trim().replace(/\s+/g, ' ') });
  }
  return out;
}

/** Keep the first occurrence of each token name (the canonical/base theme). */
export function dedupeFirstWins(entries: TokenEntry[]): TokenEntry[] {
  const seen = new Set<string>();
  const out: TokenEntry[] = [];
  for (const e of entries) {
    if (!seen.has(e.name)) {
      seen.add(e.name);
      out.push(e);
    }
  }
  return out;
}
