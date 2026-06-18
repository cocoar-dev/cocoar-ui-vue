<script setup lang="ts">
import { ref, watch, computed, reactive, onMounted, onUnmounted } from 'vue';
import CoarPaletteEditor, { type StepDef, type StepOverride } from './CoarPaletteEditor.vue';

const props = withDefaults(defineProps<{ hideDarkToggle?: boolean }>(), {
  hideDarkToggle: false,
});

// ── State ────────────────────────────────────────────────
const isOpen    = ref(false);
const isDark    = ref(false);
const themeName = ref('custom');

// ── Defaults ─────────────────────────────────────────────
const DEFAULTS = {
  // Brand
  accent:  '#1183CD',
  success: '#1e8f48',
  error:   '#d63b3b',
  warning: '#cc821f',
  info:    '#5e6b84',
  // Radius primitive scale
  radiusXxs: 1,
  radiusXs:  2,
  radiusS:   3,
  radiusM:   4,
  radiusL:   5,
  radiusXl:  6,
  // Spacing primitive scale
  spacingXs:  4,
  spacingS:   8,
  spacingM:   16,
  spacingL:   24,
  spacingXl:  32,
  spacingXxl: 48,
  // Density
  density: 1,
  // Radius per component (CSS token values, not px numbers)
  buttonRadius:    'var(--coar-radius-xs)',
  inputRadius:     'var(--coar-radius-xs)',
  inputPaddingX:   12,
  tagRadius:      'var(--coar-radius-xs)',
  badgeRadius:    'var(--coar-radius-full)',
  cardRadius:     'var(--coar-radius-s)',
  menuRadius:     'var(--coar-radius-s)',
  popoverRadius:  'var(--coar-radius-s)',
  dropdownRadius: 'var(--coar-radius-s)',
  dialogRadius:   'var(--coar-radius-l)',
  toastRadius:    'var(--coar-radius-m)',
  // Shadow per component
  cardShadow:     'var(--coar-elevation-medium)',
  menuShadow:     'var(--coar-shadow-s)',
  popoverShadow:  'var(--coar-shadow-m)',
  dropdownShadow: 'var(--coar-shadow-m)',
  dialogShadow:   'var(--coar-shadow-xl)',
  toastShadow:    'var(--coar-shadow-l)',
  // Typography
  fontBody:  'Poppins',
  fontTitle: 'Inter',
  // Motion
  motionScale: 1,
};

const accent         = ref(DEFAULTS.accent);
const success        = ref(DEFAULTS.success);
const errorColor     = ref(DEFAULTS.error);
const warning        = ref(DEFAULTS.warning);
const info           = ref(DEFAULTS.info);
const radiusXxs      = ref(DEFAULTS.radiusXxs);
const radiusXs       = ref(DEFAULTS.radiusXs);
const radiusS        = ref(DEFAULTS.radiusS);
const radiusM        = ref(DEFAULTS.radiusM);
const radiusL        = ref(DEFAULTS.radiusL);
const radiusXl       = ref(DEFAULTS.radiusXl);
const spacingXs      = ref(DEFAULTS.spacingXs);
const spacingS       = ref(DEFAULTS.spacingS);
const spacingM       = ref(DEFAULTS.spacingM);
const spacingL       = ref(DEFAULTS.spacingL);
const spacingXl      = ref(DEFAULTS.spacingXl);
const spacingXxl     = ref(DEFAULTS.spacingXxl);
const density        = ref(DEFAULTS.density);
const buttonRadius   = ref(DEFAULTS.buttonRadius);
const inputRadius    = ref(DEFAULTS.inputRadius);
const inputPaddingX        = ref(DEFAULTS.inputPaddingX);
const inputPaddingXEnabled = ref(false);
const tagRadius      = ref(DEFAULTS.tagRadius);
const badgeRadius    = ref(DEFAULTS.badgeRadius);
const cardRadius     = ref(DEFAULTS.cardRadius);
const menuRadius     = ref(DEFAULTS.menuRadius);
const popoverRadius  = ref(DEFAULTS.popoverRadius);
const dropdownRadius = ref(DEFAULTS.dropdownRadius);
const dialogRadius   = ref(DEFAULTS.dialogRadius);
const toastRadius    = ref(DEFAULTS.toastRadius);
const cardShadow     = ref(DEFAULTS.cardShadow);
const menuShadow     = ref(DEFAULTS.menuShadow);
const popoverShadow  = ref(DEFAULTS.popoverShadow);
const dropdownShadow = ref(DEFAULTS.dropdownShadow);
const dialogShadow   = ref(DEFAULTS.dialogShadow);
const toastShadow    = ref(DEFAULTS.toastShadow);
const fontBody       = ref(DEFAULTS.fontBody);
const fontTitle      = ref(DEFAULTS.fontTitle);
const motionScale    = ref(DEFAULTS.motionScale);

// ── Radius preset options ─────────────────────────────────
const RADIUS_OPTIONS = [
  { label: 'None', value: '0px' },
  { label: 'XXS',  value: 'var(--coar-radius-xxs)' },
  { label: 'XS',   value: 'var(--coar-radius-xs)' },
  { label: 'S',    value: 'var(--coar-radius-s)' },
  { label: 'M',    value: 'var(--coar-radius-m)' },
  { label: 'L',    value: 'var(--coar-radius-l)' },
  { label: 'XL',   value: 'var(--coar-radius-xl)' },
  { label: 'Full', value: 'var(--coar-radius-full)' },
];

const SHADOW_OPTIONS = [
  { label: 'None',  value: 'none' },
  { label: 'XS',    value: 'var(--coar-shadow-xs)' },
  { label: 'S',     value: 'var(--coar-shadow-s)' },
  { label: 'M',     value: 'var(--coar-shadow-m)' },
  { label: 'L',     value: 'var(--coar-shadow-l)' },
  { label: 'XL',    value: 'var(--coar-shadow-xl)' },
  { label: 'Elev.', value: 'var(--coar-elevation-medium)' },
];

const FONT_OPTIONS_BODY  = ['Poppins', 'Inter', 'DM Sans', 'Nunito', 'Geist', 'system-ui'];
const FONT_OPTIONS_TITLE = ['Inter', 'Poppins', 'DM Sans', 'Nunito', 'Geist', 'system-ui'];

// ── Presets ───────────────────────────────────────────────
const PRESETS = [
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
      buttonRadius:   'var(--coar-radius-m)',
      inputRadius:    'var(--coar-radius-m)',
      tagRadius:      'var(--coar-radius-m)',
      cardRadius:     'var(--coar-radius-l)',
      menuRadius:     'var(--coar-radius-l)',
      popoverRadius:  'var(--coar-radius-l)',
      dropdownRadius: 'var(--coar-radius-l)',
      dialogRadius:   'var(--coar-radius-xl)',
      toastRadius:    'var(--coar-radius-l)',
    },
  },
  {
    id: 'playful',
    label: 'Playful',
    description: 'Pill buttons, vivid accent, very rounded — for consumer apps.',
    values: {
      ...DEFAULTS,
      accent:         '#7C3AED',
      spacingXs:      6,
      spacingS:       12,
      spacingM:       20,
      spacingL:       28,
      inputPaddingX:  20,
      buttonRadius:   'var(--coar-radius-full)',
      inputRadius:    'var(--coar-radius-l)',
      tagRadius:      'var(--coar-radius-full)',
      badgeRadius:    'var(--coar-radius-full)',
      cardRadius:     'var(--coar-radius-xl)',
      menuRadius:     'var(--coar-radius-xl)',
      popoverRadius:  'var(--coar-radius-xl)',
      dropdownRadius: 'var(--coar-radius-xl)',
      dialogRadius:   'var(--coar-radius-xl)',
      toastRadius:    'var(--coar-radius-xl)',
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Sharp corners, no shadows, maximum density.',
    values: {
      ...DEFAULTS,
      radiusXxs: 0, radiusXs: 0, radiusS: 0, radiusM: 0, radiusL: 0, radiusXl: 0,
      cardShadow:     'none',
      menuShadow:     'none',
      popoverShadow:  'none',
      dropdownShadow: 'none',
      toastShadow:    'none',
    },
  },
] as const;

