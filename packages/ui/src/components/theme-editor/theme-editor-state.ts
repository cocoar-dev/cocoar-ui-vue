import { ref, watch, computed, reactive, type Ref } from 'vue';
import type { StepDef, StepOverride } from './CoarPaletteEditor.vue';
import type { CoarSelectOption } from '../select';

// ── Types ─────────────────────────────────────────────────────
export type PaletteKey = 'accent' | 'error' | 'success' | 'warning' | 'info';
export type SemanticPalette = 'accent' | 'red' | 'green' | 'amber' | 'slate';
export interface SemanticEntry {
  token: string;
  label: string;
  defaultPalette: SemanticPalette;
  defaultStep: number;
}
export interface SemanticGroup {
  label: string;
  entries: SemanticEntry[];
}
export interface SemanticOverride {
  palette: SemanticPalette;
  step: number;
}

// ── Module-level hideDarkToggle storage ───────────────────────
let _hideDarkToggle = false;

// ── isOpen (used by CoarThemeEditor.vue) ─────────────────────
export const isOpen = ref(false);

// ── Defaults ──────────────────────────────────────────────────
export const DEFAULTS = {
  // Brand
  accent: '#1183CD',
  success: '#1e8f48',
  error: '#d63b3b',
  warning: '#cc821f',
  info: '#5e6b84',
  // Radius primitive scale
  radiusXxs: 1,
  radiusXs: 2,
  radiusS: 3,
  radiusM: 4,
  radiusL: 5,
  radiusXl: 6,
  // Spacing primitive scale
  spacingXs: 4,
  spacingS: 8,
  spacingM: 16,
  spacingL: 24,
  spacingXl: 32,
  // Density
  density: 1,
  // Radius per component (CSS token values, not px numbers)
  buttonRadius: 'var(--coar-radius-xs)',
  inputRadius: 'var(--coar-radius-xs)',
  fieldPaddingX: 12,
  tagRadius: 'var(--coar-radius-xs)',
  badgeRadius: 'var(--coar-radius-full)',
  cardRadius: 'var(--coar-radius-s)',
  menuRadius: 'var(--coar-radius-s)',
  popoverRadius: 'var(--coar-radius-s)',
  dropdownRadius: 'var(--coar-input-radius)', // select dropdown follows the input radius by default
  dialogRadius: 'var(--coar-radius-l)',
  toastRadius: 'var(--coar-radius-m)',
  // Shadow per component
  cardShadow: 'var(--coar-elevation-medium)',
  menuShadow: 'var(--coar-shadow-s)',
  popoverShadow: 'var(--coar-shadow-m)',
  dropdownShadow: 'var(--coar-shadow-m)',
  dialogShadow: 'var(--coar-shadow-xl)',
  toastShadow: 'var(--coar-shadow-l)',
  // Typography
  fontBody: 'Poppins',
  fontTitle: 'Inter',
  // Motion
  motionScale: 1,
};

// ── Reactive refs ─────────────────────────────────────────────
export const isDark = ref(false);
export const themeName = ref('custom');

export const accent = ref(DEFAULTS.accent);
export const success = ref(DEFAULTS.success);
export const errorColor = ref(DEFAULTS.error);
export const warning = ref(DEFAULTS.warning);
export const info = ref(DEFAULTS.info);
export const radiusXxs = ref(DEFAULTS.radiusXxs);
export const radiusXs = ref(DEFAULTS.radiusXs);
export const radiusS = ref(DEFAULTS.radiusS);
export const radiusM = ref(DEFAULTS.radiusM);
export const radiusL = ref(DEFAULTS.radiusL);
export const radiusXl = ref(DEFAULTS.radiusXl);
export const spacingXs = ref(DEFAULTS.spacingXs);
export const spacingS = ref(DEFAULTS.spacingS);
export const spacingM = ref(DEFAULTS.spacingM);
export const spacingL = ref(DEFAULTS.spacingL);
export const spacingXl = ref(DEFAULTS.spacingXl);
export const density = ref(DEFAULTS.density);
export const buttonRadius = ref(DEFAULTS.buttonRadius);
export const inputRadius = ref(DEFAULTS.inputRadius);
export const fieldPaddingX = ref(DEFAULTS.fieldPaddingX);
export const fieldPaddingXEnabled = ref(false);
export const tagRadius = ref(DEFAULTS.tagRadius);
export const badgeRadius = ref(DEFAULTS.badgeRadius);
export const cardRadius = ref(DEFAULTS.cardRadius);
export const menuRadius = ref(DEFAULTS.menuRadius);
export const popoverRadius = ref(DEFAULTS.popoverRadius);
export const dropdownRadius = ref(DEFAULTS.dropdownRadius);
export const dialogRadius = ref(DEFAULTS.dialogRadius);
export const toastRadius = ref(DEFAULTS.toastRadius);
export const cardShadow = ref(DEFAULTS.cardShadow);
export const menuShadow = ref(DEFAULTS.menuShadow);
export const popoverShadow = ref(DEFAULTS.popoverShadow);
export const dropdownShadow = ref(DEFAULTS.dropdownShadow);
export const dialogShadow = ref(DEFAULTS.dialogShadow);
export const toastShadow = ref(DEFAULTS.toastShadow);
export const fontBody = ref(DEFAULTS.fontBody);
export const fontTitle = ref(DEFAULTS.fontTitle);
export const motionScale = ref(DEFAULTS.motionScale);

