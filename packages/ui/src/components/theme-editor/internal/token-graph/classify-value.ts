/**
 * Classify a single raw CSS custom-property value into a DTCG-aligned
 * value-type and extract the `var()` references it depends on.
 *
 * This is deliberately syntactic: it looks at how the value is *written*, not
 * at its resolved result (the resolved result would have lost every `var()`
 * edge — see the token-graph notes). A value that is purely `var(--x)` is
 * typed `reference`; its concrete type is resolved later by walking the graph
 * to the first non-reference ancestor.
 */
import type { ClassifiedValue, TokenValueType } from './types';

const REFERENCE_RE = /var\(\s*(--[A-Za-z0-9-]+)/g;

/** CSS functions whose result is a color. */
const COLOR_FNS = new Set([
  'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix',
]);
/** Length/number arithmetic functions — treated as `dimension` unless purely unitless. */
const MATH_FNS = new Set(['calc', 'min', 'max', 'clamp']);

/** Bare keywords that are colors despite carrying no `#`/function syntax. */
const COLOR_KEYWORDS = new Set(['transparent', 'currentcolor']);
/** Easing keywords (the non-function half of the `cubicBezier` type). */
const EASING_KEYWORDS = new Set([
  'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end',
]);

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const DIMENSION_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|pt|cm|mm|in|fr)$/;
const NUMBER_RE = /^-?(?:\d+\.?\d*|\.\d+)$/;
const DURATION_RE = /^-?(?:\d+\.?\d*|\.\d+)m?s$/;
const KEYWORD_RE = /^[a-zA-Z][a-zA-Z-]*$/;

/**
 * Return the function name if `value` is exactly one balanced function call
 * spanning the whole string (`calc(… )`, `var(--x)`, `oklch(…)`), else null.
 * Used to type function-wrapped values by their outermost function.
 */
function outerFunction(value: string): string | null {
  const m = /^([a-zA-Z][a-zA-Z-]*)\(/.exec(value);
  if (!m) return null;
  let depth = 0;
  for (let i = m[1].length; i < value.length; i++) {
    const c = value[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      // If the call closes before the end, the value is a multi-part
      // expression (e.g. "1px var(--x)"), not a single wrapping function.
      if (depth === 0) return i === value.length - 1 ? m[1].toLowerCase() : null;
    }
  }
  return null;
}

/** Extract de-duplicated `var()` target names in source order. */
export function extractReferences(value: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  REFERENCE_RE.lastIndex = 0;
  while ((m = REFERENCE_RE.exec(value)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

/** True when the value is nothing but a single `var(--x[, fallback])` alias. */
function isPureReference(value: string): boolean {
  return outerFunction(value) === 'var';
}

/** Split a value on a top-level separator, ignoring separators inside parens. */
function splitTopLevel(value: string, sep: ' ' | ','): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = '';
  for (const c of value) {
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (depth === 0 && (sep === ',' ? c === ',' : /\s/.test(c))) {
      if (buf.trim()) parts.push(buf.trim());
      buf = '';
    } else buf += c;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

/** A part of a length shorthand: a dimension literal, a bare `0`, or a `var()`. */
function isDimensionPart(p: string): boolean {
  return DIMENSION_RE.test(p) || p === '0' || /^var\(/.test(p);
}

/**
 * Heuristic box-shadow test: ≥2 length offsets plus a color — where the color
 * may arrive via `var(--…-shadow-color)`, so a `var()` counts as a color
 * source. Also matches `inset` and comma-separated multi-layer shadows.
 * `none` is handled earlier as a keyword.
 */
function looksLikeShadow(value: string): boolean {
  if (/\binset\b/.test(value)) return true;
  const lengths = (value.match(/-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em)\b/g) ?? []).length;
  const zeroOffsets = (value.match(/(?:^|\s)0(?=[\s)])/g) ?? []).length;
  const offsets = lengths + zeroOffsets;
  const hasColor =
    /#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\(|\bcurrentColor\b|var\(/i.test(value);
  const layered = value.includes(',') && lengths >= 2;
  return (hasColor && offsets >= 2) || layered;
}

export function classifyValue(rawValue: string): ClassifiedValue {
  const raw = rawValue.trim();
  const references = extractReferences(raw);
  const type = detectType(raw, references);
  return { raw, type, references };
}

// Units must be attached to a numeric literal — bare word boundaries would
// falsely match the `s` ending a token name like `--coar-spacing-s`.
const TIME_LITERAL_RE = /\d\.?\d*\s*m?s\b/;
const LENGTH_LITERAL_RE = /\d\.?\d*\s*(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|pt|cm|mm|in|fr)\b/;

function detectType(raw: string, references: string[]): TokenValueType {
  const lower = raw.toLowerCase();

  // 1. Pure alias — concrete type inherited later from the target.
  if (isPureReference(raw)) return 'reference';

  // 2. Outermost wrapping function decides for function-shaped values.
  const fn = outerFunction(raw);
  if (fn) {
    if (COLOR_FNS.has(fn)) return 'color';
    if (fn === 'cubic-bezier' || fn === 'steps') return 'cubicBezier';
    if (MATH_FNS.has(fn)) {
      // Type a math expression by its literal units; if it only combines
      // references (e.g. `calc(var(--spacing-s) + var(--spacing-xs))`) default
      // to `dimension` — calc over tokens is virtually always a length.
      if (TIME_LITERAL_RE.test(lower) && !LENGTH_LITERAL_RE.test(lower)) return 'duration';
      if (LENGTH_LITERAL_RE.test(lower)) return 'dimension';
      if (references.length > 0) return 'dimension';
      return 'number';
    }
  }

  // 3. Single-token literals.
  if (HEX_RE.test(raw)) return 'color';
  if (COLOR_KEYWORDS.has(lower)) return 'color';
  if (EASING_KEYWORDS.has(lower)) return 'cubicBezier';
  if (DURATION_RE.test(raw)) return 'duration';
  if (DIMENSION_RE.test(raw)) return 'dimension';
  if (NUMBER_RE.test(raw)) return 'number';

  // 4. Multi-part / list values.
  if (looksLikeShadow(raw)) return 'shadow';

  const commaParts = splitTopLevel(raw, ',');
  const spaceParts = splitTopLevel(raw, ' ');
  const hasNumericUnit = LENGTH_LITERAL_RE.test(lower) || TIME_LITERAL_RE.test(lower);

  // Length shorthand: `0.5rem 0.75rem`, `2px 0`, `var(--spacing-s) var(--spacing-m)`.
  if (commaParts.length === 1 && spaceParts.length >= 2 && spaceParts.length <= 4 &&
      spaceParts.every(isDimensionPart)) {
    return 'dimension';
  }

  // Font stack: a comma list of ≥2 plain names — no var() refs, no numeric
  // units, no color hash. Digit-attached unit checks (above) avoid matching
  // the "em" inside identifiers like `system-ui`.
  const looksLikeNames = !hasNumericUnit && references.length === 0 && !raw.includes('#');
  if (looksLikeNames && commaParts.length >= 2) return 'fontFamily';

  // 5. Quoted string literal (e.g. breadcrumb separator `'/'`).
  if (/^(['"]).*\1$/.test(raw)) return 'keyword';

  // 6. Bare CSS identifier (uppercase, solid, inline-flex, none, auto, …).
  if (KEYWORD_RE.test(raw)) return 'keyword';

  // 7. Anything else multi-part is a CSS shorthand (transition/border/font).
  if (spaceParts.length > 1 || commaParts.length > 1) return 'composite';

  return 'unknown';
}