function applyPreset(preset: typeof PRESETS[number]) {
  const v = preset.values as Record<string, string | number | boolean>;
  accent.value         = v.accent as string;
  success.value        = v.success as string;
  errorColor.value     = v.error as string;
  radiusXxs.value      = v.radiusXxs as number;
  radiusXs.value       = v.radiusXs  as number;
  radiusS.value        = v.radiusS   as number;
  radiusM.value        = v.radiusM   as number;
  radiusL.value        = v.radiusL   as number;
  radiusXl.value       = v.radiusXl  as number;
  spacingXs.value      = v.spacingXs  as number;
  spacingS.value       = v.spacingS   as number;
  spacingM.value       = v.spacingM   as number;
  spacingL.value       = v.spacingL   as number;
  spacingXl.value      = v.spacingXl  as number;
  spacingXxl.value     = v.spacingXxl as number;
  warning.value        = v.warning as string;
  info.value           = v.info as string;
  buttonRadius.value   = v.buttonRadius as string;
  inputRadius.value    = v.inputRadius as string;
  inputPaddingX.value        = v.inputPaddingX as number;
  inputPaddingXEnabled.value = (v.inputPaddingX as number) !== DEFAULTS.inputPaddingX;
  tagRadius.value      = v.tagRadius as string;
  badgeRadius.value    = v.badgeRadius as string;
  cardRadius.value     = v.cardRadius as string;
  menuRadius.value     = v.menuRadius as string;
  popoverRadius.value  = v.popoverRadius as string;
  dropdownRadius.value = v.dropdownRadius as string;
  dialogRadius.value   = v.dialogRadius as string;
  toastRadius.value    = v.toastRadius as string;
  cardShadow.value     = v.cardShadow as string;
  menuShadow.value     = v.menuShadow as string;
  popoverShadow.value  = v.popoverShadow as string;
  dropdownShadow.value = v.dropdownShadow as string;
  dialogShadow.value   = v.dialogShadow as string;
  toastShadow.value    = v.toastShadow as string;
  fontBody.value       = v.fontBody as string;
  fontTitle.value      = v.fontTitle as string;
  motionScale.value    = v.motionScale as number;
  if (!props.hideDarkToggle) isDark.value = false;
}

// ── Motion ────────────────────────────────────────────────
const BASE_DURATIONS: Record<string, number> = {
  instant: 0, fast: 100, normal: 200, slow: 400, slowest: 600,
};
const motionLabel = (v: number) =>
  v === 0 ? 'Instant' : v < 0.7 ? 'Fast' : v < 1.3 ? 'Default' : v < 2 ? 'Slow' : 'Very slow';

