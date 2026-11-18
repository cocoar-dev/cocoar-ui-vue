/** sRGB channels in the range 0–255. */
export type CoarRgb = [number, number, number];

// APCA-W3 0.1.9 (bronze constants), also used by the calendar's event ink policy.
// Kept internal here: Calendar's pure core entry must not import the UI bundle.
// https://github.com/Myndex/SAPC-APCA
function luminance(rgb: CoarRgb): number {
  const [r, g, b] = rgb.map((v) => (Math.max(0, Math.min(255, v)) / 255) ** 2.4);
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  return y < 0.022 ? y + (0.022 - y) ** 1.414 : y;
}

/** Signed APCA Lc: positive for dark text on a lighter background. */
export function apcaContrast(text: CoarRgb, background: CoarRgb): number {
  const txt = luminance(text);
  const bg = luminance(background);
  if (bg > txt) {
    const contrast = (bg ** 0.56 - txt ** 0.57) * 1.14;
    return contrast < 0.1 ? 0 : (contrast - 0.027) * 100;
  }
  const contrast = (bg ** 0.65 - txt ** 0.62) * 1.14;
  return contrast > -0.1 ? 0 : (contrast + 0.027) * 100;
}

/**
 * The raw APCA luminance where pure white and black have equal |Lc|.
 * At this crossing neither the background soft clamp nor the low clip applies.
 */
export const APCA_TEXT_ON_THRESHOLD = (() => {
  const sum = luminance([255, 255, 255]) ** 0.62 + luminance([0, 0, 0]) ** 0.57;
  let lo = 0.022;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const y = (lo + hi) / 2;
    if (y ** 0.56 + y ** 0.65 < sum) lo = y;
    else hi = y;
  }
  return (lo + hi) / 2;
})();
