import type { CSSProperties } from 'vue';
import type { NodeStyle } from './schema';

/** Flex direction of the parent container — drives how `size: 'fill'` maps. */
export type FlexDirection = 'row' | 'column';

/** Harmless CSS lengths only: numbers, common units and calc/min/max/clamp arithmetic. */
export function safeCssLength(value: string | undefined): string | undefined {
  if (!value || value.length > 120) return undefined;
  if (/url|var|expression|[;{}\\]/i.test(value)) return undefined;
  return /^[\d\s.,+\-*/%()a-z]+$/i.test(value)
    && !/[a-z]/i.test(value.replace(
      /fit-content|clamp|calc|min|max|rem|vmin|vmax|dvh|svh|lvh|dvw|svw|lvw|dvi|svi|lvi|dvb|svb|lvb|px|em|vh|vw|vi|vb|ch|auto/g,
      '',
    ))
    ? value
    : undefined;
}

const SURFACES = {
  default: 'var(--coar-background-neutral-primary, #fff)',
  subtle: 'var(--coar-background-neutral-secondary, #f7f7f9)',
  raised: 'var(--coar-background-neutral-primary, #fff)',
  accent: 'var(--coar-surface-accent-secondary, #e6eefa)',
  success: 'var(--coar-background-semantic-success-subtle, #e8f5ed)',
  warning: 'var(--coar-background-semantic-warning-subtle, #fef3c7)',
  error: 'var(--coar-background-semantic-error-subtle, #fde8e4)',
} as const;
const FOREGROUNDS = {
  primary: 'var(--coar-text-neutral-primary, #111)',
  secondary: 'var(--coar-text-neutral-secondary, #666)',
  tertiary: 'var(--coar-text-neutral-tertiary, #888)',
  inverse: 'var(--coar-text-on-bold, #fff)',
  accent: 'var(--coar-text-accent-primary, #1666cc)',
  success: 'var(--coar-text-semantic-success-bold, #176b3a)',
  warning: 'var(--coar-text-semantic-warning-bold, #92400e)',
  error: 'var(--coar-text-semantic-error-bold, #c0392b)',
} as const;
const BORDERS = {
  neutral: 'var(--coar-border-neutral, #dfe1e7)',
  accent: 'var(--coar-border-accent-primary, #1666cc)',
  success: 'var(--coar-border-semantic-success-bold, #22834b)',
  warning: 'var(--coar-border-semantic-warning-bold, #b7791f)',
  error: 'var(--coar-border-semantic-error, #c0392b)',
} as const;
const RADII = { none: '0', small: '4px', medium: '8px', large: '16px', full: '9999px' } as const;
const SHADOWS = {
  none: 'none',
  small: 'var(--coar-shadow-s, 0 1px 3px rgba(0,0,0,.12))',
  medium: 'var(--coar-shadow-m, 0 4px 12px rgba(0,0,0,.14))',
  large: 'var(--coar-shadow-l, 0 12px 28px rgba(0,0,0,.18))',
} as const;
const FONT_FAMILIES = {
  body: 'var(--coar-body-base-family, sans-serif)',
  heading: 'var(--coar-headings-heading-family, var(--coar-body-base-family, sans-serif))',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;
const FONT_SIZES = {
  caption: 'var(--coar-body-caption-size, 12px)', small: 'var(--coar-body-small-base-size, 14px)',
  base: 'var(--coar-body-base-size, 16px)', large: 'var(--coar-headings-subheading-size, 20px)',
  xlarge: 'var(--coar-headings-heading-size, 24px)', display: 'var(--coar-titles-subtitle-size, 32px)',
} as const;
const FONT_WEIGHTS = { regular: '400', medium: '500', semibold: '600', bold: '700' } as const;
const LINE_HEIGHTS = { tight: '1.2', normal: '1.5', relaxed: '1.75' } as const;
const LETTER_SPACING = { tight: '-0.025em', normal: 'normal', wide: '0.05em' } as const;

export function safeFontVariationSettings(value: string | undefined): string | undefined {
  if (!value || value.length > 160) return undefined;
  return /^(?:\s*"[A-Za-z0-9]{1,4}"\s+-?(?:\d+(?:\.\d+)?|\.\d+)\s*)(?:,\s*"[A-Za-z0-9]{1,4}"\s+-?(?:\d+(?:\.\d+)?|\.\d+)\s*)*$/.test(value)
    ? value
    : undefined;
}

export function safeAspectRatio(value: string | undefined): string | undefined {
  if (!value || value.length > 40) return undefined;
  return /^\s*(?:\d+(?:\.\d+)?|\.\d+)(?:\s*\/\s*(?:\d+(?:\.\d+)?|\.\d+))?\s*$/.test(value)
    ? value
    : undefined;
}

/**
 * How a node sits inside its parent's flex layout: cross-axis self-alignment
 * (`align-self`) and main-axis sizing (the simple `size` + `width` model).
 *
 * `size` is direction-aware so "Fill" always does the intuitive thing:
 *   - row parent    → grow along the row (`flex: 1 1 0%`)
 *   - column parent → full width at natural height (`width: 100%`). Using
 *     flex-grow in a column would set a 0 main-axis (height) basis and squash
 *     the element — the exact bug a fill button hit in a login card.
 *
 * Deliberately excludes padding — that's an inner-box concern, applied
 * separately by {@link selfStyle}. The builder canvas reuses just this part
 * (its chrome wrapper has its own padding), so Preview and Editor stay in sync.
 */
export function selfLayoutStyle(
  style?: NodeStyle,
  parentDirection: FlexDirection = 'column',
): CSSProperties {
  const css: CSSProperties = {};
  if (!style) return css;

  if (style.alignSelf) css.alignSelf = style.alignSelf;

  if (style.size === 'fill') {
    if (parentDirection === 'row') css.flex = '1 1 0%';
    else css.width = '100%';
  } else if (style.size === 'fixed') {
    css.flex = '0 0 auto';
    if (safeCssLength(style.width)) css.width = safeCssLength(style.width);
  } else if (style.size === 'fit') {
    css.flex = '0 0 auto';
  } else if (style.width) {
    // Back-compat: a width set without an explicit `size` behaves as 'fixed'.
    css.flex = '0 0 auto';
    if (safeCssLength(style.width)) css.width = safeCssLength(style.width);
  }

  if (safeCssLength(style.minHeight)) css.minHeight = safeCssLength(style.minHeight);
  if (safeCssLength(style.minWidth)) css.minWidth = safeCssLength(style.minWidth);
  if (safeCssLength(style.maxWidth)) css.maxWidth = safeCssLength(style.maxWidth);
  if (safeCssLength(style.height)) css.height = safeCssLength(style.height);
  if (safeCssLength(style.maxHeight)) css.maxHeight = safeCssLength(style.maxHeight);
  if (safeAspectRatio(style.aspectRatio)) css.aspectRatio = safeAspectRatio(style.aspectRatio);
  if (style.overflow) css.overflow = style.overflow;
  if (style.hidden) css.display = 'none';
  if (style.surface) css.background = SURFACES[style.surface];
  if (style.foreground) css.color = FOREGROUNDS[style.foreground];
  if (style.borderTone) css.borderColor = BORDERS[style.borderTone];
  if (style.borderWidth) { css.borderWidth = style.borderWidth; css.borderStyle = style.borderWidth === '0' ? 'none' : 'solid'; }
  if (style.radius) css.borderRadius = RADII[style.radius];
  if (style.elevation) css.boxShadow = SHADOWS[style.elevation];
  if (style.fontFamily) css.fontFamily = FONT_FAMILIES[style.fontFamily];
  if (style.fontSize) css.fontSize = FONT_SIZES[style.fontSize];
  if (style.fontWeight) css.fontWeight = FONT_WEIGHTS[style.fontWeight];
  if (style.fontStyle) css.fontStyle = style.fontStyle;
  if (safeFontVariationSettings(style.fontVariationSettings)) {
    css.fontVariationSettings = safeFontVariationSettings(style.fontVariationSettings);
  }
  if (style.lineHeight) css.lineHeight = LINE_HEIGHTS[style.lineHeight];
  if (style.letterSpacing) css.letterSpacing = LETTER_SPACING[style.letterSpacing];
  if (style.textAlign) css.textAlign = style.textAlign;
  if (style.textDecoration) css.textDecoration = style.textDecoration;

  return css;
}

/**
 * Full style for a node's own outer element — {@link selfLayoutStyle} plus
 * padding. Used by the real renderer where the node element *is* the box.
 *
 * Kept as a pure function (no Vue reactivity) so the style → CSS contract can be
 * unit-tested without mounting a component.
 */
export function selfStyle(style?: NodeStyle, parentDirection: FlexDirection = 'column'): CSSProperties {
  const css = selfLayoutStyle(style, parentDirection);
  if (safeCssLength(style?.padding)) css.padding = safeCssLength(style?.padding);
  return css;
}

/**
 * Style for a container's inner layout element — how it arranges its children.
 * Covers gap, justify-content (main-axis distribution) and align-items
 * (cross-axis alignment).
 */
export function containerLayoutStyle(style?: NodeStyle): CSSProperties {
  const css: CSSProperties = {};
  if (!style) return css;
  if (safeCssLength(style.gap)) css.gap = safeCssLength(style.gap);
  if (style.justify) css.justifyContent = style.justify;
  if (style.align) css.alignItems = style.align;
  if (style.wrap !== undefined) css.flexWrap = style.wrap ? 'wrap' : 'nowrap';
  return css;
}