// ── Radius preset options ─────────────────────────────────────
export const RADIUS_OPTIONS = [
  { label: 'None', value: '0px' },
  { label: 'XXS', value: 'var(--coar-radius-xxs)' },
  { label: 'XS', value: 'var(--coar-radius-xs)' },
  { label: 'S', value: 'var(--coar-radius-s)' },
  { label: 'M', value: 'var(--coar-radius-m)' },
  { label: 'L', value: 'var(--coar-radius-l)' },
  { label: 'XL', value: 'var(--coar-radius-xl)' },
  { label: 'Full', value: 'var(--coar-radius-full)' },
];

// The select dropdown panel is part of the field, so its default tracks the input
// radius. Offer that as a first-class choice (alongside the fixed steps) so the
// control reflects the coupling instead of showing a blank for `var(--coar-input-radius)`.
export const DROPDOWN_RADIUS_OPTIONS = [
  { label: 'Match input', value: 'var(--coar-input-radius)' },
  ...RADIUS_OPTIONS,
];

export const SHADOW_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'XS', value: 'var(--coar-shadow-xs)' },
  { label: 'S', value: 'var(--coar-shadow-s)' },
  { label: 'M', value: 'var(--coar-shadow-m)' },
  { label: 'L', value: 'var(--coar-shadow-l)' },
  { label: 'XL', value: 'var(--coar-shadow-xl)' },
  { label: 'Elev.', value: 'var(--coar-elevation-medium)' },
];

export const FONT_OPTIONS_BODY = ['Poppins', 'Inter', 'DM Sans', 'Nunito', 'Geist', 'system-ui'];
export const FONT_OPTIONS_TITLE = ['Inter', 'Poppins', 'DM Sans', 'Nunito', 'Geist', 'system-ui'];

export const DENSITY_OPTIONS = [
  { label: 'Compact', value: 0.75 },
  { label: 'Default', value: 1 },
  { label: 'Comfortable', value: 1.33 },
];

