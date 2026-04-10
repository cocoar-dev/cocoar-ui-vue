import type { TagVariant, TagSize } from '@cocoar/vue-ui';

/**
 * Custom tag color. Sets CSS custom properties on the tag element.
 */
export interface TagColor {
  /** Background color */
  bg: string;
  /** Border color (defaults to bg) */
  border?: string;
  /** Text color */
  text?: string;
}

export interface TagCellRendererConfig {
  /** Delimiter to split a string value into multiple tags (default: ',') */
  separator?: string;
  /** Default variant applied to all tags */
  variant?: TagVariant;
  /** Map a tag value to a specific variant */
  variantMap?: Record<string, TagVariant>;
  /**
   * Function to resolve variant or custom color per tag value.
   * Takes precedence over `variantMap` when it returns a non-undefined value.
   *
   * Return value:
   * - `TagVariant` string (`'success'`, `'error'`, …) → predefined variant
   * - CSS color string (`'#dc2626'`, `'rgb(…)'`) → used as text+border, bg auto-calculated
   * - `TagColor` object (`{ bg, border?, text? }`) → full custom colors
   * - `undefined` → falls back to `variantMap` / `variant` / `'neutral'`
   */
  variantFn?: (value: string) => TagVariant | TagColor | string | undefined;
  /** Tag size (default: 's') */
  size?: TagSize;
  /** Prefix for i18n translation keys (optional). When set, translates via `i18n.t(prefix + value)` */
  i18nPrefix?: string;
  /** Property name to read the label from when values are objects */
  labelProperty?: string;
}
