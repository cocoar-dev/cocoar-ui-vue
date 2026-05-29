import type { CSSProperties } from 'vue';
import type { NodeStyle } from './schema';

/**
 * How a node sits inside its parent's flex layout: cross-axis self-alignment
 * (`align-self`) and main-axis sizing (the simple `size` + `width` model).
 *
 * Deliberately excludes padding — padding is an inner-box concern, applied
 * separately by {@link selfStyle}. The builder canvas reuses just this part
 * (its chrome wrapper has its own padding), so Preview and Editor stay in sync.
 */
export function selfLayoutStyle(style?: NodeStyle): CSSProperties {
  const css: CSSProperties = {};
  if (!style) return css;

  if (style.alignSelf) css.alignSelf = style.alignSelf;

  // Sizing along the parent's main axis.
  if (style.size === 'fill') {
    css.flex = '1 1 0%';
  } else if (style.size === 'fixed') {
    css.flex = '0 0 auto';
    if (style.width) css.width = style.width;
  } else if (style.size === 'fit') {
    css.flex = '0 0 auto';
  } else if (style.width) {
    // Back-compat: a width set without an explicit `size` behaves as 'fixed'.
    css.flex = '0 0 auto';
    css.width = style.width;
  }

  if (style.minHeight) css.minHeight = style.minHeight;

  return css;
}

/**
 * Full style for a node's own outer element — {@link selfLayoutStyle} plus
 * padding. Used by the real renderer where the node element *is* the box.
 *
 * Kept as a pure function (no Vue reactivity) so the style → CSS contract can be
 * unit-tested without mounting a component.
 */
export function selfStyle(style?: NodeStyle): CSSProperties {
  const css = selfLayoutStyle(style);
  if (style?.padding) css.padding = style.padding;
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
  if (style.gap) css.gap = style.gap;
  if (style.justify) css.justifyContent = style.justify;
  if (style.align) css.alignItems = style.align;
  return css;
}
