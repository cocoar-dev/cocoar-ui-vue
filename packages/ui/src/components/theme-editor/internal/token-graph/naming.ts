/**
 * Derive a token's layer + category from its NAME.
 *
 * The Cocoar naming schema already encodes the derivation layer to ~80%, which
 * is why the rule-driven editor can run on the existing names without a risky
 * global rename. This grammar is intentionally small — it groups/colours the
 * graph; it is not a full parser.
 *
 *   brand     raw hue seeds the user picks      --coar-accent / --coar-error …
 *   primitive palette steps + raw scales        --coar-color-red-600, --coar-radius-m
 *   semantic  intent → primitive mapping        --coar-background-semantic-error-bold
 *   component per-component knobs                --coar-button-danger-bg
 */

export type TokenLayer =
  | 'brand'
  | 'primitive'
  | 'semantic'
  | 'component'
  /** A Vue component that *consumes* tokens (e.g. CoarTextInput) — added by
   *  the consumer analysis, never derived from a token name. */
  | 'consumer'
  | 'other';

export interface TokenNaming {
  layer: TokenLayer;
  /** First descriptor segment: color, background, text, border, radius, button … */
  category: string;
  /** All descriptor segments after `--coar-`. */
  segments: string[];
}

/** The raw hue seeds that anchor the whole palette. */
const BRAND_SEEDS = new Set([
  '--coar-accent', '--coar-error', '--coar-success', '--coar-warning', '--coar-info',
]);

/** Categories that are raw typed primitives / scales (not semantic, not component). */
const PRIMITIVE_CATEGORIES = new Set([
  'color', 'radius', 'spacing', 'duration', 'ease', 'shadow', 'elevation',
  'font', 'line', 'z', 'focus', 'stroke', 'breakpoint', 'transition',
]);

/** Semantic-layer category prefixes (paired with semantic/neutral/accent role groups). */
const SEMANTIC_CATEGORIES = new Set(['background', 'text', 'border', 'icon', 'ring']);

export function parseTokenName(name: string): TokenNaming {
  const segments = name.replace(/^--coar-/, '').split('-');
  const category = segments[0] ?? '';

  if (BRAND_SEEDS.has(name)) return { layer: 'brand', category, segments };
  if (PRIMITIVE_CATEGORIES.has(category)) return { layer: 'primitive', category, segments };
  if (SEMANTIC_CATEGORIES.has(category)) return { layer: 'semantic', category, segments };
  if (category) return { layer: 'component', category, segments };
  return { layer: 'other', category, segments };
}