// ── Presets ───────────────────────────────────────────────────
export const PRESETS = [
  {
    id: 'enterprise',
    label: 'Enterprise',
    description: 'Precise, professional — the default Cocoar look.',
    values: { ...DEFAULTS, isDark: false },
  },
  {
    id: 'saas',
    label: 'Modern SaaS',
    description: 'Rounder corners, slightly softer feel.',
    values: {
      ...DEFAULTS,
      buttonRadius: 'var(--coar-radius-m)',
      inputRadius: 'var(--coar-radius-m)',
      tagRadius: 'var(--coar-radius-m)',
      cardRadius: 'var(--coar-radius-l)',
      menuRadius: 'var(--coar-radius-l)',
      popoverRadius: 'var(--coar-radius-l)',
      dropdownRadius: 'var(--coar-input-radius)', // follows the (rounder) input
      dialogRadius: 'var(--coar-radius-xl)',
      toastRadius: 'var(--coar-radius-l)',
    },
  },
  {
    id: 'playful',
    label: 'Playful',
    description: 'Pill buttons, vivid accent, very rounded — for consumer apps.',
    values: {
      ...DEFAULTS,
      accent: '#7C3AED',
      spacingXs: 6,
      spacingS: 12,
      spacingM: 20,
      spacingL: 28,
      fieldPaddingX: 20,
      buttonRadius: 'var(--coar-radius-full)',
      inputRadius: 'var(--coar-radius-l)',
      tagRadius: 'var(--coar-radius-full)',
      badgeRadius: 'var(--coar-radius-full)',
      cardRadius: 'var(--coar-radius-xl)',
      menuRadius: 'var(--coar-radius-xl)',
      popoverRadius: 'var(--coar-radius-xl)',
      dropdownRadius: 'var(--coar-input-radius)', // follows the (rounder) input
      dialogRadius: 'var(--coar-radius-xl)',
      toastRadius: 'var(--coar-radius-xl)',
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Sharp corners, no shadows, maximum density.',
    values: {
      ...DEFAULTS,
      radiusXxs: 0,
      radiusXs: 0,
      radiusS: 0,
      radiusM: 0,
      radiusL: 0,
      radiusXl: 0,
      cardShadow: 'none',
      menuShadow: 'none',
      popoverShadow: 'none',
      dropdownShadow: 'none',
      toastShadow: 'none',
    },
  },
] as const;

// ── Palette editor ────────────────────────────────────────────
export const activePalette = ref<PaletteKey | null>(null);

export const paletteOverrides = reactive<Record<PaletteKey, Record<number, StepOverride>>>({
  accent: {},
  error: {},
  success: {},
  warning: {},
  info: {},
});

export const PALETTE_CSS_TOKEN: Record<PaletteKey, string> = {
  accent: '--coar-color-accent',
  error: '--coar-color-red',
  success: '--coar-color-green',
  warning: '--coar-color-amber',
  info: '--coar-color-slate',
};

export const PALETTE_BASE_VAR: Record<PaletteKey, string> = {
  accent: '--coar-accent',
  error: '--coar-error',
  success: '--coar-success',
  warning: '--coar-warning',
  info: '--coar-info',
};

export const PALETTE_STEPS: Record<PaletteKey, StepDef[]> = {
  accent: [
    { step: 50, defL: 0.97, defC: 0.012 },
    { step: 100, defL: 0.92, defC: 0.035 },
    { step: 200, defL: 0.84, defC: 0.075 },
    { step: 300, defL: 0.74, defC: 0.115 },
    { step: 400, defL: 0.66, defC: 0.145 },
    { step: 500, defL: null, defC: null },
    { step: 600, defL: 0.53, defC: 0.15 },
    { step: 700, defL: 0.47, defC: 0.14 },
    { step: 800, defL: 0.39, defC: 0.12 },
    { step: 900, defL: 0.31, defC: 0.095 },
  ],
  error: [
    { step: 50, defL: 0.97, defC: 0.012 },
    { step: 100, defL: 0.92, defC: 0.035 },
    { step: 200, defL: 0.84, defC: 0.07 },
    { step: 300, defL: 0.74, defC: 0.11 },
    { step: 400, defL: 0.66, defC: 0.145 },
    { step: 500, defL: null, defC: null },
    { step: 600, defL: 0.47, defC: 0.13 },
    { step: 700, defL: 0.4, defC: 0.11 },
    { step: 800, defL: 0.33, defC: 0.09 },
    { step: 900, defL: 0.26, defC: 0.07 },
  ],
  success: [
    { step: 50, defL: 0.97, defC: 0.012 },
    { step: 100, defL: 0.92, defC: 0.035 },
    { step: 200, defL: 0.84, defC: 0.065 },
    { step: 300, defL: 0.74, defC: 0.1 },
    { step: 400, defL: 0.66, defC: 0.13 },
    { step: 500, defL: null, defC: null },
    { step: 600, defL: 0.47, defC: 0.12 },
    { step: 700, defL: 0.4, defC: 0.1 },
    { step: 800, defL: 0.33, defC: 0.08 },
    { step: 900, defL: 0.26, defC: 0.06 },
  ],
  warning: [
    { step: 50, defL: 0.97, defC: 0.015 },
    { step: 100, defL: 0.92, defC: 0.04 },
    { step: 200, defL: 0.86, defC: 0.08 },
    { step: 300, defL: 0.78, defC: 0.12 },
    { step: 400, defL: 0.72, defC: 0.14 },
    { step: 500, defL: null, defC: null },
    { step: 600, defL: 0.5, defC: 0.12 },
    { step: 700, defL: 0.43, defC: 0.1 },
    { step: 800, defL: 0.36, defC: 0.08 },
    { step: 900, defL: 0.29, defC: 0.06 },
  ],
  info: [
    { step: 50, defL: 0.97, defC: 0.006 },
    { step: 100, defL: 0.92, defC: 0.012 },
    { step: 200, defL: 0.84, defC: 0.02 },
    { step: 300, defL: 0.74, defC: 0.03 },
    { step: 400, defL: 0.66, defC: 0.035 },
    { step: 500, defL: null, defC: null },
    { step: 600, defL: 0.47, defC: 0.03 },
    { step: 700, defL: 0.4, defC: 0.025 },
    { step: 800, defL: 0.35, defC: 0.02 },
    { step: 900, defL: 0.3, defC: 0.02 },
  ],
};

// ── Semantic layer ────────────────────────────────────────────
export const SEMANTIC_PALETTE_CSS: Record<SemanticPalette, string> = {
  accent: '--coar-color-accent',
  red: '--coar-color-red',
  green: '--coar-color-green',
  amber: '--coar-color-amber',
  slate: '--coar-color-slate',
};

export const SEMANTIC_PALETTE_LABELS: Record<SemanticPalette, string> = {
  accent: 'Accent',
  red: 'Red',
  green: 'Green',
  amber: 'Amber',
  slate: 'Slate',
};

export const SEMANTIC_PALETTES: SemanticPalette[] = ['accent', 'red', 'green', 'amber', 'slate'];
export const SEMANTIC_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export const SEMANTIC_GROUPS: SemanticGroup[] = [
  {
    label: 'Accent',
    entries: [
      {
        token: '--coar-background-accent-primary',
        label: 'Primary background',
        defaultPalette: 'accent',
        defaultStep: 500,
      },
      {
        token: '--coar-background-accent-hover',
        label: 'Hover background',
        defaultPalette: 'accent',
        defaultStep: 600,
      },
      {
        token: '--coar-background-accent-active',
        label: 'Active background',
        defaultPalette: 'accent',
        defaultStep: 700,
      },
      {
        token: '--coar-background-accent-secondary',
        label: 'Secondary background',
        defaultPalette: 'accent',
        defaultStep: 100,
      },
      {
        token: '--coar-text-accent-primary',
        label: 'Primary text',
        defaultPalette: 'accent',
        defaultStep: 600,
      },
      {
        token: '--coar-border-accent-primary',
        label: 'Primary border',
        defaultPalette: 'accent',
        defaultStep: 500,
      },
    ],
  },
  {
    label: 'Error',
    entries: [
      {
        token: '--coar-background-semantic-error-bold',
        label: 'Bold background',
        defaultPalette: 'red',
        defaultStep: 600,
      },
      {
        token: '--coar-background-semantic-error-hover',
        label: 'Hover background',
        defaultPalette: 'red',
        defaultStep: 700,
      },
      {
        token: '--coar-background-semantic-error-active',
        label: 'Active background',
        defaultPalette: 'red',
        defaultStep: 800,
      },
      {
        token: '--coar-background-semantic-error-subtlest',
        label: 'Subtlest background',
        defaultPalette: 'red',
        defaultStep: 50,
      },
      {
        token: '--coar-background-semantic-error-subtle',
        label: 'Subtle background',
        defaultPalette: 'red',
        defaultStep: 100,
      },
      {
        token: '--coar-border-semantic-error-bold',
        label: 'Bold border',
        defaultPalette: 'red',
        defaultStep: 800,
      },
      {
        token: '--coar-border-semantic-error',
        label: 'Border',
        defaultPalette: 'red',
        defaultStep: 600,
      },
    ],
  },
  {
    label: 'Success',
    entries: [
      {
        token: '--coar-background-semantic-success-bold',
        label: 'Bold background',
        defaultPalette: 'green',
        defaultStep: 600,
      },
      {
        token: '--coar-background-semantic-success-subtlest',
        label: 'Subtlest background',
        defaultPalette: 'green',
        defaultStep: 50,
      },
      {
        token: '--coar-background-semantic-success-subtle',
        label: 'Subtle background',
        defaultPalette: 'green',
        defaultStep: 100,
      },
      {
        token: '--coar-border-semantic-success-bold',
        label: 'Bold border',
        defaultPalette: 'green',
        defaultStep: 800,
      },
      {
        token: '--coar-text-semantic-success-bold',
        label: 'Bold text',
        defaultPalette: 'green',
        defaultStep: 800,
      },
    ],
  },
  {
    label: 'Warning',
    entries: [
      {
        token: '--coar-background-semantic-warning-bold',
        label: 'Bold background',
        defaultPalette: 'amber',
        defaultStep: 600,
      },
      {
        token: '--coar-background-semantic-warning-subtlest',
        label: 'Subtlest background',
        defaultPalette: 'amber',
        defaultStep: 50,
      },
      {
        token: '--coar-background-semantic-warning-subtle',
        label: 'Subtle background',
        defaultPalette: 'amber',
        defaultStep: 100,
      },
      {
        token: '--coar-border-semantic-warning-bold',
        label: 'Bold border',
        defaultPalette: 'amber',
        defaultStep: 900,
      },
      {
        token: '--coar-text-semantic-warning-bold',
        label: 'Bold text',
        defaultPalette: 'amber',
        defaultStep: 900,
      },
    ],
  },
  {
    label: 'Info',
    entries: [
      {
        token: '--coar-background-semantic-info-bold',
        label: 'Bold background',
        defaultPalette: 'slate',
        defaultStep: 700,
      },
      {
        token: '--coar-background-semantic-info-subtlest',
        label: 'Subtlest background',
        defaultPalette: 'slate',
        defaultStep: 50,
      },
      {
        token: '--coar-background-semantic-info-subtle',
        label: 'Subtle background',
        defaultPalette: 'slate',
        defaultStep: 100,
      },
      {
        token: '--coar-border-semantic-info-bold',
        label: 'Bold border',
        defaultPalette: 'slate',
        defaultStep: 900,
      },
    ],
  },
];

export const semanticOverrides = reactive<Record<string, SemanticOverride>>({});

// ── Computed select options ───────────────────────────────────
export const FONT_OPTIONS_BODY_SELECT = computed<CoarSelectOption<string>[]>(() =>
  FONT_OPTIONS_BODY.map((f) => ({ value: f, label: f })),
);
export const FONT_OPTIONS_TITLE_SELECT = computed<CoarSelectOption<string>[]>(() =>
  FONT_OPTIONS_TITLE.map((f) => ({ value: f, label: f })),
);
export const SEMANTIC_PAL_OPTIONS = computed<CoarSelectOption<string>[]>(() =>
  SEMANTIC_PALETTES.map((p) => ({ value: p, label: SEMANTIC_PALETTE_LABELS[p] })),
);
export const SEMANTIC_STEP_OPTIONS = computed<CoarSelectOption<number>[]>(() =>
  SEMANTIC_STEPS.map((s) => ({ value: s, label: String(s) })),
);

// ── Motion ────────────────────────────────────────────────────
export const BASE_DURATIONS: Record<string, number> = {
  instant: 0,
  fast: 100,
  normal: 200,
  slow: 400,
  slowest: 600,
};
export const motionLabel = (v: number) =>
  v === 0 ? 'Instant' : v < 0.7 ? 'Fast' : v < 1.3 ? 'Default' : v < 2 ? 'Slow' : 'Very slow';

// ── hasChanges ────────────────────────────────────────────────
export const hasChanges = computed(
  () =>
    accent.value !== DEFAULTS.accent ||
    success.value !== DEFAULTS.success ||
    errorColor.value !== DEFAULTS.error ||
    warning.value !== DEFAULTS.warning ||
    info.value !== DEFAULTS.info ||
    radiusXxs.value !== DEFAULTS.radiusXxs ||
    radiusXs.value !== DEFAULTS.radiusXs ||
    radiusS.value !== DEFAULTS.radiusS ||
    radiusM.value !== DEFAULTS.radiusM ||
    radiusL.value !== DEFAULTS.radiusL ||
    radiusXl.value !== DEFAULTS.radiusXl ||
    spacingXs.value !== DEFAULTS.spacingXs ||
    spacingS.value !== DEFAULTS.spacingS ||
    spacingM.value !== DEFAULTS.spacingM ||
    spacingL.value !== DEFAULTS.spacingL ||
    spacingXl.value !== DEFAULTS.spacingXl ||
    density.value !== DEFAULTS.density ||
    fieldPaddingXEnabled.value ||
    buttonRadius.value !== DEFAULTS.buttonRadius ||
    inputRadius.value !== DEFAULTS.inputRadius ||
    tagRadius.value !== DEFAULTS.tagRadius ||
    badgeRadius.value !== DEFAULTS.badgeRadius ||
    cardRadius.value !== DEFAULTS.cardRadius ||
    menuRadius.value !== DEFAULTS.menuRadius ||
    popoverRadius.value !== DEFAULTS.popoverRadius ||
    dropdownRadius.value !== DEFAULTS.dropdownRadius ||
    dialogRadius.value !== DEFAULTS.dialogRadius ||
    toastRadius.value !== DEFAULTS.toastRadius ||
    cardShadow.value !== DEFAULTS.cardShadow ||
    menuShadow.value !== DEFAULTS.menuShadow ||
    popoverShadow.value !== DEFAULTS.popoverShadow ||
    dropdownShadow.value !== DEFAULTS.dropdownShadow ||
    dialogShadow.value !== DEFAULTS.dialogShadow ||
    toastShadow.value !== DEFAULTS.toastShadow ||
    fontBody.value !== DEFAULTS.fontBody ||
    fontTitle.value !== DEFAULTS.fontTitle ||
    motionScale.value !== DEFAULTS.motionScale ||
    Object.values(paletteOverrides).some((ov) => Object.keys(ov).length > 0) ||
    Object.keys(semanticOverrides).length > 0,
);

// ── applyPreset ───────────────────────────────────────────────
export function applyPreset(preset: (typeof PRESETS)[number]) {
  const v = preset.values as Record<string, string | number | boolean>;
  accent.value = v.accent as string;
  success.value = v.success as string;
  errorColor.value = v.error as string;
  radiusXxs.value = v.radiusXxs as number;
  radiusXs.value = v.radiusXs as number;
  radiusS.value = v.radiusS as number;
  radiusM.value = v.radiusM as number;
  radiusL.value = v.radiusL as number;
  radiusXl.value = v.radiusXl as number;
  spacingXs.value = v.spacingXs as number;
  spacingS.value = v.spacingS as number;
  spacingM.value = v.spacingM as number;
  spacingL.value = v.spacingL as number;
  spacingXl.value = v.spacingXl as number;
  warning.value = v.warning as string;
  info.value = v.info as string;
  buttonRadius.value = v.buttonRadius as string;
  inputRadius.value = v.inputRadius as string;
  fieldPaddingX.value = v.fieldPaddingX as number;
  fieldPaddingXEnabled.value = (v.fieldPaddingX as number) !== DEFAULTS.fieldPaddingX;
  tagRadius.value = v.tagRadius as string;
  badgeRadius.value = v.badgeRadius as string;
  cardRadius.value = v.cardRadius as string;
  menuRadius.value = v.menuRadius as string;
  popoverRadius.value = v.popoverRadius as string;
  dropdownRadius.value = v.dropdownRadius as string;
  dialogRadius.value = v.dialogRadius as string;
  toastRadius.value = v.toastRadius as string;
  cardShadow.value = v.cardShadow as string;
  menuShadow.value = v.menuShadow as string;
  popoverShadow.value = v.popoverShadow as string;
  dropdownShadow.value = v.dropdownShadow as string;
  dialogShadow.value = v.dialogShadow as string;
  toastShadow.value = v.toastShadow as string;
  fontBody.value = v.fontBody as string;
  fontTitle.value = v.fontTitle as string;
  motionScale.value = v.motionScale as number;
  if (!_hideDarkToggle) isDark.value = false;
}

// ── applyTokens ───────────────────────────────────────────────
export function applyTokens() {
  const lines: string[] = [];
  const add = (token: string, val: string) => lines.push(`  ${token}: ${val};`);

  const D = DEFAULTS;
  if (accent.value !== D.accent) add('--coar-accent', accent.value);
  if (success.value !== D.success) add('--coar-success', success.value);
  if (errorColor.value !== D.error) add('--coar-error', errorColor.value);
  if (warning.value !== D.warning) add('--coar-warning', warning.value);
  if (info.value !== D.info) add('--coar-info', info.value);
  if (radiusXxs.value !== D.radiusXxs) add('--coar-radius-xxs', `${radiusXxs.value}px`);
  if (radiusXs.value !== D.radiusXs) add('--coar-radius-xs', `${radiusXs.value}px`);
  if (radiusS.value !== D.radiusS) add('--coar-radius-s', `${radiusS.value}px`);
  if (radiusM.value !== D.radiusM) add('--coar-radius-m', `${radiusM.value}px`);
  if (radiusL.value !== D.radiusL) add('--coar-radius-l', `${radiusL.value}px`);
  if (radiusXl.value !== D.radiusXl) add('--coar-radius-xl', `${radiusXl.value}px`);
  if (spacingXs.value !== D.spacingXs) add('--coar-spacing-xs', `${spacingXs.value}px`);
  if (spacingS.value !== D.spacingS) add('--coar-spacing-s', `${spacingS.value}px`);
  if (spacingM.value !== D.spacingM) add('--coar-spacing-m', `${spacingM.value}px`);
  if (spacingL.value !== D.spacingL) add('--coar-spacing-l', `${spacingL.value}px`);
  if (spacingXl.value !== D.spacingXl) add('--coar-spacing-xl', `${spacingXl.value}px`);
  if (density.value !== D.density) add('--coar-component-density', String(density.value));
  if (fieldPaddingXEnabled.value) add('--coar-field-padding-x', `${fieldPaddingX.value}px`);
  if (buttonRadius.value !== D.buttonRadius) add('--coar-button-radius', buttonRadius.value);
  if (inputRadius.value !== D.inputRadius) add('--coar-input-radius', inputRadius.value);
  if (tagRadius.value !== D.tagRadius) add('--coar-tag-radius', tagRadius.value);
  if (badgeRadius.value !== D.badgeRadius) add('--coar-badge-radius', badgeRadius.value);
  if (cardRadius.value !== D.cardRadius) add('--coar-card-radius', cardRadius.value);
  if (menuRadius.value !== D.menuRadius) add('--coar-menu-radius', menuRadius.value);
  if (popoverRadius.value !== D.popoverRadius) add('--coar-popover-radius', popoverRadius.value);
  if (dropdownRadius.value !== D.dropdownRadius)
    add('--coar-dropdown-radius', dropdownRadius.value);
  if (dialogRadius.value !== D.dialogRadius) add('--coar-dialog-border-radius', dialogRadius.value);
  if (toastRadius.value !== D.toastRadius) add('--coar-toast-border-radius', toastRadius.value);
  if (cardShadow.value !== D.cardShadow) add('--coar-card-shadow', cardShadow.value);
  if (menuShadow.value !== D.menuShadow) add('--coar-menu-shadow', menuShadow.value);
  if (popoverShadow.value !== D.popoverShadow) add('--coar-popover-shadow', popoverShadow.value);
  if (dropdownShadow.value !== D.dropdownShadow)
    add('--coar-dropdown-shadow', dropdownShadow.value);
  if (dialogShadow.value !== D.dialogShadow) add('--coar-dialog-shadow', dialogShadow.value);
  if (toastShadow.value !== D.toastShadow) add('--coar-toast-shadow', toastShadow.value);
  if (fontBody.value !== D.fontBody)
    add('--coar-font-family-body', `${fontBody.value}, ui-sans-serif, system-ui, sans-serif`);
  if (fontTitle.value !== D.fontTitle)
    add('--coar-font-family-title', `${fontTitle.value}, ui-sans-serif, system-ui, sans-serif`);
  if (motionScale.value !== D.motionScale) {
    const s = motionScale.value;
    for (const [key, base] of Object.entries(BASE_DURATIONS)) {
      add(`--coar-duration-${key}`, `${Math.round(base * s)}ms`);
    }
  }
  for (const key of Object.keys(paletteOverrides) as PaletteKey[]) {
    const prefix = PALETTE_CSS_TOKEN[key];
    const baseVar = PALETTE_BASE_VAR[key];
    for (const step of PALETTE_STEPS[key]) {
      if (step.defL === null) continue;
      const ov = paletteOverrides[key][step.step];
      if (ov) add(`${prefix}-${step.step}`, `oklch(from var(${baseVar}) ${ov.l} ${ov.c} h)`);
    }
  }
  for (const group of SEMANTIC_GROUPS) {
    for (const entry of group.entries) {
      const ov = semanticOverrides[entry.token];
      if (ov) {
        const prefix = SEMANTIC_PALETTE_CSS[ov.palette];
        add(entry.token, `var(${prefix}-${ov.step})`);
      }
    }
  }
  if (!_hideDarkToggle) {
    if (isDark.value) document.documentElement.classList.add('dark-mode');
    else document.documentElement.classList.remove('dark-mode');
  }
  let tag = document.getElementById('coar-theme-editor') as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'coar-theme-editor';
    document.head.appendChild(tag);
  }
  tag.textContent = `.coar-theme-editor {\n${lines.join('\n')}\n}`;
  document.documentElement.classList.add('coar-theme-editor');
}

