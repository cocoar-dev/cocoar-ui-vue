/**
 * Text colour on event surfaces — black or white on a supplied hex
 * event colour, or a consumer-supplied ink.
 *
 * Two contrast policies (mirrors `CalendarTheme.eventTextContrast`
 * in the SwiftUI port):
 *
 *   - `'wcag'` (default) — WCAG 2 relative-luminance ratio. Known
 *     flaw: it over-rates black on saturated mid-tones. On `#e03131`
 *     it scores black 4.65 vs white 4.51 — three percent decide, and
 *     the visibly worse colour wins.
 *   - `'apca'` — APCA-W3 (the WCAG 3 draft method). On `#e03131` it
 *     says white, Lc 75 vs 34. On yellow `#f2c010` both agree on
 *     black; the disagreement is confined to saturated mid-tones.
 *
 * Neither policy is "correct" for a tone on the fence — that is a
 * design decision. So a per-event `textColor` (`meta.textColor`) wins
 * over both, with no computation and no threshold.
 *
 * Decisions are made on the SUPPLIED colour, not on the rendered
 * surface; the time grid paints cards at reduced opacity, so black
 * stays right there more often than on the fully saturated month
 * chips and all-day bars.
 */

export type EventTextContrastPolicy = 'wcag' | 'apca';

export const DEFAULT_EVENT_TEXT_CONTRAST: EventTextContrastPolicy = 'wcag';

const WHITE = '#ffffff';
const BLACK = '#000000';
const DEFAULT_FALLBACK = 'var(--coar-text-base, #1a1c1f)';

export interface EventTextColorOptions {
  /** Returned when `background` is not a parseable hex colour (CSS `var()` …). */
  fallback?: string;
  policy?: EventTextContrastPolicy;
}

/**
 * Black or white for `background` under `policy`. The second argument
 * accepts the historical `fallback` string as well as an options bag.
 */
export function eventTextColor(
  background: string,
  fallbackOrOptions: string | EventTextColorOptions = {},
): string {
  const options: EventTextColorOptions =
    typeof fallbackOrOptions === 'string' ? { fallback: fallbackOrOptions } : fallbackOrOptions;
  const rgb = parseHex(background);
  if (!rgb) return options.fallback ?? DEFAULT_FALLBACK;
  return (options.policy ?? DEFAULT_EVENT_TEXT_CONTRAST) === 'apca'
    ? apcaTextColor(rgb)
    : wcagTextColor(rgb);
}

export interface EventInkOptions {
  /** The event surface colour (hex or any CSS colour expression). */
  background: string;
  /** Consumer-supplied ink (`meta.textColor`). Wins outright when set. */
  textColor?: unknown;
  policy?: EventTextContrastPolicy;
  fallback?: string;
}

/**
 * The ink a view should paint event text with: `textColor` if the
 * consumer supplied one, otherwise the policy's black/white choice.
 */
export function eventInkColor({
  background,
  textColor,
  policy,
  fallback,
}: EventInkOptions): string {
  if (typeof textColor === 'string' && textColor.trim() !== '') return textColor;
  return eventTextColor(background, { policy, fallback });
}

// ─── WCAG 2 ───────────────────────────────────────────────────────

function wcagTextColor(rgb: Rgb): string {
  const luminance =
    0.2126 * srgbChannel(rgb[0]) + 0.7152 * srgbChannel(rgb[1]) + 0.0722 * srgbChannel(rgb[2]);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return whiteContrast >= blackContrast ? WHITE : BLACK;
}

function srgbChannel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

// ─── APCA-W3 (0.1.9, base constants) ──────────────────────────────
//
// Reference: https://github.com/Myndex/SAPC-APCA — the W3 "bronze"
// constant set. Only the sign-agnostic magnitude |Lc| is used here to
// pick the stronger of white / black text.

const APCA = {
  exponent: 2.4,
  blackThreshold: 0.022,
  blackClamp: 1.414,
  normBg: 0.56,
  normText: 0.57,
  revBg: 0.65,
  revText: 0.62,
  scale: 1.14,
  loClip: 0.1,
  loOffset: 0.027,
} as const;

function apcaLuminance(rgb: Rgb): number {
  const lin = (v: number) => (v / 255) ** APCA.exponent;
  const y = 0.2126729 * lin(rgb[0]) + 0.7151522 * lin(rgb[1]) + 0.072175 * lin(rgb[2]);
  return y < APCA.blackThreshold ? y + (APCA.blackThreshold - y) ** APCA.blackClamp : y;
}

/** Signed Lc for `text` on `background` (positive = dark text on light). */
export function apcaContrast(text: Rgb, background: Rgb): number {
  const yText = apcaLuminance(text);
  const yBg = apcaLuminance(background);
  if (yBg > yText) {
    const sapc = (yBg ** APCA.normBg - yText ** APCA.normText) * APCA.scale;
    return sapc < APCA.loClip ? 0 : (sapc - APCA.loOffset) * 100;
  }
  const sapc = (yBg ** APCA.revBg - yText ** APCA.revText) * APCA.scale;
  return sapc > -APCA.loClip ? 0 : (sapc + APCA.loOffset) * 100;
}

function apcaTextColor(rgb: Rgb): string {
  const white = Math.abs(apcaContrast([255, 255, 255], rgb));
  const black = Math.abs(apcaContrast([0, 0, 0], rgb));
  return white >= black ? WHITE : BLACK;
}

// ─── Parsing ──────────────────────────────────────────────────────

export type Rgb = [number, number, number];

export function parseHex(value: string): Rgb | null {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map((part) => part + part).join('') : match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as Rgb;
}
