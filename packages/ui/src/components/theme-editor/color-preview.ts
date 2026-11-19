import { apcaContrast, type CoarRgb } from '../../theme/color-contrast';
import type { PaletteKey } from './theme-editor-state';
import type { ThemeScheme } from './scheme-values';

/**
 * Below this APCA |Lc| the editor warns about text on a fill; it never refuses the
 * colour. Lc 60 is the APCA minimum for short, bold UI text such as button labels.
 */
export const TEXT_ON_MIN_LC = 60;

/** OKLCH of a #rrggbb colour (Björn Ottosson's OKLab), the space the palette curves are in. */
export function hexToOklch(hex: string): { l: number; c: number; h: number } | null {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!match) return null;
  const [r, g, b] = match.slice(1).map((part) => {
    const v = parseInt(part, 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    c: Math.hypot(a, bb),
    h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

export interface ColorPreview {
  base: string;
  ink: string;
  fill: string;
  contrast: number;
}

/** Resolve the real role fill, not the raw brand colour, in the chosen scheme. */
export function readColorPreviews(
  target: HTMLElement, scheme: ThemeScheme, keys: readonly PaletteKey[],
): Partial<Record<PaletteKey, ColorPreview>> {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return {};
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;color-scheme:${scheme}`;
  probe.setAttribute('aria-hidden', 'true');
  target.appendChild(probe);
  const read = (value: string, background?: string): CoarRgb => {
    probe.style.color = value;
    const color = getComputedStyle(probe).color;
    context.clearRect(0, 0, 1, 1);
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, 1, 1);
    }
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    return [data[0], data[1], data[2]];
  };
  const hex = (rgb: CoarRgb) => `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`;
  try {
    const surface = hex(read('var(--coar-background-neutral-primary)'));
    return Object.fromEntries(keys.map(key => {
      const base = read(`var(--coar-appearance-${key}, var(--coar-theme-${key}, var(--coar-${key})))`, surface);
      const fill = read(key === 'accent'
        ? 'var(--coar-background-accent-primary)' : `var(--coar-background-semantic-${key}-bold)`, surface);
      const ink = read(`var(--coar-text-on-${key})`, hex(fill));
      return [key, { base: hex(base), fill: hex(fill), ink: hex(ink), contrast: apcaContrast(ink, fill) }];
    }));
  } finally {
    probe.remove();
  }
}