// ── reset ─────────────────────────────────────────────────────
export function reset() {
  applyPreset(PRESETS[0]);
  if (!_hideDarkToggle) {
    isDark.value = false;
    document.documentElement.classList.remove('dark-mode');
  }
  radiusXxs.value = DEFAULTS.radiusXxs;
  radiusXs.value = DEFAULTS.radiusXs;
  radiusS.value = DEFAULTS.radiusS;
  radiusM.value = DEFAULTS.radiusM;
  radiusL.value = DEFAULTS.radiusL;
  radiusXl.value = DEFAULTS.radiusXl;
  spacingXs.value = DEFAULTS.spacingXs;
  spacingS.value = DEFAULTS.spacingS;
  spacingM.value = DEFAULTS.spacingM;
  spacingL.value = DEFAULTS.spacingL;
  spacingXl.value = DEFAULTS.spacingXl;
  density.value = DEFAULTS.density;
  fieldPaddingX.value = DEFAULTS.fieldPaddingX;
  fieldPaddingXEnabled.value = false;
  for (const key of Object.keys(paletteOverrides) as PaletteKey[]) {
    paletteOverrides[key] = {};
  }
  activePalette.value = null;
  for (const group of SEMANTIC_GROUPS) {
    for (const entry of group.entries) {
      delete semanticOverrides[entry.token];
    }
  }
}