// ── Apply to DOM ─────────────────────────────────────────
function applyTokens() {
  const lines: string[] = [];
  const add = (token: string, val: string) => lines.push(`  ${token}: ${val};`);

  const D = DEFAULTS;
  // Brand — only write if overridden from default
  if (accent.value     !== D.accent)     add('--coar-accent',  accent.value);
  if (success.value    !== D.success)    add('--coar-success', success.value);
  if (errorColor.value !== D.error)      add('--coar-error',   errorColor.value);
  if (warning.value    !== D.warning)    add('--coar-warning', warning.value);
  if (info.value       !== D.info)       add('--coar-info',    info.value);
  // Radius scale
  if (radiusXxs.value !== D.radiusXxs) add('--coar-radius-xxs', `${radiusXxs.value}px`);
  if (radiusXs.value  !== D.radiusXs)  add('--coar-radius-xs',  `${radiusXs.value}px`);
  if (radiusS.value   !== D.radiusS)   add('--coar-radius-s',   `${radiusS.value}px`);
  if (radiusM.value   !== D.radiusM)   add('--coar-radius-m',   `${radiusM.value}px`);
  if (radiusL.value   !== D.radiusL)   add('--coar-radius-l',   `${radiusL.value}px`);
  if (radiusXl.value  !== D.radiusXl)  add('--coar-radius-xl',  `${radiusXl.value}px`);
  // Spacing scale
  if (spacingXs.value  !== D.spacingXs)  add('--coar-spacing-xs',  `${spacingXs.value}px`);
  if (spacingS.value   !== D.spacingS)   add('--coar-spacing-s',   `${spacingS.value}px`);
  if (spacingM.value   !== D.spacingM)   add('--coar-spacing-m',   `${spacingM.value}px`);
  if (spacingL.value   !== D.spacingL)   add('--coar-spacing-l',   `${spacingL.value}px`);
  if (spacingXl.value  !== D.spacingXl)  add('--coar-spacing-xl',  `${spacingXl.value}px`);
  if (spacingXxl.value !== D.spacingXxl) add('--coar-spacing-xxl', `${spacingXxl.value}px`);
  // Component tokens
  if (density.value !== D.density) add('--coar-component-density', String(density.value));
  if (inputPaddingXEnabled.value)  add('--coar-input-padding-x',   `${inputPaddingX.value}px`);
  if (buttonRadius.value   !== D.buttonRadius)   add('--coar-button-radius',        buttonRadius.value);
  if (inputRadius.value    !== D.inputRadius)    add('--coar-input-radius',         inputRadius.value);
  if (tagRadius.value      !== D.tagRadius)      add('--coar-tag-radius',           tagRadius.value);
  if (badgeRadius.value    !== D.badgeRadius)    add('--coar-badge-radius',         badgeRadius.value);
  if (cardRadius.value     !== D.cardRadius)     add('--coar-card-radius',          cardRadius.value);
  if (menuRadius.value     !== D.menuRadius)     add('--coar-menu-radius',          menuRadius.value);
  if (popoverRadius.value  !== D.popoverRadius)  add('--coar-popover-radius',       popoverRadius.value);
  if (dropdownRadius.value !== D.dropdownRadius) add('--coar-dropdown-radius',      dropdownRadius.value);
  if (dialogRadius.value   !== D.dialogRadius)   add('--coar-dialog-border-radius', dialogRadius.value);
  if (toastRadius.value    !== D.toastRadius)    add('--coar-toast-border-radius',  toastRadius.value);
  if (cardShadow.value     !== D.cardShadow)     add('--coar-card-shadow',          cardShadow.value);
  if (menuShadow.value     !== D.menuShadow)     add('--coar-menu-shadow',          menuShadow.value);
  if (popoverShadow.value  !== D.popoverShadow)  add('--coar-popover-shadow',       popoverShadow.value);
  if (dropdownShadow.value !== D.dropdownShadow) add('--coar-dropdown-shadow',      dropdownShadow.value);
  if (dialogShadow.value   !== D.dialogShadow)   add('--coar-dialog-shadow',        dialogShadow.value);
  if (toastShadow.value    !== D.toastShadow)    add('--coar-toast-shadow',         toastShadow.value);
  if (fontBody.value  !== D.fontBody)  add('--coar-font-family-body',  `${fontBody.value}, ui-sans-serif, system-ui, sans-serif`);
  if (fontTitle.value !== D.fontTitle) add('--coar-font-family-title', `${fontTitle.value}, ui-sans-serif, system-ui, sans-serif`);
  if (motionScale.value !== D.motionScale) {
    const s = motionScale.value;
    for (const [key, base] of Object.entries(BASE_DURATIONS)) {
      add(`--coar-duration-${key}`, `${Math.round(base * s)}ms`);
    }
  }
  // Palette step overrides
  for (const key of Object.keys(paletteOverrides) as PaletteKey[]) {
    const prefix  = PALETTE_CSS_TOKEN[key];
    const baseVar = PALETTE_BASE_VAR[key];
    for (const step of PALETTE_STEPS[key]) {
      if (step.defL === null) continue;
      const ov = paletteOverrides[key][step.step];
      if (ov) add(`${prefix}-${step.step}`, `oklch(from var(${baseVar}) ${ov.l} ${ov.c} h)`);
    }
  }
  // Semantic overrides
  for (const group of SEMANTIC_GROUPS) {
    for (const entry of group.entries) {
      const ov = semanticOverrides[entry.token];
      if (ov) {
        const prefix = SEMANTIC_PALETTE_CSS[ov.palette];
        add(entry.token, `var(${prefix}-${ov.step})`);
      }
    }
  }
  // Dark mode
  if (!props.hideDarkToggle) {
    if (isDark.value) document.documentElement.classList.add('dark-mode');
    else              document.documentElement.classList.remove('dark-mode');
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

onMounted(() => {
  const cs   = getComputedStyle(document.documentElement);
  const get  = (t: string) => cs.getPropertyValue(t).trim();
  const px   = (t: string, def: number) => { const v = parseFloat(get(t)); return isNaN(v) ? def : v; };
  const str  = (t: string, ref_: typeof accent) => { const v = get(t); if (v) ref_.value = v; };
  // Only restore if the stored value is a recognised option (guards against stale concrete-px values from old sessions)
  const strOpt = (t: string, ref_: Ref<string>, opts: { value: string }[]) => { const v = get(t); if (v && opts.some(o => o.value === v)) ref_.value = v; };
  const font1 = (t: string) => get(t).split(',')[0].trim().replace(/['"]/g, '');

  str('--coar-accent',  accent);
  str('--coar-success', success);
  str('--coar-error',   errorColor);
  str('--coar-warning', warning);
  str('--coar-info',    info);

  radiusXxs.value = px('--coar-radius-xxs', DEFAULTS.radiusXxs);
  radiusXs.value  = px('--coar-radius-xs',  DEFAULTS.radiusXs);
  radiusS.value   = px('--coar-radius-s',   DEFAULTS.radiusS);
  radiusM.value   = px('--coar-radius-m',   DEFAULTS.radiusM);
  radiusL.value   = px('--coar-radius-l',   DEFAULTS.radiusL);
  radiusXl.value  = px('--coar-radius-xl',  DEFAULTS.radiusXl);

  spacingXs.value  = px('--coar-spacing-xs',  DEFAULTS.spacingXs);
  spacingS.value   = px('--coar-spacing-s',   DEFAULTS.spacingS);
  spacingM.value   = px('--coar-spacing-m',   DEFAULTS.spacingM);
  spacingL.value   = px('--coar-spacing-l',   DEFAULTS.spacingL);
  spacingXl.value  = px('--coar-spacing-xl',  DEFAULTS.spacingXl);
  spacingXxl.value = px('--coar-spacing-xxl', DEFAULTS.spacingXxl);

  const density_ = parseFloat(get('--coar-component-density'));
  if (!isNaN(density_)) density.value = density_;
  inputPaddingX.value = px('--coar-input-padding-x', DEFAULTS.inputPaddingX);
  inputPaddingXEnabled.value = inputPaddingX.value !== DEFAULTS.inputPaddingX;
  strOpt('--coar-button-radius',        buttonRadius,   RADIUS_OPTIONS);
  strOpt('--coar-input-radius',         inputRadius,    RADIUS_OPTIONS);
  strOpt('--coar-tag-radius',           tagRadius,      RADIUS_OPTIONS);
  strOpt('--coar-badge-radius',         badgeRadius,    RADIUS_OPTIONS);
  strOpt('--coar-card-radius',          cardRadius,     RADIUS_OPTIONS);
  strOpt('--coar-menu-radius',          menuRadius,     RADIUS_OPTIONS);
  strOpt('--coar-popover-radius',       popoverRadius,  RADIUS_OPTIONS);
  strOpt('--coar-dropdown-radius',      dropdownRadius, RADIUS_OPTIONS);
  strOpt('--coar-dialog-border-radius', dialogRadius,   RADIUS_OPTIONS);
  strOpt('--coar-toast-border-radius',  toastRadius,    RADIUS_OPTIONS);
  strOpt('--coar-card-shadow',          cardShadow,     SHADOW_OPTIONS);
  strOpt('--coar-menu-shadow',          menuShadow,     SHADOW_OPTIONS);
  strOpt('--coar-popover-shadow',       popoverShadow,  SHADOW_OPTIONS);
  strOpt('--coar-dropdown-shadow',      dropdownShadow, SHADOW_OPTIONS);
  strOpt('--coar-dialog-shadow',        dialogShadow,   SHADOW_OPTIONS);
  strOpt('--coar-toast-shadow',         toastShadow,    SHADOW_OPTIONS);

  const fb = font1('--coar-font-family-body');
  if (fb) fontBody.value = fb;
  const ft = font1('--coar-font-family-title');
  if (ft) fontTitle.value = ft;

  const fast = parseFloat(get('--coar-duration-fast'));
  if (!isNaN(fast) && BASE_DURATIONS.fast > 0) motionScale.value = fast / BASE_DURATIONS.fast;

  if (!props.hideDarkToggle) isDark.value = document.documentElement.classList.contains('dark-mode');
});

onUnmounted(() => {
  document.getElementById('coar-theme-editor')?.remove();
  document.documentElement.classList.remove('coar-theme-editor');
});

watch(
  [accent, success, errorColor, warning, info,
   radiusXxs, radiusXs, radiusS, radiusM, radiusL, radiusXl,
   spacingXs, spacingS, spacingM, spacingL, spacingXl, spacingXxl,
   density, inputPaddingX, inputPaddingXEnabled,
   buttonRadius, inputRadius, tagRadius, badgeRadius, cardRadius,
   menuRadius, popoverRadius, dropdownRadius, dialogRadius, toastRadius,
   cardShadow, menuShadow, popoverShadow, dropdownShadow, dialogShadow, toastShadow,
   fontBody, fontTitle, motionScale, isDark],
  applyTokens,
);

function reset() {
  applyPreset(PRESETS[0]);
  if (!props.hideDarkToggle) {
    isDark.value = false;
    document.documentElement.classList.remove('dark-mode');
  }
  radiusXxs.value  = DEFAULTS.radiusXxs;
  radiusXs.value   = DEFAULTS.radiusXs;
  radiusS.value    = DEFAULTS.radiusS;
  radiusM.value    = DEFAULTS.radiusM;
  radiusL.value    = DEFAULTS.radiusL;
  radiusXl.value   = DEFAULTS.radiusXl;
  spacingXs.value  = DEFAULTS.spacingXs;
  spacingS.value   = DEFAULTS.spacingS;
  spacingM.value   = DEFAULTS.spacingM;
  spacingL.value   = DEFAULTS.spacingL;
  spacingXl.value  = DEFAULTS.spacingXl;
  spacingXxl.value = DEFAULTS.spacingXxl;
  density.value       = DEFAULTS.density;
  inputPaddingX.value        = DEFAULTS.inputPaddingX;
  inputPaddingXEnabled.value = false;
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

const hasChanges = computed(() =>
  accent.value         !== DEFAULTS.accent         ||
  success.value        !== DEFAULTS.success        ||
  errorColor.value     !== DEFAULTS.error          ||
  warning.value        !== DEFAULTS.warning        ||
  info.value           !== DEFAULTS.info           ||
  radiusXxs.value      !== DEFAULTS.radiusXxs      ||
  radiusXs.value       !== DEFAULTS.radiusXs       ||
  radiusS.value        !== DEFAULTS.radiusS        ||
  radiusM.value        !== DEFAULTS.radiusM        ||
  radiusL.value        !== DEFAULTS.radiusL        ||
  radiusXl.value       !== DEFAULTS.radiusXl       ||
  spacingXs.value      !== DEFAULTS.spacingXs      ||
  spacingS.value       !== DEFAULTS.spacingS       ||
  spacingM.value       !== DEFAULTS.spacingM       ||
  spacingL.value       !== DEFAULTS.spacingL       ||
  spacingXl.value      !== DEFAULTS.spacingXl      ||
  spacingXxl.value     !== DEFAULTS.spacingXxl     ||
  density.value        !== DEFAULTS.density        ||
  inputPaddingXEnabled.value                        ||
  buttonRadius.value   !== DEFAULTS.buttonRadius   ||
  inputRadius.value    !== DEFAULTS.inputRadius    ||
  tagRadius.value      !== DEFAULTS.tagRadius      ||
  badgeRadius.value    !== DEFAULTS.badgeRadius    ||
  cardRadius.value     !== DEFAULTS.cardRadius     ||
  menuRadius.value     !== DEFAULTS.menuRadius     ||
  popoverRadius.value  !== DEFAULTS.popoverRadius  ||
  dropdownRadius.value !== DEFAULTS.dropdownRadius ||
  dialogRadius.value   !== DEFAULTS.dialogRadius   ||
  toastRadius.value    !== DEFAULTS.toastRadius    ||
  cardShadow.value     !== DEFAULTS.cardShadow     ||
  menuShadow.value     !== DEFAULTS.menuShadow     ||
  popoverShadow.value  !== DEFAULTS.popoverShadow  ||
  dropdownShadow.value !== DEFAULTS.dropdownShadow ||
  dialogShadow.value   !== DEFAULTS.dialogShadow   ||
  toastShadow.value    !== DEFAULTS.toastShadow    ||
  fontBody.value       !== DEFAULTS.fontBody       ||
  fontTitle.value      !== DEFAULTS.fontTitle      ||
  motionScale.value    !== DEFAULTS.motionScale    ||
  Object.values(paletteOverrides).some(ov => Object.keys(ov).length > 0) ||
  Object.keys(semanticOverrides).length > 0,
);

function downloadCSS() {
  const name = themeName.value.trim().toLowerCase()
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'custom';
  const lines: string[] = [`.coar-theme--${name} {`];
  const add = (token: string, val: string, def: string) => {
    if (val !== def) lines.push(`  ${token}: ${val};`);
  };
  add('--coar-accent',  accent.value,     DEFAULTS.accent);
  add('--coar-success', success.value,    DEFAULTS.success);
  add('--coar-error',   errorColor.value, DEFAULTS.error);
  add('--coar-warning', warning.value,    DEFAULTS.warning);
  add('--coar-info',    info.value,       DEFAULTS.info);
  if (radiusXxs.value !== DEFAULTS.radiusXxs) lines.push(`  --coar-radius-xxs: ${radiusXxs.value}px;`);
  if (radiusXs.value  !== DEFAULTS.radiusXs)  lines.push(`  --coar-radius-xs: ${radiusXs.value}px;`);
  if (radiusS.value   !== DEFAULTS.radiusS)   lines.push(`  --coar-radius-s: ${radiusS.value}px;`);
  if (radiusM.value   !== DEFAULTS.radiusM)   lines.push(`  --coar-radius-m: ${radiusM.value}px;`);
  if (radiusL.value   !== DEFAULTS.radiusL)   lines.push(`  --coar-radius-l: ${radiusL.value}px;`);
  if (radiusXl.value  !== DEFAULTS.radiusXl)  lines.push(`  --coar-radius-xl: ${radiusXl.value}px;`);
  if (spacingXs.value  !== DEFAULTS.spacingXs)  lines.push(`  --coar-spacing-xs: ${spacingXs.value}px;`);
  if (spacingS.value   !== DEFAULTS.spacingS)   lines.push(`  --coar-spacing-s: ${spacingS.value}px;`);
  if (spacingM.value   !== DEFAULTS.spacingM)   lines.push(`  --coar-spacing-m: ${spacingM.value}px;`);
  if (spacingL.value   !== DEFAULTS.spacingL)   lines.push(`  --coar-spacing-l: ${spacingL.value}px;`);
  if (spacingXl.value  !== DEFAULTS.spacingXl)  lines.push(`  --coar-spacing-xl: ${spacingXl.value}px;`);
  if (spacingXxl.value !== DEFAULTS.spacingXxl) lines.push(`  --coar-spacing-xxl: ${spacingXxl.value}px;`);
  if (density.value !== DEFAULTS.density)
    lines.push(`  --coar-component-density: ${density.value};`);
  if (inputPaddingXEnabled.value)
    lines.push(`  --coar-input-padding-x: ${inputPaddingX.value}px;`);
  add('--coar-button-radius',        buttonRadius.value,   DEFAULTS.buttonRadius);
  add('--coar-input-radius',         inputRadius.value,    DEFAULTS.inputRadius);
  add('--coar-tag-radius',           tagRadius.value,      DEFAULTS.tagRadius);
  add('--coar-badge-radius',         badgeRadius.value,    DEFAULTS.badgeRadius);
  add('--coar-card-radius',          cardRadius.value,     DEFAULTS.cardRadius);
  add('--coar-menu-radius',          menuRadius.value,     DEFAULTS.menuRadius);
  add('--coar-popover-radius',       popoverRadius.value,  DEFAULTS.popoverRadius);
  add('--coar-dropdown-radius',      dropdownRadius.value, DEFAULTS.dropdownRadius);
  add('--coar-dialog-border-radius', dialogRadius.value,   DEFAULTS.dialogRadius);
  add('--coar-toast-border-radius',  toastRadius.value,    DEFAULTS.toastRadius);
  add('--coar-card-shadow',          cardShadow.value,     DEFAULTS.cardShadow);
  add('--coar-menu-shadow',          menuShadow.value,     DEFAULTS.menuShadow);
  add('--coar-popover-shadow',       popoverShadow.value,  DEFAULTS.popoverShadow);
  add('--coar-dropdown-shadow',      dropdownShadow.value, DEFAULTS.dropdownShadow);
  add('--coar-dialog-shadow',        dialogShadow.value,   DEFAULTS.dialogShadow);
  add('--coar-toast-shadow',         toastShadow.value,    DEFAULTS.toastShadow);
  if (fontBody.value !== DEFAULTS.fontBody)
    lines.push(`  --coar-font-family-body: ${fontBody.value}, ui-sans-serif, system-ui, sans-serif;`);
  if (fontTitle.value !== DEFAULTS.fontTitle)
    lines.push(`  --coar-font-family-title: ${fontTitle.value}, ui-sans-serif, system-ui, sans-serif;`);
  if (motionScale.value !== DEFAULTS.motionScale) {
    for (const [key, base] of Object.entries(BASE_DURATIONS)) {
      lines.push(`  --coar-duration-${key}: ${Math.round(base * motionScale.value)}ms;`);
    }
  }
  for (const key of Object.keys(paletteOverrides) as PaletteKey[]) {
    const prefix  = PALETTE_CSS_TOKEN[key];
    const baseVar = PALETTE_BASE_VAR[key];
    for (const step of PALETTE_STEPS[key]) {
      if (step.defL === null) continue;
      const ov = paletteOverrides[key][step.step];
      if (ov) lines.push(`  ${prefix}-${step.step}: oklch(from var(${baseVar}) ${ov.l} ${ov.c} h);`);
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

// ── Palette editor ────────────────────────────────────────────
type PaletteKey = 'accent' | 'error' | 'success' | 'warning' | 'info';

const activePalette = ref<PaletteKey | null>(null);

const paletteOverrides = reactive<Record<PaletteKey, Record<number, StepOverride>>>({
  accent: {}, error: {}, success: {}, warning: {}, info: {},
});
watch(paletteOverrides, applyTokens, { deep: true });

const PALETTE_CSS_TOKEN: Record<PaletteKey, string> = {
  accent:  '--coar-color-accent',
  error:   '--coar-color-red',
  success: '--coar-color-green',
  warning: '--coar-color-amber',
  info:    '--coar-color-slate',
};

const PALETTE_BASE_VAR: Record<PaletteKey, string> = {
  accent:  '--coar-accent',
  error:   '--coar-error',
  success: '--coar-success',
  warning: '--coar-warning',
  info:    '--coar-info',
};

const PALETTE_STEPS: Record<PaletteKey, StepDef[]> = {
  accent: [
    { step:  50, defL: 0.97,  defC: 0.012  },
    { step: 100, defL: 0.92,  defC: 0.035  },
    { step: 200, defL: 0.84,  defC: 0.075  },
    { step: 300, defL: 0.74,  defC: 0.115  },
    { step: 400, defL: 0.66,  defC: 0.145  },
    { step: 500, defL: null,  defC: null   },
    { step: 600, defL: 0.53,  defC: 0.15   },
    { step: 700, defL: 0.47,  defC: 0.14   },
    { step: 800, defL: 0.39,  defC: 0.12   },
    { step: 900, defL: 0.31,  defC: 0.095  },
  ],
  error: [
    { step:  50, defL: 0.97,  defC: 0.012  },
    { step: 100, defL: 0.92,  defC: 0.035  },
    { step: 200, defL: 0.84,  defC: 0.07   },
    { step: 300, defL: 0.74,  defC: 0.11   },
    { step: 400, defL: 0.66,  defC: 0.145  },
    { step: 500, defL: null,  defC: null   },
    { step: 600, defL: 0.47,  defC: 0.13   },
    { step: 700, defL: 0.40,  defC: 0.11   },
    { step: 800, defL: 0.33,  defC: 0.09   },
    { step: 900, defL: 0.26,  defC: 0.07   },
  ],
  success: [
    { step:  50, defL: 0.97,  defC: 0.012  },
    { step: 100, defL: 0.92,  defC: 0.035  },
    { step: 200, defL: 0.84,  defC: 0.065  },
    { step: 300, defL: 0.74,  defC: 0.10   },
    { step: 400, defL: 0.66,  defC: 0.13   },
    { step: 500, defL: null,  defC: null   },
    { step: 600, defL: 0.47,  defC: 0.12   },
    { step: 700, defL: 0.40,  defC: 0.10   },
    { step: 800, defL: 0.33,  defC: 0.08   },
    { step: 900, defL: 0.26,  defC: 0.06   },
  ],
  warning: [
    { step:  50, defL: 0.97,  defC: 0.015  },
    { step: 100, defL: 0.92,  defC: 0.04   },
    { step: 200, defL: 0.86,  defC: 0.08   },
    { step: 300, defL: 0.78,  defC: 0.12   },
    { step: 400, defL: 0.72,  defC: 0.14   },
    { step: 500, defL: null,  defC: null   },
    { step: 600, defL: 0.50,  defC: 0.12   },
    { step: 700, defL: 0.43,  defC: 0.10   },
    { step: 800, defL: 0.36,  defC: 0.08   },
    { step: 900, defL: 0.29,  defC: 0.06   },
  ],
  info: [
    { step:  50, defL: 0.97,  defC: 0.006  },
    { step: 100, defL: 0.92,  defC: 0.012  },
    { step: 200, defL: 0.84,  defC: 0.02   },
    { step: 300, defL: 0.74,  defC: 0.03   },
    { step: 400, defL: 0.66,  defC: 0.035  },
    { step: 500, defL: null,  defC: null   },
    { step: 600, defL: 0.47,  defC: 0.03   },
    { step: 700, defL: 0.40,  defC: 0.025  },
    { step: 800, defL: 0.35,  defC: 0.02   },
    { step: 900, defL: 0.30,  defC: 0.02   },
  ],
};

// ── Semantic layer ────────────────────────────────────────────
type SemanticPalette = 'accent' | 'red' | 'green' | 'amber' | 'slate';
interface SemanticEntry { token: string; label: string; defaultPalette: SemanticPalette; defaultStep: number; }
interface SemanticGroup { label: string; entries: SemanticEntry[]; }
interface SemanticOverride { palette: SemanticPalette; step: number; }

const SEMANTIC_PALETTE_CSS: Record<SemanticPalette, string> = {
  accent: '--coar-color-accent',
  red:    '--coar-color-red',
  green:  '--coar-color-green',
  amber:  '--coar-color-amber',
  slate:  '--coar-color-slate',
};

const SEMANTIC_PALETTE_LABELS: Record<SemanticPalette, string> = {
  accent: 'Accent', red: 'Red', green: 'Green', amber: 'Amber', slate: 'Slate',
};

const SEMANTIC_PALETTES: SemanticPalette[] = ['accent', 'red', 'green', 'amber', 'slate'];
const SEMANTIC_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

const SEMANTIC_GROUPS: SemanticGroup[] = [
  {
    label: 'Accent',
    entries: [
      { token: '--coar-background-accent-primary',   label: 'Primary background',   defaultPalette: 'accent', defaultStep: 500 },
      { token: '--coar-background-accent-hover',     label: 'Hover background',     defaultPalette: 'accent', defaultStep: 600 },
      { token: '--coar-background-accent-active',    label: 'Active background',    defaultPalette: 'accent', defaultStep: 700 },
      { token: '--coar-background-accent-secondary', label: 'Secondary background', defaultPalette: 'accent', defaultStep: 100 },
      { token: '--coar-text-accent-primary',         label: 'Primary text',         defaultPalette: 'accent', defaultStep: 600 },
      { token: '--coar-border-accent-primary',       label: 'Primary border',       defaultPalette: 'accent', defaultStep: 500 },
    ],
  },
  {
    label: 'Error',
    entries: [
      { token: '--coar-background-semantic-error-bold',   label: 'Bold background',   defaultPalette: 'red', defaultStep: 600 },
      { token: '--coar-background-semantic-error-hover',  label: 'Hover background',  defaultPalette: 'red', defaultStep: 700 },
      { token: '--coar-background-semantic-error-active', label: 'Active background', defaultPalette: 'red', defaultStep: 800 },
      { token: '--coar-background-semantic-error-subtle', label: 'Subtle background', defaultPalette: 'red', defaultStep: 100 },
      { token: '--coar-border-semantic-error-bold',       label: 'Bold border',       defaultPalette: 'red', defaultStep: 800 },
      { token: '--coar-border-semantic-error',            label: 'Border',            defaultPalette: 'red', defaultStep: 600 },
    ],
  },
  {
    label: 'Success',
    entries: [
      { token: '--coar-background-semantic-success-bold',   label: 'Bold background',   defaultPalette: 'green', defaultStep: 600 },
      { token: '--coar-background-semantic-success-subtle', label: 'Subtle background', defaultPalette: 'green', defaultStep: 100 },
      { token: '--coar-border-semantic-success-bold',       label: 'Bold border',       defaultPalette: 'green', defaultStep: 800 },
      { token: '--coar-text-semantic-success-bold',         label: 'Bold text',         defaultPalette: 'green', defaultStep: 800 },
    ],
  },
  {
    label: 'Warning',
    entries: [
      { token: '--coar-background-semantic-warning-bold',   label: 'Bold background',   defaultPalette: 'amber', defaultStep: 600 },
      { token: '--coar-background-semantic-warning-subtle', label: 'Subtle background', defaultPalette: 'amber', defaultStep: 100 },
      { token: '--coar-border-semantic-warning-bold',       label: 'Bold border',       defaultPalette: 'amber', defaultStep: 900 },
      { token: '--coar-text-semantic-warning-bold',         label: 'Bold text',         defaultPalette: 'amber', defaultStep: 900 },
    ],
  },
  {
    label: 'Info',
    entries: [
      { token: '--coar-background-semantic-info-bold',   label: 'Bold background',   defaultPalette: 'slate', defaultStep: 700 },
      { token: '--coar-background-semantic-info-subtle', label: 'Subtle background', defaultPalette: 'slate', defaultStep: 100 },
      { token: '--coar-border-semantic-info-bold',       label: 'Bold border',       defaultPalette: 'slate', defaultStep: 900 },
    ],
  },
];

const semanticOverrides = reactive<Record<string, SemanticOverride>>({});
watch(semanticOverrides, applyTokens, { deep: true });

function setSemantic(entry: SemanticEntry, field: 'palette' | 'step', value: string | number) {
  const cur = semanticOverrides[entry.token] ?? { palette: entry.defaultPalette, step: entry.defaultStep };
  semanticOverrides[entry.token] = { ...cur, [field]: value } as SemanticOverride;
}

function resetSemantic(token: string) {
  delete semanticOverrides[token];
  applyTokens();
}

const DENSITY_OPTIONS = [
  { label: 'Compact',     value: 0.75 },
  { label: 'Default',     value: 1    },
  { label: 'Comfortable', value: 1.33 },
];
</script>

<template>
  <Teleport to="body">
    <!-- FAB -->
    <button
      class="te-fab"
      :class="{ 'te-fab--open': isOpen }"
      :title="isOpen ? 'Close theme editor' : 'Open theme editor'"
      @click="isOpen = !isOpen"
    >
      <svg v-if="!isOpen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/>
        <circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    </button>

    <!-- Panel -->
    <Transition name="te-slide">
      <aside v-if="isOpen" class="te-panel">

        <!-- Header -->
        <header class="te-header">
          <svg class="te-header-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/>
            <circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
          </svg>
          <span class="te-header-title">Theme Editor</span>
          <div class="te-header-actions">
            <button v-if="hasChanges" class="te-icon-btn te-icon-btn--labeled" @click="reset" title="Reset all changes">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>
            <button class="te-icon-btn" @click="isOpen = false" title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </header>

        <!-- Scrollable body -->
        <div class="te-body">

          <!-- Presets — always visible -->
          <div class="te-presets-section">
            <div class="te-section-label">Presets</div>
            <div class="te-preset-grid">
              <button
                v-for="preset in PRESETS"
                :key="preset.id"
                class="te-preset-card"
                @click="applyPreset(preset)"
              >
                <span class="te-preset-name">{{ preset.label }}</span>
                <span class="te-preset-desc">{{ preset.description }}</span>
              </button>
            </div>
          </div>

          <!-- Brand -->
          <details class="te-accordion" open>
            <summary class="te-acc-summary">
              <span class="te-acc-title">Brand</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">

              <div v-if="!hideDarkToggle" class="te-section">
                <div class="te-section-label">Appearance</div>
                <div class="te-seg">
                  <button class="te-seg-btn" :class="{ 'te-seg-btn--active': !isDark }" @click="isDark = false">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                    Light
                  </button>
                  <button class="te-seg-btn" :class="{ 'te-seg-btn--active': isDark }" @click="isDark = true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                    Dark
                  </button>
                </div>
              </div>

              <div class="te-section">
                <div class="te-section-label">Brand color</div>
                <div class="te-color-row">
                  <input type="color" class="te-color-swatch" v-model="accent" />
                  <span class="te-color-name">Accent</span>
                  <code class="te-color-hex">{{ accent }}</code>
                  <button class="te-palette-btn" :class="{ 'te-palette-btn--active': activePalette === 'accent' }" @click="activePalette = activePalette === 'accent' ? null : 'accent'" title="Edit 50–900 palette">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                  </button>
                </div>
              </div>

              <div class="te-section">
                <div class="te-section-label">Status colors</div>
                <div class="te-color-row">
                  <input type="color" class="te-color-swatch" v-model="success" />
                  <span class="te-color-name">Success</span>
                  <code class="te-color-hex">{{ success }}</code>
                  <button class="te-palette-btn" :class="{ 'te-palette-btn--active': activePalette === 'success' }" @click="activePalette = activePalette === 'success' ? null : 'success'" title="Edit 50–900 palette">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                  </button>
                </div>
                <div class="te-color-row">
                  <input type="color" class="te-color-swatch" v-model="errorColor" />
                  <span class="te-color-name">Error</span>
                  <code class="te-color-hex">{{ errorColor }}</code>
                  <button class="te-palette-btn" :class="{ 'te-palette-btn--active': activePalette === 'error' }" @click="activePalette = activePalette === 'error' ? null : 'error'" title="Edit 50–900 palette">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                  </button>
                </div>
                <div class="te-color-row">
                  <input type="color" class="te-color-swatch" v-model="warning" />
                  <span class="te-color-name">Warning</span>
                  <code class="te-color-hex">{{ warning }}</code>
                  <button class="te-palette-btn" :class="{ 'te-palette-btn--active': activePalette === 'warning' }" @click="activePalette = activePalette === 'warning' ? null : 'warning'" title="Edit 50–900 palette">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                  </button>
                </div>
                <div class="te-color-row">
                  <input type="color" class="te-color-swatch" v-model="info" />
                  <span class="te-color-name">Info</span>
                  <code class="te-color-hex">{{ info }}</code>
                  <button class="te-palette-btn" :class="{ 'te-palette-btn--active': activePalette === 'info' }" @click="activePalette = activePalette === 'info' ? null : 'info'" title="Edit 50–900 palette">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                  </button>
                </div>
              </div>

            </div>
          </details>

          <!-- Semantic colors -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Semantic colors</span>
              <span class="te-badge">Advanced</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div v-for="group in SEMANTIC_GROUPS" :key="group.label" class="te-section">
                <div class="te-section-label">{{ group.label }}</div>
                <div v-for="entry in group.entries" :key="entry.token" class="te-sem-row">
                  <span class="te-sem-swatch" :style="{ background: `var(${entry.token})` }"></span>
                  <span class="te-sem-label">{{ entry.label }}</span>
                  <select
                    class="te-sem-select"
                    :value="semanticOverrides[entry.token]?.palette ?? entry.defaultPalette"
                    @change="setSemantic(entry, 'palette', ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="pal in SEMANTIC_PALETTES" :key="pal" :value="pal">{{ SEMANTIC_PALETTE_LABELS[pal] }}</option>
                  </select>
                  <select
                    class="te-sem-select te-sem-select--step"
                    :value="semanticOverrides[entry.token]?.step ?? entry.defaultStep"
                    @change="setSemantic(entry, 'step', +($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="step in SEMANTIC_STEPS" :key="step" :value="step">{{ step }}</option>
                  </select>
                  <button
                    class="te-icon-btn te-icon-btn--reset"
                    :class="{ 'te-icon-btn--changed': !!semanticOverrides[entry.token] }"
                    :disabled="!semanticOverrides[entry.token]"
                    @click="resetSemantic(entry.token)"
                    title="Reset"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </details>

          <!-- Typography -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Typography</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-section-label">Font families</div>
                <div class="te-font-row">
                  <span class="te-font-label">Body</span>
                  <select class="te-select" v-model="fontBody">
                    <option v-for="f in FONT_OPTIONS_BODY" :key="f" :value="f">{{ f }}</option>
                  </select>
                </div>
                <div class="te-font-row">
                  <span class="te-font-label">Title</span>
                  <select class="te-select" v-model="fontTitle">
                    <option v-for="f in FONT_OPTIONS_TITLE" :key="f" :value="f">{{ f }}</option>
                  </select>
                </div>
                <p class="te-font-preview" :style="{ fontFamily: fontBody + ', sans-serif' }">
                  The quick brown fox jumps over the lazy dog.
                </p>
                <p class="te-font-preview te-font-preview--title" :style="{ fontFamily: fontTitle + ', sans-serif' }">
                  Heading Preview
                </p>
              </div>
            </div>
          </details>

          <!-- Radius scale -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Radius scale</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-scale-row">
                  <span class="te-scale-name">XXS</span>
                  <input type="range" class="te-slider" min="0" max="20" v-model.number="radiusXxs" />
                  <span class="te-scale-val">{{ radiusXxs }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': radiusXxs !== DEFAULTS.radiusXxs }" :disabled="radiusXxs === DEFAULTS.radiusXxs" @click="radiusXxs = DEFAULTS.radiusXxs" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">XS</span>
                  <input type="range" class="te-slider" min="0" max="20" v-model.number="radiusXs" />
                  <span class="te-scale-val">{{ radiusXs }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': radiusXs !== DEFAULTS.radiusXs }" :disabled="radiusXs === DEFAULTS.radiusXs" @click="radiusXs = DEFAULTS.radiusXs" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">S</span>
                  <input type="range" class="te-slider" min="0" max="32" v-model.number="radiusS" />
                  <span class="te-scale-val">{{ radiusS }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': radiusS !== DEFAULTS.radiusS }" :disabled="radiusS === DEFAULTS.radiusS" @click="radiusS = DEFAULTS.radiusS" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">M</span>
                  <input type="range" class="te-slider" min="0" max="32" v-model.number="radiusM" />
                  <span class="te-scale-val">{{ radiusM }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': radiusM !== DEFAULTS.radiusM }" :disabled="radiusM === DEFAULTS.radiusM" @click="radiusM = DEFAULTS.radiusM" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">L</span>
                  <input type="range" class="te-slider" min="0" max="64" v-model.number="radiusL" />
                  <span class="te-scale-val">{{ radiusL }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': radiusL !== DEFAULTS.radiusL }" :disabled="radiusL === DEFAULTS.radiusL" @click="radiusL = DEFAULTS.radiusL" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">XL</span>
                  <input type="range" class="te-slider" min="0" max="64" v-model.number="radiusXl" />
                  <span class="te-scale-val">{{ radiusXl }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': radiusXl !== DEFAULTS.radiusXl }" :disabled="radiusXl === DEFAULTS.radiusXl" @click="radiusXl = DEFAULTS.radiusXl" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
              </div>
            </div>
          </details>

          <!-- Spacing scale -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Spacing scale</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-scale-row">
                  <span class="te-scale-name">XS</span>
                  <input type="range" class="te-slider" min="0" max="16" v-model.number="spacingXs" />
                  <span class="te-scale-val">{{ spacingXs }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingXs !== DEFAULTS.spacingXs }" :disabled="spacingXs === DEFAULTS.spacingXs" @click="spacingXs = DEFAULTS.spacingXs" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">S</span>
                  <input type="range" class="te-slider" min="0" max="24" v-model.number="spacingS" />
                  <span class="te-scale-val">{{ spacingS }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingS !== DEFAULTS.spacingS }" :disabled="spacingS === DEFAULTS.spacingS" @click="spacingS = DEFAULTS.spacingS" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">M</span>
                  <input type="range" class="te-slider" min="4" max="40" step="2" v-model.number="spacingM" />
                  <span class="te-scale-val">{{ spacingM }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingM !== DEFAULTS.spacingM }" :disabled="spacingM === DEFAULTS.spacingM" @click="spacingM = DEFAULTS.spacingM" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">L</span>
                  <input type="range" class="te-slider" min="8" max="48" step="2" v-model.number="spacingL" />
                  <span class="te-scale-val">{{ spacingL }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingL !== DEFAULTS.spacingL }" :disabled="spacingL === DEFAULTS.spacingL" @click="spacingL = DEFAULTS.spacingL" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">XL</span>
                  <input type="range" class="te-slider" min="8" max="64" step="4" v-model.number="spacingXl" />
                  <span class="te-scale-val">{{ spacingXl }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingXl !== DEFAULTS.spacingXl }" :disabled="spacingXl === DEFAULTS.spacingXl" @click="spacingXl = DEFAULTS.spacingXl" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <div class="te-scale-row">
                  <span class="te-scale-name">XXL</span>
                  <input type="range" class="te-slider" min="16" max="96" step="4" v-model.number="spacingXxl" />
                  <span class="te-scale-val">{{ spacingXxl }}px</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingXxl !== DEFAULTS.spacingXxl }" :disabled="spacingXxl === DEFAULTS.spacingXxl" @click="spacingXxl = DEFAULTS.spacingXxl" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
              </div>
              <div class="te-section">
                <div class="te-section-label">Component density</div>
                <div class="te-seg">
                  <button v-for="o in DENSITY_OPTIONS" :key="o.value" class="te-seg-btn" :class="{ 'te-seg-btn--active': density === o.value }" @click="density = o.value">{{ o.label }}</button>
                </div>
              </div>
            </div>
          </details>

          <!-- Motion -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Motion</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-section-label">
                  Animation speed
                  <span class="te-badge">{{ motionLabel(motionScale) }}</span>
                </div>
                <div class="te-scale-row" style="margin-top:4px">
                  <span class="te-scale-name" style="font-size:14px;width:20px">⚡</span>
                  <input type="range" class="te-slider" min="0" max="3" step="0.25" v-model.number="motionScale" />
                  <span class="te-scale-name" style="font-size:14px;width:20px;text-align:right">🐢</span>
                </div>
                <p class="te-hint" style="margin-top:8px">Scales all <code>--coar-duration-*</code> tokens (0 = instant, 3 = very slow).</p>
              </div>
            </div>
          </details>

          <!-- Components divider -->
          <div class="te-components-divider">Components</div>

          <!-- Inputs -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Inputs</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-section-label">Corner radius</div>
                <select class="te-select" v-model="inputRadius">
                  <option v-for="o in RADIUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
              <div class="te-section">
                <div class="te-section-label">
                  Horizontal padding
                  <label class="te-override-label">
                    <input type="checkbox" class="te-override-check" v-model="inputPaddingXEnabled" />
                    Override
                  </label>
                </div>
                <div class="te-scale-row" :class="{ 'te-scale-row--disabled': !inputPaddingXEnabled }">
                  <input type="range" class="te-slider" min="4" max="32" step="1" v-model.number="inputPaddingX" :disabled="!inputPaddingXEnabled" />
                  <span class="te-scale-val">{{ inputPaddingXEnabled ? inputPaddingX + 'px' : 'auto' }}</span>
                  <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': inputPaddingXEnabled }" :disabled="!inputPaddingXEnabled" @click="inputPaddingXEnabled = false; inputPaddingX = DEFAULTS.inputPaddingX" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
                </div>
                <p class="te-hint">
                  <template v-if="inputPaddingXEnabled">Fixed override — CSS default ignored.</template>
                  <template v-else">Auto: <code>calc(spacing-s + spacing-xs)</code></template>
                </p>
              </div>
            </div>
          </details>

          <!-- Buttons -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Buttons</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-section-label">Corner radius</div>
                <select class="te-select" v-model="buttonRadius">
                  <option v-for="o in RADIUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
            </div>
          </details>

          <!-- Tags & Badges -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Tags &amp; Badges</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-section-label">Corner radius</div>
                <div class="te-radius-row">
                  <span class="te-radius-label">Tag</span>
                  <select class="te-select" v-model="tagRadius">
                    <option v-for="o in RADIUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
                <div class="te-radius-row" style="margin-top:8px">
                  <span class="te-radius-label">Badge</span>
                  <select class="te-select" v-model="badgeRadius">
                    <option v-for="o in RADIUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
              </div>
            </div>
          </details>

          <!-- Cards -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Cards</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-section-label">Corner radius</div>
                <select class="te-select" v-model="cardRadius">
                  <option v-for="o in RADIUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
              <div class="te-section">
                <div class="te-section-label">Shadow</div>
                <select class="te-select" v-model="cardShadow">
                  <option v-for="o in SHADOW_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
            </div>
          </details>

          <!-- Overlays -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Overlays</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-section-label">Corner radius</div>
                <div v-for="row in [{ label:'Menu', v: menuRadius, set:(v:string)=>menuRadius=v }, { label:'Popover', v: popoverRadius, set:(v:string)=>popoverRadius=v }, { label:'Dropdown', v: dropdownRadius, set:(v:string)=>dropdownRadius=v }]" :key="row.label" class="te-radius-row">
                  <span class="te-radius-label">{{ row.label }}</span>
                  <select class="te-select" :value="row.v" @change="row.set(($event.target as HTMLSelectElement).value)">
                    <option v-for="o in RADIUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
              </div>
              <div class="te-section">
                <div class="te-section-label">Shadow</div>
                <div v-for="row in [{ label:'Menu', v: menuShadow, set:(v:string)=>menuShadow=v }, { label:'Popover', v: popoverShadow, set:(v:string)=>popoverShadow=v }, { label:'Dropdown', v: dropdownShadow, set:(v:string)=>dropdownShadow=v }]" :key="row.label" class="te-radius-row">
                  <span class="te-radius-label">{{ row.label }}</span>
                  <select class="te-select" :value="row.v" @change="row.set(($event.target as HTMLSelectElement).value)">
                    <option v-for="o in SHADOW_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
              </div>
            </div>
          </details>

          <!-- Dialogs & Toasts -->
          <details class="te-accordion">
            <summary class="te-acc-summary">
              <span class="te-acc-title">Dialogs &amp; Toasts</span>
              <svg class="te-acc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </summary>
            <div class="te-accordion-body">
              <div class="te-section">
                <div class="te-section-label">Corner radius</div>
                <div v-for="row in [{ label:'Dialog', v: dialogRadius, set:(v:string)=>dialogRadius=v }, { label:'Toast', v: toastRadius, set:(v:string)=>toastRadius=v }]" :key="row.label" class="te-radius-row">
                  <span class="te-radius-label">{{ row.label }}</span>
                  <select class="te-select" :value="row.v" @change="row.set(($event.target as HTMLSelectElement).value)">
                    <option v-for="o in RADIUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
              </div>
              <div class="te-section">
                <div class="te-section-label">Shadow</div>
                <div v-for="row in [{ label:'Dialog', v: dialogShadow, set:(v:string)=>dialogShadow=v }, { label:'Toast', v: toastShadow, set:(v:string)=>toastShadow=v }]" :key="row.label" class="te-radius-row">
                  <span class="te-radius-label">{{ row.label }}</span>
                  <select class="te-select" :value="row.v" @change="row.set(($event.target as HTMLSelectElement).value)">
                    <option v-for="o in SHADOW_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
              </div>
            </div>
          </details>

        </div>

        <!-- Footer -->
        <footer class="te-footer">
          <div class="te-theme-name-row">
            <span class="te-theme-name-prefix">.coar-theme--</span>
            <input
              v-model="themeName"
              class="te-theme-name-input"
              placeholder="custom"
              maxlength="40"
              spellcheck="false"
              aria-label="Theme class name"
            />
          </div>
          <button class="te-download-btn" :disabled="!hasChanges" @click="downloadCSS">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Download CSS
          </button>
          <p class="te-footer-hint">Apply with <code>&lt;html class="coar-theme--{{ themeName || 'custom' }}"&gt;</code></p>
        </footer>

      </aside>
    </Transition>

    <!-- Palette editor modals -->
    <CoarPaletteEditor v-if="activePalette === 'accent'"  label="Accent"          css-family="accent" :base-color="accent"     :steps="PALETTE_STEPS.accent"  :model-value="paletteOverrides.accent"  @update:model-value="paletteOverrides.accent = $event"  @close="activePalette = null" />
    <CoarPaletteEditor v-if="activePalette === 'error'"   label="Error (red)"     css-family="red"    :base-color="errorColor" :steps="PALETTE_STEPS.error"   :model-value="paletteOverrides.error"   @update:model-value="paletteOverrides.error = $event"   @close="activePalette = null" />
    <CoarPaletteEditor v-if="activePalette === 'success'" label="Success (green)" css-family="green"  :base-color="success"    :steps="PALETTE_STEPS.success" :model-value="paletteOverrides.success" @update:model-value="paletteOverrides.success = $event" @close="activePalette = null" />
    <CoarPaletteEditor v-if="activePalette === 'warning'" label="Warning (amber)" css-family="amber"  :base-color="warning"    :steps="PALETTE_STEPS.warning" :model-value="paletteOverrides.warning" @update:model-value="paletteOverrides.warning = $event" @close="activePalette = null" />
    <CoarPaletteEditor v-if="activePalette === 'info'"    label="Info (slate)"    css-family="slate"  :base-color="info"       :steps="PALETTE_STEPS.info"    :model-value="paletteOverrides.info"    @update:model-value="paletteOverrides.info = $event"    @close="activePalette = null" />
  </Teleport>
</template>

<style scoped>
/* ── FAB ─────────────────────────────────────────── */
.te-fab {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  width: 44px; height: 44px; border-radius: 12px; border: none;
  background: var(--coar-background-accent-primary, #1183CD); color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(17,131,205,.40), 0 1px 3px rgba(0,0,0,.12);
  transition: box-shadow 0.2s, background 0.15s;
}
.te-fab:hover    { background: var(--coar-background-accent-hover, #0d6fad); box-shadow: 0 6px 20px rgba(17,131,205,.45); }
.te-fab--open    { background: var(--coar-background-neutral-primary, #fff); color: var(--coar-text-neutral-primary, #333); box-shadow: 0 2px 8px rgba(0,0,0,.14); }

/* ── Panel ───────────────────────────────────────── */
.te-panel {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 9998;
  width: 316px; display: flex; flex-direction: column;
  background: var(--coar-background-neutral-primary, #fff);
  border-left: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
  box-shadow: -2px 0 16px rgba(0,0,0,.08);
  font-family: var(--coar-body-base-family, Poppins, sans-serif);
  font-size: 13px; color: var(--coar-text-neutral-primary, #1a1a1a);
}
.te-slide-enter-active, .te-slide-leave-active { transition: transform 0.22s cubic-bezier(.4,0,.2,1); }
.te-slide-enter-from,  .te-slide-leave-to      { transform: translateX(100%); }

/* ── Header ──────────────────────────────────────── */
.te-header {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px 0 16px; height: 52px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
  flex-shrink: 0;
  background: var(--coar-background-neutral-primary, #fff);
}
.te-header-icon { color: var(--coar-background-accent-primary, #1183CD); flex-shrink: 0; }
.te-header-title { flex: 1; font-weight: 600; font-size: 13px; color: var(--coar-text-neutral-primary, #1a1a1a); }
.te-header-actions { display: flex; align-items: center; gap: 2px; }

/* ── Icon buttons ────────────────────────────────── */
.te-icon-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  border: none; background: transparent; cursor: pointer;
  color: var(--coar-text-neutral-tertiary, #8c8c8c);
  border-radius: 6px; padding: 0; width: 28px; height: 28px;
  font-size: 12px; font-weight: 500;
  transition: background 0.12s, color 0.12s;
}
.te-icon-btn:hover { background: var(--coar-background-neutral-secondary, #f5f5f5); color: var(--coar-text-neutral-primary, #1a1a1a); }
.te-icon-btn--labeled { width: auto; padding: 0 8px; color: var(--coar-text-neutral-secondary, #595959); }
.te-icon-btn--reset { width: 22px; height: 22px; flex-shrink: 0; color: var(--coar-border-neutral-tertiary, #ccc); }
.te-icon-btn--reset:disabled { cursor: default; }
.te-icon-btn--reset:not(:disabled):hover { background: var(--coar-background-neutral-secondary, #f0f0f0); color: var(--coar-text-neutral-secondary, #555); }
.te-icon-btn--changed { color: var(--coar-background-accent-primary, #1183CD) !important; }

/* ── Body ────────────────────────────────────────── */
.te-body { flex: 1; overflow-y: auto; }

/* ── Presets section ─────────────────────────────── */
.te-presets-section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
}

/* ── Accordion ───────────────────────────────────── */
.te-accordion {
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
}
.te-acc-summary {
  display: flex; align-items: center; gap: 6px;
  padding: 11px 16px;
  cursor: pointer;
  list-style: none;
  user-select: none;
  font-size: 12px; font-weight: 600;
  color: var(--coar-text-neutral-primary, #1a1a1a);
  transition: background 0.1s;
}
.te-acc-summary::-webkit-details-marker { display: none; }
.te-acc-summary:hover { background: var(--coar-background-neutral-secondary, #f8f8f8); }
.te-acc-title { flex: 1; }
.te-acc-arrow {
  flex-shrink: 0;
  color: var(--coar-text-neutral-tertiary, #8c8c8c);
  transition: transform 0.18s;
}
.te-accordion[open] .te-acc-arrow { transform: rotate(90deg); }

/* ── Accordion body & inner sections ─────────────── */
.te-accordion-body .te-section { border-bottom: none; }
.te-accordion-body .te-section + .te-section {
  border-top: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
}

/* ── Components divider ──────────────────────────── */
.te-components-divider {
  padding: 7px 16px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
  color: var(--coar-text-neutral-tertiary, #8c8c8c);
  background: var(--coar-background-neutral-secondary, #f8f8f8);
  border-top: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
}

/* ── Section ─────────────────────────────────────── */
.te-section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
}
.te-section:last-child { border-bottom: none; }
.te-section-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
  color: var(--coar-text-neutral-tertiary, #8c8c8c); margin-bottom: 10px;
}
.te-badge {
  text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 10px;
  background: var(--coar-background-neutral-secondary, #f0f0f0);
  color: var(--coar-text-neutral-secondary, #595959);
  padding: 1px 7px; border-radius: 99px;
}

/* ── Presets ─────────────────────────────────────── */
.te-preset-grid { display: flex; flex-direction: column; gap: 6px; }
.te-preset-card {
  display: flex; flex-direction: column; gap: 2px; text-align: left;
  padding: 10px 12px; border-radius: 8px;
  border: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
  background: var(--coar-background-neutral-secondary, #fafafa);
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
}
.te-preset-card:hover {
  border-color: var(--coar-background-accent-primary, #1183CD);
  background: color-mix(in srgb, var(--coar-background-accent-primary, #1183CD) 6%, transparent);
}
.te-preset-name { font-size: 13px; font-weight: 600; color: var(--coar-text-neutral-primary, #1a1a1a); }
.te-preset-desc { font-size: 11px; color: var(--coar-text-neutral-tertiary, #8c8c8c); }

/* ── Segmented control ───────────────────────────── */
.te-seg {
  display: flex;
  border: 1px solid var(--coar-border-neutral-tertiary, #e0e0e0);
  border-radius: 8px; overflow: hidden;
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  padding: 3px;
}
.te-seg-btn {
  flex: 1; border: none;
  background: transparent;
  padding: 5px 10px; font-size: 12px; font-weight: 500; cursor: pointer;
  color: var(--coar-text-neutral-secondary, #595959);
  border-radius: 5px;
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  transition: background 0.12s, color 0.12s;
  font-family: inherit;
}
.te-seg-btn:hover { color: var(--coar-text-neutral-primary, #1a1a1a); }
.te-seg-btn--active {
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-primary, #1a1a1a);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,.10);
}

/* ── Color rows ──────────────────────────────────── */
.te-color-row { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; }
.te-color-row:last-child { margin-bottom: 0; }
.te-color-swatch {
  width: 26px; height: 26px; border-radius: 6px;
  border: 1px solid var(--coar-border-neutral-tertiary, #e0e0e0);
  padding: 0; cursor: pointer; flex-shrink: 0; overflow: hidden;
  outline: none;
}
.te-color-swatch::-webkit-color-swatch-wrapper { padding: 0; }
.te-color-swatch::-webkit-color-swatch { border: none; }
.te-color-name { flex: 1; font-size: 13px; color: var(--coar-text-neutral-primary, #1a1a1a); }
.te-color-hex {
  font-size: 10px; font-family: ui-monospace, monospace;
  color: var(--coar-text-neutral-tertiary, #8c8c8c);
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  padding: 1px 5px; border-radius: 3px;
}

/* ── Palette button ──────────────────────────────── */
.te-palette-btn {
  width: 26px; height: 26px;
  border: 1px solid var(--coar-border-neutral-tertiary, #e0e0e0);
  background: var(--coar-background-neutral-primary, #fff);
  border-radius: 6px;
  color: var(--coar-text-neutral-tertiary, #bbb); cursor: pointer; padding: 0; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  transition: color 0.12s, border-color 0.12s, background 0.12s;
}
.te-palette-btn:hover { color: var(--coar-background-accent-primary, #1183CD); border-color: var(--coar-background-accent-primary, #1183CD); }
.te-palette-btn--active {
  color: var(--coar-background-accent-primary, #1183CD);
  border-color: var(--coar-background-accent-primary, #1183CD);
  background: color-mix(in srgb, var(--coar-background-accent-primary, #1183CD) 8%, transparent);
}

/* ── Radius rows ─────────────────────────────────── */
.te-radius-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.te-radius-row:last-child { margin-bottom: 0; }
.te-radius-label { width: 56px; flex-shrink: 0; font-size: 12px; color: var(--coar-text-neutral-secondary, #595959); }

/* ── Select ──────────────────────────────────────── */
.te-select {
  appearance: none;
  background: var(--coar-background-neutral-secondary, #f5f5f5)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23595959' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 7px center;
  border: 1px solid var(--coar-border-neutral-tertiary, #e0e0e0);
  border-radius: 5px;
  padding: 4px 24px 4px 8px;
  font-size: 11px; font-family: inherit;
  color: var(--coar-text-neutral-primary, #1a1a1a);
  cursor: pointer; flex: 1;
  transition: border-color 0.12s;
}
.te-select:hover { border-color: var(--coar-border-neutral-secondary, #c8c8c8); }
.te-select:focus { outline: none; border-color: var(--coar-background-accent-primary, #1183CD); }

/* ── Typography ──────────────────────────────────── */
.te-font-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.te-font-label { width: 36px; flex-shrink: 0; font-size: 12px; color: var(--coar-text-neutral-secondary, #595959); }
.te-select {
  flex: 1; padding: 6px 8px; appearance: auto;
  border: 1px solid var(--coar-border-neutral-tertiary, #e0e0e0);
  border-radius: 6px;
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-primary, #1a1a1a); font-size: 12px; cursor: pointer;
  outline: none; font-family: inherit;
}
.te-select:focus { border-color: var(--coar-background-accent-primary, #1183CD); }
.te-font-preview { margin: 10px 0 0; font-size: 12px; color: var(--coar-text-neutral-secondary, #595959); line-height: 1.5; }
.te-font-preview--title { font-size: 15px; font-weight: 700; margin-top: 4px; color: var(--coar-text-neutral-primary, #1a1a1a); }

/* ── Scale rows (sliders) ────────────────────────── */
.te-scale-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.te-scale-row:last-child { margin-bottom: 0; }
.te-scale-name {
  width: 26px; flex-shrink: 0;
  font-size: 11px; font-weight: 600; color: var(--coar-text-neutral-tertiary, #8c8c8c);
  text-transform: uppercase; letter-spacing: .03em;
}
.te-scale-val {
  width: 34px; flex-shrink: 0; text-align: right;
  font-size: 10px; font-family: ui-monospace, monospace;
  color: var(--coar-text-neutral-secondary, #595959);
}
.te-slider {
  flex: 1; accent-color: var(--coar-background-accent-primary, #1183CD);
  cursor: pointer; height: 16px; border: none; background: transparent; outline: none;
}

/* ── Hint text ───────────────────────────────────── */
.te-hint { font-size: 11px; color: var(--coar-text-neutral-tertiary, #8c8c8c); line-height: 1.45; margin: 0; }
.te-hint code { font-family: ui-monospace, monospace; font-size: 10px; }

/* ── Override toggle ─────────────────────────────── */
.te-override-label {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 500; text-transform: none; letter-spacing: 0;
  color: var(--coar-text-neutral-tertiary, #8c8c8c); cursor: pointer;
  margin-left: auto;
}
.te-override-check { cursor: pointer; accent-color: var(--coar-background-accent-primary, #1183CD); width: 12px; height: 12px; }
.te-override-label:has(.te-override-check:checked) { color: var(--coar-background-accent-primary, #1183CD); }

/* ── Disabled scale row ──────────────────────────── */
.te-scale-row--disabled { opacity: 0.4; pointer-events: none; }

/* ── Semantic rows ───────────────────────────────── */
.te-sem-row { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
.te-sem-row:last-child { margin-bottom: 0; }
.te-sem-swatch { width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
.te-sem-label { flex: 1; font-size: 12px; color: var(--coar-text-neutral-primary, #1a1a1a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.te-sem-select {
  padding: 3px 4px; font-size: 11px; font-family: inherit; cursor: pointer;
  border: 1px solid var(--coar-border-neutral-tertiary, #e0e0e0);
  border-radius: 5px; background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-primary, #1a1a1a);
  outline: none; appearance: auto;
}
.te-sem-select:focus { border-color: var(--coar-background-accent-primary, #1183CD); }
.te-sem-select--step { width: 52px; }

/* ── Footer ──────────────────────────────────────── */
.te-theme-name-row {
  display: flex; align-items: center; gap: 0;
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  border: 1px solid var(--coar-border-neutral-tertiary, #e0e0e0);
  border-radius: 6px; overflow: hidden;
  font-size: 11px; font-family: ui-monospace, monospace;
  margin-bottom: 8px;
}
.te-theme-name-prefix {
  padding: 5px 6px; color: var(--coar-text-neutral-tertiary, #8c8c8c);
  white-space: nowrap; user-select: none;
  border-right: 1px solid var(--coar-border-neutral-tertiary, #e0e0e0);
  background: var(--coar-background-neutral-tertiary, #ebebeb);
}
.te-theme-name-input {
  flex: 1; border: none; outline: none; background: transparent;
  padding: 5px 6px; font-size: 11px; font-family: ui-monospace, monospace;
  color: var(--coar-text-neutral-primary, #1a1a1a); min-width: 0;
}
.te-theme-name-input::placeholder { color: var(--coar-text-neutral-tertiary, #8c8c8c); }
.te-footer {
  padding: 14px 16px;
  border-top: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
  flex-shrink: 0;
  background: var(--coar-background-neutral-primary, #fff);
}
.te-download-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 9px 16px; border: none; border-radius: 8px;
  background: var(--coar-background-accent-primary, #1183CD); color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: background 0.15s;
}
.te-download-btn:hover:not(:disabled) { background: var(--coar-background-accent-hover, #0d6fad); }
.te-download-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.te-footer-hint { margin: 8px 0 0; font-size: 11px; color: var(--coar-text-neutral-tertiary, #8c8c8c); line-height: 1.4; }
.te-footer-hint code { font-family: ui-monospace, monospace; font-size: 10px; }
</style>
