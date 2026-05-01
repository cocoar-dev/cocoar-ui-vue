/**
 * Sanitizer + tag helpers for inline color spans.
 *
 * Wire format on disk: `<span style="color: <value>">…</span>`. Whitelist
 * approach — only `<span>` with a single `style="color: …"` declaration whose
 * value matches one of the allowed CSS color forms is accepted. Anything else
 * (extra attributes, multiple style declarations, `url(...)`, comments, etc.)
 * is rejected; the parser then falls back to plain text.
 *
 * The same helpers run on both the viewer (during parse) and the editor
 * (during paste / DOM-parse) so the two stay in lock-step on what counts as
 * a valid color span.
 */

const NAMED_COLORS = new Set<string>([
  'black',
  'silver',
  'gray',
  'white',
  'maroon',
  'red',
  'purple',
  'fuchsia',
  'green',
  'lime',
  'olive',
  'yellow',
  'navy',
  'blue',
  'teal',
  'aqua',
  'orange',
  'transparent',
  'currentcolor',
]);

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*\d{1,3}(?:\s*,\s*\d{1,3}){2}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;
const RGB_MODERN_RE =
  /^rgba?\(\s*\d{1,3}(?:%|)(?:\s+\d{1,3}(?:%|)){2}(?:\s*\/\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i;
const HSL_RE =
  /^hsla?\(\s*-?\d+(?:\.\d+)?(?:deg|rad|grad|turn)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;
const HSL_MODERN_RE =
  /^hsla?\(\s*-?\d+(?:\.\d+)?(?:deg|rad|grad|turn)?\s+\d{1,3}%\s+\d{1,3}%(?:\s*\/\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i;

/**
 * Whitelist-validate a CSS color value. Returns the normalized value (trimmed,
 * named colors lower-cased) when accepted, otherwise `null`.
 *
 * Rejected on principle:
 * - Anything containing `;` (would smuggle in a second declaration)
 * - Anything containing `/* … *\/` style comments
 * - `url(...)`, `expression(...)`, `var(--…)` (intentional — use a hex or
 *   named color instead; `var()` would let consumers reach into arbitrary
 *   custom properties, defeating the whitelist)
 * - Anything with `<` or `>` (HTML smuggling guard)
 */
export function sanitizeColor(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return null;
  if (value.length > 64) return null; // generous upper bound — prevents DoS regex paths

  // Hard rejects: structural smuggling.
  if (
    value.includes(';') ||
    value.includes('/*') ||
    value.includes('*/') ||
    value.includes('<') ||
    value.includes('>') ||
    value.includes('\\') ||
    value.includes('"') ||
    value.includes("'")
  ) {
    return null;
  }

  // Function-name guard: only `rgb`, `rgba`, `hsl`, `hsla` are allowed to use parens.
  if (value.includes('(')) {
    const fn = value.slice(0, value.indexOf('(')).trim().toLowerCase();
    if (fn !== 'rgb' && fn !== 'rgba' && fn !== 'hsl' && fn !== 'hsla') return null;
  }

  if (HEX_RE.test(value)) return value.toLowerCase();
  if (RGB_RE.test(value) || RGB_MODERN_RE.test(value)) return value;
  if (HSL_RE.test(value) || HSL_MODERN_RE.test(value)) return value;

  const lower = value.toLowerCase();
  if (NAMED_COLORS.has(lower)) return lower;

  return null;
}

/**
 * Inspect the raw `style` attribute value. Accepts only a single `color: <v>`
 * declaration (with optional trailing semicolon) where `<v>` passes
 * `sanitizeColor`. Returns the sanitized color on success, else `null`.
 */
export function sanitizeColorStyle(rawStyle: string): string | null {
  const trimmed = rawStyle.trim().replace(/;\s*$/, '');
  if (trimmed.length === 0) return null;
  if (trimmed.includes(';')) return null; // multiple declarations not allowed

  const colonIdx = trimmed.indexOf(':');
  if (colonIdx < 0) return null;

  const property = trimmed.slice(0, colonIdx).trim().toLowerCase();
  if (property !== 'color') return null;

  const value = trimmed.slice(colonIdx + 1);
  return sanitizeColor(value);
}

/** Pre-screens a raw open-tag string to confirm it's `<span ...>`. Helps cheap
 * rejection before running the heavier attribute parse. */
const OPEN_TAG_RE = /^<\s*span\b([^>]*?)>$/i;
const CLOSE_TAG_RE = /^<\s*\/\s*span\s*>$/i;

/**
 * Try to parse a string like `<span style="color: red">` into `{ color }`.
 * Returns `null` if anything other than a single `style` attribute appears,
 * the style fails sanitization, or the tag isn't a `<span>`.
 *
 * Permissive on whitespace (`<span  style = "color:red" >`), strict on
 * structure: the only attribute allowed is `style`. No `class`, `id`,
 * `data-*`, `on*` — anything beyond `style` rejects the whole tag.
 */
export function parseColorSpanOpen(rawTag: string): { color: string } | null {
  const trimmed = rawTag.trim();
  if (!OPEN_TAG_RE.test(trimmed)) return null;

  const match = OPEN_TAG_RE.exec(trimmed);
  const attrsBlob = (match?.[1] ?? '').trim();
  if (attrsBlob.length === 0) return null;

  // Walk the attribute list: only one entry, must be `style="…"` (or single quotes).
  // Manual parse — DOMParser would be heavier and is unavailable in worker contexts.
  const attrMatch = /^style\s*=\s*(?:"([^"]*)"|'([^']*)')\s*$/i.exec(attrsBlob);
  if (!attrMatch) return null;

  const styleValue = attrMatch[1] ?? attrMatch[2] ?? '';
  const color = sanitizeColorStyle(styleValue);
  return color === null ? null : { color };
}

/** Returns true iff the raw tag is a `</span>` close, ignoring whitespace. */
export function isColorSpanClose(rawTag: string): boolean {
  return CLOSE_TAG_RE.test(rawTag.trim());
}

/** Build the markdown wire form of an open color span tag. */
export function serializeColorSpanOpen(color: string): string {
  return `<span style="color: ${color}">`;
}

/** The matching close tag — exposed for symmetry with the open helper. */
export function serializeColorSpanClose(): string {
  return '</span>';
}
