/**
 * CSS box-shorthand handling for the compound Quick Property control.
 *
 * The schema stores padding as one string ('16px 32px'), but authors want four
 * inputs. These helpers convert both ways without ever inventing values: an
 * empty side stays empty, and writing back produces the shortest equivalent
 * form so a document does not grow noisier than what the author typed.
 */

export type BoxSide = 'top' | 'right' | 'bottom' | 'left';
export type BoxSides = Record<BoxSide, string>;

const EMPTY: BoxSides = { top: '', right: '', bottom: '', left: '' };

/**
 * Splits a shorthand into sides using the CSS 1-to-4 value rules.
 *
 * A value that is not 1–4 whitespace-separated tokens (a `calc()` with spaces,
 * say) is not something we can safely take apart, so it is reported as
 * unsplittable rather than mangled.
 */
export function parseBoxSides(value: string | undefined): BoxSides | null {
  const raw = (value ?? '').trim();
  if (!raw) return { ...EMPTY };
  // Anything with grouping syntax cannot be split on whitespace.
  if (/[(),]/.test(raw)) return null;
  const parts = raw.split(/\s+/);
  switch (parts.length) {
    case 1: return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    case 2: return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    case 3: return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    case 4: return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    default: return null;
  }
}

/**
 * Rebuilds the shortest shorthand for four sides.
 *
 * Returns undefined when nothing is set, so the caller removes the assignment
 * instead of writing an empty string. Partially filled sides cannot be
 * expressed as a shorthand, so the blanks are filled with '0' — otherwise the
 * emitted CSS would silently shift the remaining values into the wrong slots.
 */
export function formatBoxSides(sides: BoxSides): string | undefined {
  const filled = (['top', 'right', 'bottom', 'left'] as const).map((k) => sides[k].trim());
  if (filled.every((v) => v === '')) return undefined;
  const [top, right, bottom, left] = filled.map((v) => (v === '' ? '0' : v));
  if (top === right && right === bottom && bottom === left) return top;
  if (top === bottom && right === left) return `${top} ${right}`;
  if (right === left) return `${top} ${right} ${bottom}`;
  return `${top} ${right} ${bottom} ${left}`;
}

/** Collapsed one-line summary, e.g. '16px / 32px'. Empty when nothing is set. */
export function summariseBoxSides(value: string | undefined): string {
  const sides = parseBoxSides(value);
  if (sides === null) return (value ?? '').trim();
  const shorthand = formatBoxSides(sides);
  return shorthand ?? '';
}
