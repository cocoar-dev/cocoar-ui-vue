/**
 * How an input shows its box. `outline`: border and surface. `inline`: no border
 * or surface until it is used; a fill on hover and a stronger one while it is
 * edited. Size, padding and font stay those of `outline`.
 */
export type CoarInputAppearance = 'outline' | 'inline';

/** `fill`: the available width. `content`: the width of the value (or placeholder) and its affixes, at most the available width. */
export type CoarInputWidth = 'fill' | 'content';