// ── downloadCSS ───────────────────────────────────────────────
export function downloadCSS() {
  const name =
    themeName.value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'custom';
  const lines: string[] = [`.coar-theme--${name} {`];
  const add = (token: string, val: string, def: string) => {
    if (val !== def) lines.push(`  ${token}: ${val};`);
  };
  add('--coar-accent', accent.value, DEFAULTS.accent);
  add('--coar-success', success.value, DEFAULTS.success);
  add('--coar-error', errorColor.value, DEFAULTS.error);
  add('--coar-warning', warning.value, DEFAULTS.warning);
  add('--coar-info', info.value, DEFAULTS.info);
  if (radiusXxs.value !== DEFAULTS.radiusXxs)
    lines.push(`  --coar-radius-xxs: ${radiusXxs.value}px;`);
  if (radiusXs.value !== DEFAULTS.radiusXs) lines.push(`  --coar-radius-xs: ${radiusXs.value}px;`);
  if (radiusS.value !== DEFAULTS.radiusS) lines.push(`  --coar-radius-s: ${radiusS.value}px;`);
  if (radiusM.value !== DEFAULTS.radiusM) lines.push(`  --coar-radius-m: ${radiusM.value}px;`);
  if (radiusL.value !== DEFAULTS.radiusL) lines.push(`  --coar-radius-l: ${radiusL.value}px;`);
  if (radiusXl.value !== DEFAULTS.radiusXl) lines.push(`  --coar-radius-xl: ${radiusXl.value}px;`);
  if (spacingXs.value !== DEFAULTS.spacingXs)
    lines.push(`  --coar-spacing-xs: ${spacingXs.value}px;`);
  if (spacingS.value !== DEFAULTS.spacingS) lines.push(`  --coar-spacing-s: ${spacingS.value}px;`);
  if (spacingM.value !== DEFAULTS.spacingM) lines.push(`  --coar-spacing-m: ${spacingM.value}px;`);
  if (spacingL.value !== DEFAULTS.spacingL) lines.push(`  --coar-spacing-l: ${spacingL.value}px;`);
  if (spacingXl.value !== DEFAULTS.spacingXl)
    lines.push(`  --coar-spacing-xl: ${spacingXl.value}px;`);
  if (density.value !== DEFAULTS.density)
    lines.push(`  --coar-component-density: ${density.value};`);
  if (fieldPaddingXEnabled.value) lines.push(`  --coar-field-padding-x: ${fieldPaddingX.value}px;`);
  add('--coar-button-radius', buttonRadius.value, DEFAULTS.buttonRadius);
  add('--coar-input-radius', inputRadius.value, DEFAULTS.inputRadius);
  add('--coar-tag-radius', tagRadius.value, DEFAULTS.tagRadius);
  add('--coar-badge-radius', badgeRadius.value, DEFAULTS.badgeRadius);
  add('--coar-card-radius', cardRadius.value, DEFAULTS.cardRadius);
  add('--coar-menu-radius', menuRadius.value, DEFAULTS.menuRadius);
  add('--coar-popover-radius', popoverRadius.value, DEFAULTS.popoverRadius);
  add('--coar-dropdown-radius', dropdownRadius.value, DEFAULTS.dropdownRadius);
  add('--coar-dialog-border-radius', dialogRadius.value, DEFAULTS.dialogRadius);
  add('--coar-toast-border-radius', toastRadius.value, DEFAULTS.toastRadius);
  add('--coar-card-shadow', cardShadow.value, DEFAULTS.cardShadow);
  add('--coar-menu-shadow', menuShadow.value, DEFAULTS.menuShadow);
  add('--coar-popover-shadow', popoverShadow.value, DEFAULTS.popoverShadow);
  add('--coar-dropdown-shadow', dropdownShadow.value, DEFAULTS.dropdownShadow);
  add('--coar-dialog-shadow', dialogShadow.value, DEFAULTS.dialogShadow);
  add('--coar-toast-shadow', toastShadow.value, DEFAULTS.toastShadow);
  if (fontBody.value !== DEFAULTS.fontBody)
    lines.push(
      `  --coar-font-family-body: ${fontBody.value}, ui-sans-serif, system-ui, sans-serif;`,
    );
  if (fontTitle.value !== DEFAULTS.fontTitle)
    lines.push(
      `  --coar-font-family-title: ${fontTitle.value}, ui-sans-serif, system-ui, sans-serif;`,
    );
  if (motionScale.value !== DEFAULTS.motionScale) {
    for (const [key, base] of Object.entries(BASE_DURATIONS)) {
      lines.push(`  --coar-duration-${key}: ${Math.round(base * motionScale.value)}ms;`);
    }
  }
  for (const key of Object.keys(paletteOverrides) as PaletteKey[]) {
    const prefix = PALETTE_CSS_TOKEN[key];
    const baseVar = PALETTE_BASE_VAR[key];
    for (const step of PALETTE_STEPS[key]) {
      if (step.defL === null) continue;
      const ov = paletteOverrides[key][step.step];
      if (ov)
        lines.push(`  ${prefix}-${step.step}: oklch(from var(${baseVar}) ${ov.l} ${ov.c} h);`);
    }
  }
  for (const [token, override] of Object.entries(semanticOverrides)) {
    const prefix = SEMANTIC_PALETTE_CSS[override.palette as SemanticPalette];
    lines.push(`  ${token}: var(${prefix}-${override.step});`);
  }
  lines.push('}');
  const blob = new Blob([lines.join('\n')], { type: 'text/css' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `coar-theme--${name}.css`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── setSemantic / resetSemantic ───────────────────────────────
export function setSemantic(
  entry: SemanticEntry,
  field: 'palette' | 'step',
  value: string | number,
) {
  const cur = semanticOverrides[entry.token] ?? {
    palette: entry.defaultPalette,
    step: entry.defaultStep,
  };
  semanticOverrides[entry.token] = { ...cur, [field]: value } as SemanticOverride;
}

export function resetSemantic(token: string) {
  delete semanticOverrides[token];
  applyTokens();
}

// ── Watch stop handles ────────────────────────────────────────
type StopHandle = () => void;
let _stopRefsWatch: StopHandle | null = null;
let _stopPaletteWatch: StopHandle | null = null;
let _stopSemanticWatch: StopHandle | null = null;

// ── initThemeEditorState ──────────────────────────────────────
export function initThemeEditorState(hideDarkToggle: boolean) {
  _hideDarkToggle = hideDarkToggle;

  const cs = getComputedStyle(document.documentElement);
  const get = (t: string) => cs.getPropertyValue(t).trim();
  const px = (t: string, def: number) => {
    const v = parseFloat(get(t));
    return isNaN(v) ? def : v;
  };
  const str = (t: string, ref_: Ref<string>) => {
    const v = get(t);
    if (v) ref_.value = v;
  };
  const strOpt = (t: string, ref_: Ref<string>, opts: { value: string }[]) => {
    const v = get(t);
    if (v && opts.some((o) => o.value === v)) ref_.value = v;
  };
  const font1 = (t: string) => get(t).split(',')[0].trim().replace(/['"]/g, '');

  str('--coar-accent', accent);
  str('--coar-success', success);
  str('--coar-error', errorColor);
  str('--coar-warning', warning);
  str('--coar-info', info);

  radiusXxs.value = px('--coar-radius-xxs', DEFAULTS.radiusXxs);
  radiusXs.value = px('--coar-radius-xs', DEFAULTS.radiusXs);
  radiusS.value = px('--coar-radius-s', DEFAULTS.radiusS);
  radiusM.value = px('--coar-radius-m', DEFAULTS.radiusM);
  radiusL.value = px('--coar-radius-l', DEFAULTS.radiusL);
  radiusXl.value = px('--coar-radius-xl', DEFAULTS.radiusXl);

  spacingXs.value = px('--coar-spacing-xs', DEFAULTS.spacingXs);
  spacingS.value = px('--coar-spacing-s', DEFAULTS.spacingS);
  spacingM.value = px('--coar-spacing-m', DEFAULTS.spacingM);
  spacingL.value = px('--coar-spacing-l', DEFAULTS.spacingL);
  spacingXl.value = px('--coar-spacing-xl', DEFAULTS.spacingXl);

  const density_ = parseFloat(get('--coar-component-density'));
  if (!isNaN(density_)) density.value = density_;
  fieldPaddingX.value = px('--coar-field-padding-x', DEFAULTS.fieldPaddingX);
  fieldPaddingXEnabled.value = fieldPaddingX.value !== DEFAULTS.fieldPaddingX;
  strOpt('--coar-button-radius', buttonRadius, RADIUS_OPTIONS);
  strOpt('--coar-input-radius', inputRadius, RADIUS_OPTIONS);
  strOpt('--coar-tag-radius', tagRadius, RADIUS_OPTIONS);
  strOpt('--coar-badge-radius', badgeRadius, RADIUS_OPTIONS);
  strOpt('--coar-card-radius', cardRadius, RADIUS_OPTIONS);
  strOpt('--coar-menu-radius', menuRadius, RADIUS_OPTIONS);
  strOpt('--coar-popover-radius', popoverRadius, RADIUS_OPTIONS);
  strOpt('--coar-dropdown-radius', dropdownRadius, DROPDOWN_RADIUS_OPTIONS);
  strOpt('--coar-dialog-border-radius', dialogRadius, RADIUS_OPTIONS);
  strOpt('--coar-toast-border-radius', toastRadius, RADIUS_OPTIONS);
  strOpt('--coar-card-shadow', cardShadow, SHADOW_OPTIONS);
  strOpt('--coar-menu-shadow', menuShadow, SHADOW_OPTIONS);
  strOpt('--coar-popover-shadow', popoverShadow, SHADOW_OPTIONS);
  strOpt('--coar-dropdown-shadow', dropdownShadow, SHADOW_OPTIONS);
  strOpt('--coar-dialog-shadow', dialogShadow, SHADOW_OPTIONS);
  strOpt('--coar-toast-shadow', toastShadow, SHADOW_OPTIONS);

  const fb = font1('--coar-font-family-body');
  if (fb) fontBody.value = fb;
  const ft = font1('--coar-font-family-title');
  if (ft) fontTitle.value = ft;

  const fast = parseFloat(get('--coar-duration-fast'));
  if (!isNaN(fast) && BASE_DURATIONS.fast > 0) motionScale.value = fast / BASE_DURATIONS.fast;

  if (!hideDarkToggle) isDark.value = document.documentElement.classList.contains('dark-mode');

  // Set up watches
  _stopRefsWatch = watch(
    [
      accent,
      success,
      errorColor,
      warning,
      info,
      radiusXxs,
      radiusXs,
      radiusS,
      radiusM,
      radiusL,
      radiusXl,
      spacingXs,
      spacingS,
      spacingM,
      spacingL,
      spacingXl,
      density,
      fieldPaddingX,
      fieldPaddingXEnabled,
      buttonRadius,
      inputRadius,
      tagRadius,
      badgeRadius,
      cardRadius,
      menuRadius,
      popoverRadius,
      dropdownRadius,
      dialogRadius,
      toastRadius,
      cardShadow,
      menuShadow,
      popoverShadow,
      dropdownShadow,
      dialogShadow,
      toastShadow,
      fontBody,
      fontTitle,
      motionScale,
      isDark,
    ],
    applyTokens,
  );

  _stopPaletteWatch = watch(paletteOverrides, applyTokens, { deep: true });
  _stopSemanticWatch = watch(semanticOverrides, applyTokens, { deep: true });
}

// ── cleanupThemeEditorState ───────────────────────────────────
export function cleanupThemeEditorState() {
  _stopRefsWatch?.();
  _stopPaletteWatch?.();
  _stopSemanticWatch?.();
  _stopRefsWatch = null;
  _stopPaletteWatch = null;
  _stopSemanticWatch = null;

  document.getElementById('coar-theme-editor')?.remove();
  document.documentElement.classList.remove('coar-theme-editor');
}
