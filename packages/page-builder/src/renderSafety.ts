/**
 * Guards for schema-driven render inputs. The renderer is documented as the
 * boundary that withstands hand-written or tampered JSON — values that end up
 * in DOM tag names or the RegExp compiler must degrade instead of throwing
 * and taking the whole rendered page down with them.
 */

import { Temporal } from '@js-temporal/polyfill';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
export type HeadingTag = (typeof HEADING_TAGS)[number];

/**
 * Schema `level` becomes a DOM tag name — anything outside 1–6 (strings, NaN,
 * tampered data) would throw in `document.createElement`.
 */
export function headingTag(level: unknown): HeadingTag {
  const n = typeof level === 'number' && Number.isFinite(level) ? Math.round(level) : 2;
  return HEADING_TAGS[Math.min(6, Math.max(1, n)) - 1];
}

/**
 * Compile a schema `validation.pattern`. Anchored, because the schema
 * documents `pattern` as a full-string match (the HTML `pattern`-attribute
 * semantics). Returns null instead of throwing on an invalid pattern — a
 * tenant typo must render as an inert rule, not crash the page.
 */
export function compilePagePattern(pattern: string): RegExp | null {
  try {
    return new RegExp(`^(?:${pattern})$`);
  } catch {
    return null;
  }
}

// Date values travel as ISO strings in the schema and in ActionValues; the
// Coar date pickers speak Temporal. These converters sit at that boundary —
// unparsable schema data renders as an empty picker instead of throwing.

export function isoToPlainDate(value: unknown): Temporal.PlainDate | null {
  if (typeof value !== 'string' || value === '') return null;
  try {
    return Temporal.PlainDate.from(value);
  } catch {
    return null;
  }
}

export function isoToPlainDateTime(value: unknown): Temporal.PlainDateTime | null {
  if (typeof value !== 'string' || value === '') return null;
  try {
    return Temporal.PlainDateTime.from(value);
  } catch {
    return null;
  }
}
