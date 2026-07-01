/**
 * Bridges Cocoar design tokens → Mermaid `themeVariables`, so a rendered
 * diagram picks up the app's fonts and palette instead of Mermaid's stock look.
 *
 * The mapping is expressed as a pure function over a *token getter* + a *color
 * resolver* so it can be unit-tested without a DOM (feed it fakes).
 * {@link readCssTokens} produces the real, browser-backed getter (reads CSS
 * custom properties via `getComputedStyle`); {@link makeCssColorResolver}
 * produces the real color resolver.
 *
 * Why a color resolver at all: Cocoar's color tokens resolve to CSS Color-4
 * values — e.g. `oklch(from #1183CD 0.92 0.035 h)` — which Mermaid's color parser
 * (khroma) can't read, so a raw hand-off makes every diagram error out. The
 * resolver rasterizes each color to concrete sRGB `rgb()/rgba()` (a format
 * Mermaid always understands) and rejects anything unparseable, so a bad token is
 * dropped rather than poisoning the whole theme.
 *
 * Only tokens that resolve to a non-empty value are emitted — a missing (or
 * unparseable) token is simply omitted, letting Mermaid's `base` theme fill the
 * gap rather than being handed an empty string.
 */

type TokenKind = 'color' | 'font';

/** One Mermaid `themeVariables` key ← one Cocoar CSS custom property. */
const TOKEN_MAP: ReadonlyArray<{ mermaidVar: string; token: string; kind: TokenKind }> = [
  // Typography (used verbatim — not a color)
  { mermaidVar: 'fontFamily', token: '--coar-font-family-body', kind: 'font' },
  // Primary node fill + its text/border
  { mermaidVar: 'primaryColor', token: '--coar-background-accent-secondary', kind: 'color' },
  { mermaidVar: 'mainBkg', token: '--coar-background-accent-secondary', kind: 'color' },
  { mermaidVar: 'primaryTextColor', token: '--coar-text-neutral-primary', kind: 'color' },
  { mermaidVar: 'primaryBorderColor', token: '--coar-border-accent-primary', kind: 'color' },
  { mermaidVar: 'nodeBorder', token: '--coar-border-accent-primary', kind: 'color' },
  // Secondary / tertiary node fills (alternating clusters, subgraphs)
  { mermaidVar: 'secondaryColor', token: '--coar-background-neutral-secondary', kind: 'color' },
  { mermaidVar: 'tertiaryColor', token: '--coar-background-neutral-tertiary', kind: 'color' },
  { mermaidVar: 'clusterBkg', token: '--coar-background-neutral-secondary', kind: 'color' },
  { mermaidVar: 'clusterBorder', token: '--coar-border-neutral-tertiary', kind: 'color' },
  // Edges + global text/background
  { mermaidVar: 'lineColor', token: '--coar-border-neutral-secondary', kind: 'color' },
  { mermaidVar: 'textColor', token: '--coar-text-neutral-primary', kind: 'color' },
  { mermaidVar: 'background', token: '--coar-background-neutral-primary', kind: 'color' },
];

/**
 * Build the `themeVariables` map from a token getter + a color resolver.
 * `getToken(name)` returns the resolved CSS value for a custom property (or `''`
 * when unset); `resolveColor(value)` normalizes a CSS color to a Mermaid-safe
 * form and returns `''` for anything unparseable. Both default to identity /
 * pass-through so the function stays usable in a plain (DOM-free) unit test.
 */
export function buildMermaidThemeVariables(
  getToken: (name: string) => string,
  resolveColor: (value: string) => string = (value) => value,
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const { mermaidVar, token, kind } of TOKEN_MAP) {
    const raw = getToken(token).trim();
    if (!raw) continue;
    const value = kind === 'color' ? resolveColor(raw) : raw;
    if (value) vars[mermaidVar] = value;
  }
  return vars;
}

/**
 * Produce a token getter backed by `getComputedStyle` on the given element
 * (defaults to `document.documentElement`). Returns a getter that always yields
 * `''` when there is no DOM (SSR) or no element, so callers stay side-effect and
 * crash free on the server.
 */
export function readCssTokens(el?: Element | null): (name: string) => string {
  const target =
    el ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target || typeof getComputedStyle === 'undefined') {
    return () => '';
  }
  const styles = getComputedStyle(target);
  return (name: string) => styles.getPropertyValue(name);
}

/**
 * Produce a color resolver that normalizes any CSS color the browser can paint
 * — including CSS Color-4 forms like `oklch(...)` — into a concrete sRGB
 * `rgb()/rgba()` string that Mermaid understands. Unparseable input yields `''`.
 *
 * Mechanism: paint the color onto a 1×1 canvas and read the pixel back. Canvas
 * rasterizes to 8-bit sRGB, so the read-back is always plain rgb regardless of
 * the source color space. Validity is probed first by assigning the value over
 * two distinct sentinels — a color the canvas rejects leaves them differing.
 *
 * Returns a getter yielding `''` when there is no DOM / no 2D context (SSR).
 */
export function makeCssColorResolver(): (value: string) => string {
  if (typeof document === 'undefined') return () => '';
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  // willReadFrequently: we read the pixel back on every color (getImageData).
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return () => '';

  return (value: string): string => {
    if (!value) return '';
    // Validity probe: a valid color overwrites both sentinels to the same
    // normalized value; an invalid one is ignored, leaving them different.
    ctx.fillStyle = '#000000';
    ctx.fillStyle = value;
    const overBlack = ctx.fillStyle;
    ctx.fillStyle = '#ffffff';
    ctx.fillStyle = value;
    if (ctx.fillStyle !== overBlack) return '';

    // Rasterize + read concrete sRGB bytes (handles oklch/lab/color(...)).
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return a === 255
      ? `rgb(${r}, ${g}, ${b})`
      : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  };
}
