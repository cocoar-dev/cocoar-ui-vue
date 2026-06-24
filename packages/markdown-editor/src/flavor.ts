/**
 * Markdown **flavor** — the portability contract, enforced at authoring time.
 *
 * Tellify (and any consumer with a strict downstream renderer, e.g. a native
 * SwiftUI markdown view) needs a guarantee that authored content only uses
 * constructs the target renderer understands. The `flavor` picks a capability
 * set; the editor then **hard-enforces** it — it only registers the matching
 * Milkdown plugins (so non-flavor constructs can't be typed or pasted, they
 * degrade to plain text) AND hides the matching toolbar buttons.
 *
 * The two cleanly-enforceable axes map to real renderer tiers:
 *  - `gfm`       — GFM tables + task lists + strikethrough (one Milkdown bundle)
 *  - `textColor` — Cocoar inline color spans (`<span style="color">`), which are
 *                  raw HTML and therefore **not portable** (they degrade to
 *                  plain text in a CommonMark/GFM renderer).
 *
 * CommonMark basics (headings, bold/italic, lists, links, images, code,
 * blockquote, hr) are always on — they are the portable floor.
 *
 * For finer toolbar curation *within* a flavor (e.g. keep GFM parsing but hide
 * the table button), use the separate `tools` whitelist — that is soft UI
 * curation, this is the hard format contract.
 */

/** Named flavor presets, from most portable to richest. */
export type CoarMarkdownFlavor = 'commonmark' | 'gfm' | 'cocoar';

/** The hard-enforceable capability axes. Each is independently on/off. */
export interface CoarMarkdownCapabilities {
  /** GFM tables + task lists + strikethrough. Portable in GFM-capable renderers. */
  gfm: boolean;
  /** Cocoar inline text color. NOT portable (raw HTML; degrades to plain text). */
  textColor: boolean;
}

/**
 * The `flavor` prop accepts a preset name OR a partial capability object.
 * In object form, unspecified capabilities are **off** (opt-in) — `{}` is
 * therefore equivalent to `'commonmark'`, `{ gfm: true }` to `'gfm'`.
 */
export type CoarMarkdownFlavorInput = CoarMarkdownFlavor | Partial<CoarMarkdownCapabilities>;

const PRESETS: Record<CoarMarkdownFlavor, CoarMarkdownCapabilities> = {
  commonmark: { gfm: false, textColor: false },
  gfm: { gfm: true, textColor: false },
  cocoar: { gfm: true, textColor: true },
};

/**
 * Resolve a flavor input to a concrete capability set.
 *
 * - `undefined` → `'cocoar'` (everything on — preserves the pre-flavor default,
 *   so existing consumers are unaffected).
 * - a preset name → its capability set.
 * - a partial object → each unspecified capability defaults to `false` (opt-in).
 */
export function resolveCapabilities(flavor: CoarMarkdownFlavorInput | undefined): CoarMarkdownCapabilities {
  if (flavor === undefined) return { ...PRESETS.cocoar };
  if (typeof flavor === 'string') return { ...(PRESETS[flavor] ?? PRESETS.cocoar) };
  return { gfm: flavor.gfm ?? false, textColor: flavor.textColor ?? false };
}
