import { ref, shallowRef, watch, computed, reactive, type Ref } from 'vue';
import type { StepDef, StepOverride } from './CoarPaletteEditor.vue';
import type { CoarSelectOption } from '../select';
import { COMPACT_THEME } from '../../theme/compact-theme';
import {
  BODY_FAMILY_TOKENS, NESTED_BOUNDARIES, TITLE_FAMILY_TOKENS, serializeRoleTheme, type CoarRoleTheme,
} from '../../theme/role-theme';
import { ROLE_DERIVED_TOKENS } from '../overlay/compact-context';
import { cssFontFamily, fontNotes, removeFontPreviews, setFontPreviewEnabled, showFont } from './font-preview';

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
let _compactTarget: HTMLElement | null = null;

function editorTarget(): HTMLElement {
  return _compactTarget ?? document.documentElement;
}

function applyEditorMode(dark: boolean) {
  const target = editorTarget();
  target.classList.toggle('dark-mode', dark);
  // A local light preview must override a dark document, not just remove a
  // class the local target did not have. The legacy document toggle is unchanged.
  if (_compactTarget) target.classList.toggle('light-mode', !dark);
}

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

export const FONT_OPTIONS_BODY = ['Poppins', 'Inter', 'Onest', 'DM Sans', 'Nunito', 'Geist', 'system-ui'];
export const FONT_OPTIONS_TITLE = ['Inter', 'Poppins', 'Onest', 'DM Sans', 'Nunito', 'Geist', 'system-ui'];

export const DENSITY_OPTIONS = [
  { label: 'Compact', value: 0.75 },
  { label: 'Default', value: 1 },
  { label: 'Comfortable', value: 1.33 },
];

// ── Presets ───────────────────────────────────────────────────
export type ThemeControls = typeof DEFAULTS;

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  /** What the controls show after the preset is loaded. */
  values: ThemeControls;
  /**
   * A preset that is a role theme: its values feed the shared derivation, and every
   * one of them stays editable. Without it a preset is the controls' values alone.
   */
  roleTheme?: CoarRoleTheme;
}

