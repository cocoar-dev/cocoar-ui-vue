export type ThemeScheme = 'light' | 'dark';
export type SchemeValues<T> = Partial<Record<ThemeScheme, T>>;

function isSchemePair(value: string): boolean {
  return value.toLowerCase().startsWith('light-dark(') && value.endsWith(')');
}

/** Split only the outer light-dark(), not commas inside var(), rgb() or color-mix(). */
export function schemePair(value: string): [string, string] {
  const text = value.trim();
  if (!isSchemePair(text)) return [text, text];
  const body = text.slice(11, -1);
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '(') depth++;
    else if (body[i] === ')') depth--;
    else if (body[i] === ',' && depth === 0) {
      return [body.slice(0, i).trim(), body.slice(i + 1).trim()];
    }
  }
  return [text, text];
}

/** No authored value means no declaration; a locked channel retains its derivation. */
export function schemeColor(
  values: SchemeValues<string>,
  fallback: string,
  darkFollowsLight = false,
): string | undefined {
  if (values.light === undefined && values.dark === undefined) return undefined;
  const defaults = schemePair(fallback);
  const pairedDefault = isSchemePair(fallback.trim());
  const light = values.light ?? defaults[0];
  const dark = values.dark ?? (darkFollowsLight && !pairedDefault ? light : defaults[1]);
  // A pair records that a dark base was explicitly unlocked, even when its
  // current value happens to equal light. A single base means "dark follows".
  return light === dark && !(darkFollowsLight && (values.dark !== undefined || pairedDefault))
    ? light : `light-dark(${light}, ${dark})`;
}

/** Curves are inputs, never mode-independent overrides of the resulting colour. */
export function schemeCurve(
  token: string,
  values: SchemeValues<{ l: number; c: number }>,
): [string, string][] {
  const declarations: [string, string][] = [];
  for (const scheme of ['light', 'dark'] as const) {
    const value = values[scheme];
    if (value) declarations.push([`${token}-lc${scheme === 'dark' ? '-dark' : ''}`, `${value.l} ${value.c}`]);
  }
  return declarations;
}
