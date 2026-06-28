/**
 * Token-graph type model.
 *
 * The theme editor's long-term direction is a *rule-driven* form: parse the
 * token CSS into a typed dependency graph, then render one standard editor per
 * value-type instead of hand-wiring every token. These are the foundation
 * types for that graph — pure data, no Vue, no DOM.
 *
 * Value-type names follow the W3C Design Tokens Community Group (DTCG)
 * taxonomy (`color`, `dimension`, `number`, `duration`, `cubicBezier`,
 * `fontFamily`, `shadow`) so the model stays interop-friendly with the wider
 * design-token ecosystem (Style Dictionary, Tokens Studio, …). Two extra kinds
 * cover the CSS-native reality the DTCG spec doesn't: `keyword` (bare CSS
 * idents like `uppercase` / `solid`) and `reference` (a value that is purely
 * `var(--x)` — its concrete type is inherited from the target).
 */

/** DTCG-aligned classification of a token's *value*. */
export type TokenValueType =
  | 'color'
  | 'dimension'
  | 'number'
  | 'duration'
  | 'cubicBezier'
  | 'fontFamily'
  | 'shadow'
  /**
   * A multi-part CSS shorthand that doesn't reduce to one scalar type —
   * `transition` (`all 200ms ease`), `border` (`1px solid …`), or the `font`
   * shorthand. These are plumbing tokens, not simple editor knobs; later they
   * can split into the DTCG composite types (`border`, `transition`,
   * `typography`) if any becomes user-editable.
   */
  | 'composite'
  | 'keyword'
  /** Value is exactly `var(--x)`; concrete type is inherited from the target. */
  | 'reference'
  | 'unknown';

/** Result of classifying a single raw CSS value. */
export interface ClassifiedValue {
  /** The raw value text, trimmed (e.g. `"calc(var(--a) + 2px)"`). */
  raw: string;
  /** DTCG-aligned type of the value as written. */
  type: TokenValueType;
  /**
   * Custom-property names this value reads via `var()`, in source order,
   * de-duplicated (e.g. `["--coar-spacing-s", "--coar-spacing-xs"]`). These
   * are the parent edges in the dependency graph. Empty for pure leaves.
   */
  references: string[];
}
