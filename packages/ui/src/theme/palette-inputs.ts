/** Stable base-colour names and the primitive palettes derived from them. */
export const COLOR_PALETTES = {
  accent: 'accent',
  success: 'green',
  error: 'red',
  warning: 'amber',
  info: 'slate',
} as const;

export const COLOR_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/** The default look's lightness/chroma curves, indexed by COLOR_STEPS. */
export const DEFAULT_PALETTE_CURVES = {
  accent: {
    light: ['0.97 0.012', '0.92 0.035', '0.84 0.075', '0.74 0.115', '0.66 0.145', 'l c', '0.53 0.15', '0.47 0.14', '0.39 0.12', '0.31 0.095'],
    dark: ['0.20 0.045', '0.25 0.065', '0.32 0.095', '0.42 0.13', '0.52 0.155', 'l c', '0.68 0.14', '0.76 0.11', '0.85 0.07', '0.93 0.035'],
  },
  green: {
    light: ['0.97 0.012', '0.92 0.035', '0.84 0.065', '0.74 0.10', '0.66 0.13', 'l c', '0.47 0.12', '0.40 0.10', '0.33 0.08', '0.26 0.06'],
    dark: ['0.20 0.035', '0.25 0.055', '0.32 0.08', '0.42 0.11', '0.52 0.13', 'l c', '0.68 0.12', '0.76 0.09', '0.85 0.06', '0.93 0.03'],
  },
  red: {
    light: ['0.97 0.012', '0.92 0.035', '0.84 0.07', '0.74 0.11', '0.66 0.145', 'l c', '0.47 0.13', '0.40 0.11', '0.33 0.09', '0.26 0.07'],
    dark: ['0.20 0.04', '0.25 0.06', '0.32 0.09', '0.42 0.12', '0.52 0.145', 'l c', '0.68 0.12', '0.76 0.09', '0.85 0.06', '0.93 0.03'],
  },
  amber: {
    light: ['0.97 0.015', '0.92 0.04', '0.86 0.08', '0.78 0.12', '0.72 0.14', 'l c', '0.50 0.12', '0.43 0.10', '0.36 0.08', '0.29 0.06'],
    dark: ['0.22 0.04', '0.27 0.06', '0.34 0.09', '0.44 0.12', '0.54 0.14', 'l c', '0.70 0.12', '0.78 0.09', '0.86 0.06', '0.93 0.03'],
  },
  slate: {
    light: ['0.97 0.006', '0.92 0.012', '0.84 0.02', '0.74 0.03', '0.66 0.035', 'l c', '0.47 0.03', '0.40 0.025', '0.35 0.02', '0.30 0.02'],
    dark: ['0.18 0.012', '0.23 0.018', '0.30 0.022', '0.40 0.025', '0.50 0.03', 'l c', '0.70 0.025', '0.78 0.018', '0.86 0.012', '0.93 0.006'],
  },
} as const;

export const DEFAULT_PALETTE_INPUTS: Record<string, string> = Object.fromEntries(
  Object.entries(DEFAULT_PALETTE_CURVES).flatMap(([palette, curves]) =>
    Object.entries(curves).flatMap(([scheme, values]) =>
      COLOR_STEPS.map((step, i) => [`--coar-color-${palette}-${step}-lc${scheme === 'dark' ? '-dark' : ''}`, values[i]]),
    ),
  ),
);