export const PRESETS: ThemePreset[] = [
  {
    id: 'enterprise',
    label: 'Enterprise',
    description: 'Precise, professional — the default Cocoar look.',
    values: { ...DEFAULTS },
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
  {
    id: 'compact',
    label: 'Compact',
    description: 'Smaller text in Inter, Slate surfaces, 36px controls. Preview.',
    values: { ...DEFAULTS, accent: '#334155', fontBody: 'Inter', fontTitle: 'Inter', fieldPaddingX: 10 },
    roleTheme: COMPACT_THEME,
  },
];

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

// ── The controls as one object ────────────────────────────────
const CONTROL_REFS: { [K in keyof ThemeControls]: Ref<ThemeControls[K]> } = {
  accent, success, error: errorColor, warning, info,
  radiusXxs, radiusXs, radiusS, radiusM, radiusL, radiusXl,
  spacingXs, spacingS, spacingM, spacingL, spacingXl,
  density, buttonRadius, inputRadius, fieldPaddingX,
  tagRadius, badgeRadius, cardRadius, menuRadius, popoverRadius, dropdownRadius, dialogRadius, toastRadius,
  cardShadow, menuShadow, popoverShadow, dropdownShadow, dialogShadow, toastShadow,
  fontBody, fontTitle, motionScale,
};
const CONTROL_KEYS = Object.keys(CONTROL_REFS) as (keyof ThemeControls)[];

function readControls(): ThemeControls {
  const values = {} as Record<string, string | number>;
  for (const key of CONTROL_KEYS) values[key] = CONTROL_REFS[key].value;
  return values as unknown as ThemeControls;
}

let writingControls = false;

function writeControls(values: ThemeControls) {
  writingControls = true;
  try {
    for (const key of CONTROL_KEYS) (CONTROL_REFS[key] as Ref<string | number>).value = values[key];
  } finally {
    writingControls = false;
  }
  // Presets and resets restore values; they do not ask a font provider for a preview.
  showFont('body', fontBody.value, false);
  showFont('title', fontTitle.value, false);
}

/**
 * What the loaded preset sets, the value a control's reset returns to. The
 * library defaults until a preset is loaded.
 */
export const baseline = ref<ThemeControls>({ ...DEFAULTS });

/** The role theme the editor loaded (the Compact preset), or none. */
export const roleTheme = shallowRef<CoarRoleTheme | null>(null);

/** Values of the loaded role theme the user changed, by token. */
export const roleOverrides = reactive<Record<string, string>>({});

/** What the app shows without the editor, read when the editor mounts. */
let appControls: ThemeControls = { ...DEFAULTS };
let appFieldPaddingX = false;

function differs(base: ThemeControls): boolean {
  return CONTROL_KEYS.some((key) => key !== 'fieldPaddingX' && CONTROL_REFS[key].value !== base[key]);
}

function hasOverrides(): boolean {
  return (
    Object.values(paletteOverrides).some((ov) => Object.keys(ov).length > 0) ||
    Object.keys(semanticOverrides).length > 0 ||
    Object.keys(roleOverrides).length > 0
  );
}

// ── hasChanges ────────────────────────────────────────────────
/** There is a theme to download: something differs from a fresh app. */
export const hasChanges = computed(
  () => roleTheme.value !== null || differs(DEFAULTS) || fieldPaddingXEnabled.value || hasOverrides(),
);

/** The editor changed what the app shows: there is something to reset. */
export const hasEditorChanges = computed(
  () =>
    roleTheme.value !== null ||
    differs(appControls) ||
    fieldPaddingXEnabled.value !== appFieldPaddingX ||
    (fieldPaddingXEnabled.value && fieldPaddingX.value !== appControls.fieldPaddingX) ||
    hasOverrides(),
);

// ── applyPreset ───────────────────────────────────────────────
export function applyPreset(preset: ThemePreset) {
  const values = preset.values;
  writeControls(values);
  fieldPaddingXEnabled.value = values.fieldPaddingX !== DEFAULTS.fieldPaddingX;
  baseline.value = { ...values };
  for (const token of Object.keys(roleOverrides)) delete roleOverrides[token];
  roleTheme.value = preset.roleTheme ?? null;
  // Light or dark, touch and every other scope stay as the app has them.
  applyTokens();
}

export interface RoleValueEntry {
  token: string;
  label: string;
  /** `pair`: a `light-dark(<light>, <dark>)` colour. */
  kind: 'length' | 'number' | 'pair';
}

/** The values of a role theme the editor offers, by what they change. */
export const ROLE_VALUE_GROUPS: { label: string; entries: RoleValueEntry[] }[] = [
  {
    label: 'Typography',
    entries: [
      { token: '--coar-body-base-size', label: 'Body text', kind: 'length' },
      { token: '--coar-ui-font-size', label: 'Actions and labels', kind: 'length' },
      { token: '--coar-field-font-size', label: 'Field text', kind: 'length' },
      { token: '--coar-caption-font-size', label: 'Captions', kind: 'length' },
      { token: '--coar-ui-font-weight', label: 'Action weight', kind: 'number' },
      { token: '--coar-label-font-weight', label: 'Label weight', kind: 'number' },
    ],
  },
  {
    label: 'Sizes',
    entries: [
      { token: '--coar-component-xs-height', label: 'Control XS', kind: 'length' },
      { token: '--coar-component-s-height', label: 'Control S', kind: 'length' },
      { token: '--coar-component-m-height', label: 'Control M', kind: 'length' },
      { token: '--coar-component-l-height', label: 'Control L', kind: 'length' },
      { token: '--coar-interactive-row-height', label: 'List and menu row', kind: 'length' },
      { token: '--coar-panel-padding', label: 'Panel padding', kind: 'length' },
      { token: '--coar-content-gap', label: 'Content gap', kind: 'length' },
      { token: '--coar-control-radius', label: 'Control radius', kind: 'length' },
      { token: '--coar-panel-radius', label: 'Panel radius', kind: 'length' },
    ],
  },
  {
    label: 'Surfaces and text (light / dark)',
    entries: [
      { token: '--coar-background-neutral-primary', label: 'Surface', kind: 'pair' },
      { token: '--coar-background-neutral-secondary', label: 'Surface, secondary', kind: 'pair' },
      { token: '--coar-background-neutral-tertiary', label: 'Surface, tertiary', kind: 'pair' },
      { token: '--coar-text-neutral-primary', label: 'Text', kind: 'pair' },
      { token: '--coar-text-neutral-secondary', label: 'Text, secondary', kind: 'pair' },
      { token: '--coar-border-neutral-tertiary', label: 'Divider', kind: 'pair' },
      { token: '--coar-border-input', label: 'Field outline', kind: 'pair' },
      { token: '--coar-focus-color', label: 'Focus ring', kind: 'pair' },
    ],
  },
];

/** A value of the loaded role theme, as edited or as the preset has it. */
export function roleValue(token: string): string {
  return roleOverrides[token] ?? roleTheme.value?.tokens[token] ?? '';
}

export function setRoleValue(token: string, value: string) {
  const preset = roleTheme.value?.tokens[token];
  if (value.trim() === '' || value === preset) delete roleOverrides[token];
  else roleOverrides[token] = value;
}

export function resetRoleValue(token: string) {
  delete roleOverrides[token];
}

// ── One list of declarations for live and download ────────────
const FONT_FALLBACK = 'ui-sans-serif, system-ui, sans-serif';
const px = (value: string | number) => `${value}px`;

/** Controls that are one token each, in the order they are written. */
const SCALE_TOKENS: [keyof ThemeControls, string, ((value: string | number) => string)?][] = [
  ['success', '--coar-success'], ['error', '--coar-error'], ['warning', '--coar-warning'], ['info', '--coar-info'],
  ['radiusXxs', '--coar-radius-xxs', px], ['radiusXs', '--coar-radius-xs', px], ['radiusS', '--coar-radius-s', px],
  ['radiusM', '--coar-radius-m', px], ['radiusL', '--coar-radius-l', px], ['radiusXl', '--coar-radius-xl', px],
  ['spacingXs', '--coar-spacing-xs', px], ['spacingS', '--coar-spacing-s', px], ['spacingM', '--coar-spacing-m', px],
  ['spacingL', '--coar-spacing-l', px], ['spacingXl', '--coar-spacing-xl', px],
  ['density', '--coar-component-density', String],
];
const COMPONENT_TOKENS: [keyof ThemeControls, string][] = [
  ['buttonRadius', '--coar-button-radius'], ['inputRadius', '--coar-input-radius'], ['tagRadius', '--coar-tag-radius'],
  ['badgeRadius', '--coar-badge-radius'], ['cardRadius', '--coar-card-radius'], ['menuRadius', '--coar-menu-radius'],
  ['popoverRadius', '--coar-popover-radius'], ['dropdownRadius', '--coar-dropdown-radius'],
  ['dialogRadius', '--coar-dialog-border-radius'], ['toastRadius', '--coar-toast-border-radius'],
  ['cardShadow', '--coar-card-shadow'], ['menuShadow', '--coar-menu-shadow'], ['popoverShadow', '--coar-popover-shadow'],
  ['dropdownShadow', '--coar-dropdown-shadow'], ['dialogShadow', '--coar-dialog-shadow'], ['toastShadow', '--coar-toast-shadow'],
];

/**
 * What the controls set, compared with `base`: the app's own values for the live
 * preview, a fresh app for the download, the preset's values for a role theme
 * (whose own values the serializer writes).
 */
function controlDeclarations(base: ThemeControls, paddingBase: boolean): [string, string][] {
  const out: [string, string][] = [];
  const add = (token: string, value: string) => out.push([token, value]);
  const roles = roleTheme.value !== null;
  const changed = (key: keyof ThemeControls) => CONTROL_REFS[key].value !== base[key];

  if (changed('accent')) {
    // A role theme draws its palette from its own accent; a surrounding
    // CoarThemeScope may still name another one.
    if (roles) add('--coar-theme-accent', accent.value);
    else {
      add('--coar-accent', accent.value);
      if (_compactTarget) add('--coar-appearance-accent', accent.value);
    }
  }
  for (const [key, token, format] of SCALE_TOKENS) {
    if (changed(key)) add(token, (format ?? String)(CONTROL_REFS[key].value));
  }
  if (fieldPaddingXEnabled.value && (!paddingBase || changed('fieldPaddingX'))) {
    add('--coar-field-padding-x', px(fieldPaddingX.value));
  }
  for (const [key, token] of COMPONENT_TOKENS) {
    if (changed(key)) add(token, String(CONTROL_REFS[key].value));
  }
  // A role theme derives every text role from the two families. Without one each role
  // holds its own family, so the font reaches the components only when all are set.
  const family = (role: 'body' | 'title', name: string, tokens: string[]) => {
    const quoted = cssFontFamily(name);
    if (roles) add(tokens[0], `var(--coar-appearance-font-${role}, ${quoted}, ${FONT_FALLBACK})`);
    else for (const token of tokens) add(token, `${quoted}, ${FONT_FALLBACK}`);
  };
  if (changed('fontBody')) family('body', fontBody.value, BODY_FAMILY_TOKENS);
  if (changed('fontTitle')) family('title', fontTitle.value, TITLE_FAMILY_TOKENS);
  if (changed('motionScale')) {
    for (const [key, duration] of Object.entries(BASE_DURATIONS)) {
      add(`--coar-duration-${key}`, `${Math.round(duration * motionScale.value)}ms`);
    }
  }
  for (const key of Object.keys(paletteOverrides) as PaletteKey[]) {
    const prefix = PALETTE_CSS_TOKEN[key];
    const hue = roles && key === 'accent'
      ? 'var(--coar-appearance-accent, var(--coar-theme-accent))'
      : `var(${PALETTE_BASE_VAR[key]})`;
    for (const step of PALETTE_STEPS[key]) {
      if (step.defL === null) continue;
      const ov = paletteOverrides[key][step.step];
      if (ov) add(`${prefix}-${step.step}`, `oklch(from ${hue} ${ov.l} ${ov.c} h)`);
    }
  }
  for (const group of SEMANTIC_GROUPS) {
    for (const entry of group.entries) {
      const ov = semanticOverrides[entry.token];
      if (ov) add(entry.token, `var(${SEMANTIC_PALETTE_CSS[ov.palette]}-${ov.step})`);
    }
  }
  return out;
}

const block = (selectors: string, declarations: [string, string][]) =>
  `${selectors} {\n${declarations.map(([token, value]) => `  ${token}: ${value};`).join('\n')}\n}`;

/** The cascade layer of the library's token stylesheets (styles/all.css). */
const TOKEN_LAYER = 'cocoar.tokens';

/**
 * The theme as CSS for one scope. The live preview and the download are this text
 * with another selector and another comparison base, nothing else.
 */
function themeCss(selector: string, base: ThemeControls, paddingBase: boolean, selectors = selector): string {
  const theme = roleTheme.value;
  if (!theme) {
    const declarations = controlDeclarations(base, paddingBase);
    return declarations.length > 0 ? block(selectors, declarations) : '';
  }
  // A role theme is written whole, with the edited values in place. A changed token
  // that the library derives is repeated on the boundaries inside the scope, where
  // the derivation would otherwise replace it.
  const derived = new Set<string>(ROLE_DERIVED_TOKENS);
  const tokens = { ...theme.tokens };
  const derivedOverrides: [string, string][] = [];
  const edited: [string, string][] = [
    ...controlDeclarations(baseline.value, true),
    ...Object.entries(roleOverrides),
  ];
  for (const [token, value] of edited) {
    if (derived.has(token)) derivedOverrides.push([token, value]);
    else tokens[token] = value;
  }
  let css = serializeRoleTheme(selector, { tokens, mobileTokens: theme.mobileTokens });
  if (derivedOverrides.length > 0) {
    css += `\n${block(`${selector},\n${selector} ${NESTED_BOUNDARIES}`, derivedOverrides)}\n`;
  }
  // In the layer of the library's tokens, where the `.coar-compact` entry is: the theme
  // then meets an application's own styles exactly as that entry does (an app that sets
  // `html { font-size }` or a token itself keeps the last word).
  return `@layer ${TOKEN_LAYER} {\n${css}}\n`;
}

const LIVE_ID = 'coar-theme-editor';

const LIVE_REVISION = '--theme-editor-revision';
let _liveRevision = 0;

function removeLiveTheme() {
  document.getElementById(LIVE_ID)?.remove();
  const target = editorTarget();
  target.classList.remove('coar-theme-editor');
  target.style.removeProperty(LIVE_REVISION);
  if (target.getAttribute('style') === '') target.removeAttribute('style');
}

// ── applyTokens ───────────────────────────────────────────────
export function applyTokens() {
  // Inside a `.coar-compact` area the boundaries of that area take the values too.
  const selectors = _compactTarget
    ? '.coar-theme-editor, .coar-theme-editor .coar-compact, .coar-theme-editor :where(.coar-theme-scope, .coar-mobile, .light-mode, .dark-mode, [data-theme])'
    : '.coar-theme-editor';
  const css = themeCss('.coar-theme-editor', appControls, appFieldPaddingX, selectors);
  if (css === '') {
    removeLiveTheme();
    return;
  }
  let tag = document.getElementById(LIVE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = LIVE_ID;
    document.head.appendChild(tag);
  }
  if (tag.textContent === css) return;
  tag.textContent = css;
  editorTarget().classList.add('coar-theme-editor');
  signalLiveChange();
}

/**
 * A rewritten stylesheet changes no attribute, and attributes are what open overlays
 * and page-wide renderers (Monaco, Mermaid) observe on the ancestors of their scope.
 * The counter is an inline value on the edited scope, so they read the new values.
 */
function signalLiveChange() {
  _liveRevision += 1;
  editorTarget().style.setProperty(LIVE_REVISION, String(_liveRevision));
}

// ── reset ─────────────────────────────────────────────────────
/**
 * Removes what the editor changed, nothing else: the theme the app has without
 * the editor shows again. Light or dark, touch, other scopes and the state of the
 * app are not the editor's to reset.
 */
export function reset() {
  roleTheme.value = null;
  for (const token of Object.keys(roleOverrides)) delete roleOverrides[token];
  for (const key of Object.keys(paletteOverrides) as PaletteKey[]) paletteOverrides[key] = {};
  for (const token of Object.keys(semanticOverrides)) delete semanticOverrides[token];
  activePalette.value = null;
  removeFontPreviews();
  writeControls(appControls);
  fieldPaddingXEnabled.value = appFieldPaddingX;
  baseline.value = { ...appControls };
  applyTokens();
}

// ── downloadCSS ───────────────────────────────────────────────
/**
 * The theme a fresh app needs: every value, not the changes against a loaded preset.
 * It names fonts without containing them, so it starts by saying what to load.
 */
export function themeFileCss(name: string): string {
  const css = themeCss(`.coar-theme--${name}`, DEFAULTS, false) || `.coar-theme--${name} {\n}`;
  const role = roleTheme.value !== null;
  const named = [
    role || fontBody.value !== DEFAULTS.fontBody ? fontBody.value : '',
    (role ? fontTitle.value !== baseline.value.fontTitle : fontTitle.value !== DEFAULTS.fontTitle) ? fontTitle.value : '',
  ];
  return fontNotes(named) + css;
}

export function downloadCSS() {
  const name =
    themeName.value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'custom';
  const blob = new Blob([themeFileCss(name)], { type: 'text/css' });
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
let _stopRoleWatch: StopHandle | null = null;
let _stopFontWatch: StopHandle | null = null;
let _stopModeWatch: StopHandle | null = null;

// ── initThemeEditorState ──────────────────────────────────────
export function initThemeEditorState(
  hideDarkToggle: boolean,
  source?: HTMLElement | null,
  options: { fontPreview?: boolean } = {},
) {
  _hideDarkToggle = hideDarkToggle;
  setFontPreviewEnabled(options.fontPreview !== false);
  _compactTarget = source?.closest<HTMLElement>('.coar-compact') ?? null;

  const cs = getComputedStyle(editorTarget());
  const get = (t: string) => cs.getPropertyValue(t).trim();
  const px = (t: string, def: number) => {
    const v = parseFloat(get(t));
    return isNaN(v) ? def : v;
  };
  const strOpt = (t: string, ref_: Ref<string>, opts: { value: string }[]) => {
    const v = get(t);
    if (v && opts.some((o) => o.value === v)) ref_.value = v;
  };
  const font1 = (t: string) => get(t).split(',')[0].trim().replace(/['"]/g, '');

  const readColor = (role: string, target: Ref<string>) => {
    // A palette step is a derived expression, not the theme's base colour.
    const token = [`--coar-appearance-${role}`, `--coar-theme-${role}`, `--coar-${role}`].find((name) => get(name));
    if (!token) return;
    const raw = get(token);
    if (/^#[\da-f]{6}$/i.test(raw)) {
      target.value = raw;
      return;
    }
    // Native colour inputs need a hex value, including when the base is an
    // expression or light-dark() pair. Resolve it in the source's current scheme.
    const probe = document.createElement('span');
    probe.style.color = `var(${token})`;
    editorTarget().appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    context.fillStyle = resolved;
    context.fillRect(0, 0, 1, 1);
    target.value = `#${Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
      .map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  };
  readColor('accent', accent);
  readColor('success', success);
  readColor('error', errorColor);
  readColor('warning', warning);
  readColor('info', info);

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

  if (!hideDarkToggle) {
    // A nearer light boundary wins over a dark document (and vice versa).
    // The legacy editor still follows its document class exactly as before.
    isDark.value = _compactTarget
      ? cs.colorScheme === 'dark'
      : document.documentElement.classList.contains('dark-mode');
  }

  // What the app shows without the editor: the live preview writes only what
  // differs from it, and "Reset" returns to it.
  appControls = readControls();
  appFieldPaddingX = fieldPaddingXEnabled.value;
  baseline.value = { ...appControls };
  roleTheme.value = null;
  for (const token of Object.keys(roleOverrides)) delete roleOverrides[token];

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
      roleTheme,
    ],
    applyTokens,
  );

  _stopPaletteWatch = watch(paletteOverrides, applyTokens, { deep: true });
  _stopSemanticWatch = watch(semanticOverrides, applyTokens, { deep: true });
  _stopRoleWatch = watch(roleOverrides, applyTokens, { deep: true });
  // Not on mount: a preview is fetched only for a font somebody chose in the editor.
  _stopFontWatch = watch([fontBody, fontTitle], ([body, title], [bodyBefore, titleBefore]) => {
    if (writingControls) return;
    if (body !== bodyBefore) showFont('body', body);
    if (title !== titleBefore) showFont('title', title);
  }, { flush: 'sync' });
  // The mode follows the editor's own toggle only; a change the app makes stays.
  _stopModeWatch = watch(isDark, (dark) => {
    if (!_hideDarkToggle) applyEditorMode(dark);
  });
}

// ── cleanupThemeEditorState ───────────────────────────────────
export function cleanupThemeEditorState() {
  _stopRefsWatch?.();
  _stopPaletteWatch?.();
  _stopSemanticWatch?.();
  _stopRefsWatch = null;
  _stopPaletteWatch = null;
  _stopSemanticWatch = null;
  _stopRoleWatch?.();
  _stopModeWatch?.();
  _stopRoleWatch = null;
  _stopModeWatch = null;

  removeLiveTheme();
  removeFontPreviews();
  _stopFontWatch?.();
  _stopFontWatch = null;
  roleTheme.value = null;
  for (const token of Object.keys(roleOverrides)) delete roleOverrides[token];
  _compactTarget = null;
}
