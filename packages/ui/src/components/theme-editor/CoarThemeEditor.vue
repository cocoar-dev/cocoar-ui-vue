<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const props = withDefaults(defineProps<{ hideDarkToggle?: boolean }>(), {
  hideDarkToggle: false,
});

// ── State ────────────────────────────────────────────────
const isOpen  = ref(false);
const isDark  = ref(false);
const activeTab = ref<'presets' | 'brand' | 'shape' | 'type' | 'depth' | 'motion'>('presets');

// ── Defaults ─────────────────────────────────────────────
const DEFAULTS = {
  // Brand
  accent:  '#1183CD',
  success: '#1e8f48',
  error:   '#d63b3b',
  warning: '#cc821f',
  info:    '#5e6b84',
  // Radius (CSS token values, not px numbers — we set the token directly)
  buttonRadius:   'var(--coar-radius-xs)',
  inputRadius:    'var(--coar-radius-xs)',
  tagRadius:      'var(--coar-radius-xs)',
  badgeRadius:    'var(--coar-radius-full)',
  cardRadius:     'var(--coar-radius-s)',
  menuRadius:     'var(--coar-radius-s)',
  popoverRadius:  'var(--coar-radius-s)',
  dropdownRadius: 'var(--coar-radius-s)',
  dialogRadius:   'var(--coar-radius-l)',
  toastRadius:    'var(--coar-radius-m)',
  // Shadow
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
const buttonRadius   = ref(DEFAULTS.buttonRadius);
const inputRadius    = ref(DEFAULTS.inputRadius);
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
  { label: 'None',    value: '0px' },
  { label: 'XXS',     value: 'var(--coar-radius-xxs)' },
  { label: 'XS',      value: 'var(--coar-radius-xs)' },
  { label: 'S',       value: 'var(--coar-radius-s)' },
  { label: 'M',       value: 'var(--coar-radius-m)' },
  { label: 'L',       value: 'var(--coar-radius-l)' },
  { label: 'XL',      value: 'var(--coar-radius-xl)' },
  { label: 'Full',    value: 'var(--coar-radius-full)' },
];

const SHADOW_OPTIONS = [
  { label: 'None',    value: 'none' },
  { label: 'XS',      value: 'var(--coar-shadow-xs)' },
  { label: 'S',       value: 'var(--coar-shadow-s)' },
  { label: 'M',       value: 'var(--coar-shadow-m)' },
  { label: 'L',       value: 'var(--coar-shadow-l)' },
  { label: 'XL',      value: 'var(--coar-shadow-xl)' },
  { label: 'Elev.',   value: 'var(--coar-elevation-medium)' },
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
      buttonRadius:   '0px',
      inputRadius:    '0px',
      tagRadius:      '0px',
      cardRadius:     '0px',
      menuRadius:     '0px',
      popoverRadius:  '0px',
      dropdownRadius: '0px',
      dialogRadius:   '0px',
      toastRadius:    '0px',
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
  warning.value        = v.warning as string;
  info.value           = v.info as string;
  buttonRadius.value   = v.buttonRadius as string;
  inputRadius.value    = v.inputRadius as string;
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
  const r = document.documentElement;
  // Brand
  r.style.setProperty('--coar-accent',  accent.value);
  r.style.setProperty('--coar-success', success.value);
  r.style.setProperty('--coar-error',   errorColor.value);
  r.style.setProperty('--coar-warning', warning.value);
  r.style.setProperty('--coar-info',    info.value);
  // Radius
  r.style.setProperty('--coar-button-radius',    buttonRadius.value);
  r.style.setProperty('--coar-input-radius',     inputRadius.value);
  r.style.setProperty('--coar-tag-radius',       tagRadius.value);
  r.style.setProperty('--coar-badge-radius',     badgeRadius.value);
  r.style.setProperty('--coar-card-radius',      cardRadius.value);
  r.style.setProperty('--coar-menu-radius',      menuRadius.value);
  r.style.setProperty('--coar-popover-radius',   popoverRadius.value);
  r.style.setProperty('--coar-dropdown-radius',  dropdownRadius.value);
  r.style.setProperty('--coar-dialog-border-radius', dialogRadius.value);
  r.style.setProperty('--coar-toast-border-radius',  toastRadius.value);
  // Shadow
  r.style.setProperty('--coar-card-shadow',      cardShadow.value);
  r.style.setProperty('--coar-menu-shadow',      menuShadow.value);
  r.style.setProperty('--coar-popover-shadow',   popoverShadow.value);
  r.style.setProperty('--coar-dropdown-shadow',  dropdownShadow.value);
  r.style.setProperty('--coar-dialog-shadow',    dialogShadow.value);
  r.style.setProperty('--coar-toast-shadow',     toastShadow.value);
  // Typography
  r.style.setProperty('--coar-font-family-body',  `${fontBody.value}, ui-sans-serif, system-ui, sans-serif`);
  r.style.setProperty('--coar-font-family-title', `${fontTitle.value}, ui-sans-serif, system-ui, sans-serif`);
  // Motion
  const s = motionScale.value;
  for (const [key, base] of Object.entries(BASE_DURATIONS)) {
    r.style.setProperty(`--coar-duration-${key}`, `${Math.round(base * s)}ms`);
  }
  // Dark mode
  if (!props.hideDarkToggle) {
    if (isDark.value) r.classList.add('dark-mode');
    else              r.classList.remove('dark-mode');
  }
}

watch(
  [accent, success, errorColor, warning, info,
   buttonRadius, inputRadius, tagRadius, badgeRadius, cardRadius,
   menuRadius, popoverRadius, dropdownRadius, dialogRadius, toastRadius,
   cardShadow, menuShadow, popoverShadow, dropdownShadow, dialogShadow, toastShadow,
   fontBody, fontTitle, motionScale, isDark],
  applyTokens,
);

// ── Reset ─────────────────────────────────────────────────
function reset() {
  applyPreset(PRESETS[0]);
  if (!props.hideDarkToggle) {
    isDark.value = false;
    document.documentElement.classList.remove('dark-mode');
  }
  const r = document.documentElement;
  for (const key of [
    '--coar-accent','--coar-success','--coar-error','--coar-warning','--coar-info',
    '--coar-button-radius','--coar-input-radius','--coar-tag-radius','--coar-badge-radius',
    '--coar-card-radius','--coar-menu-radius','--coar-popover-radius','--coar-dropdown-radius',
    '--coar-dialog-border-radius','--coar-toast-border-radius',
    '--coar-card-shadow','--coar-menu-shadow','--coar-popover-shadow',
    '--coar-dropdown-shadow','--coar-dialog-shadow','--coar-toast-shadow',
    '--coar-font-family-body','--coar-font-family-title',
    ...Object.keys(BASE_DURATIONS).map(k => `--coar-duration-${k}`),
  ]) r.style.removeProperty(key);
}

// ── Changed detection ─────────────────────────────────────
const hasChanges = computed(() =>
  accent.value         !== DEFAULTS.accent         ||
  success.value        !== DEFAULTS.success        ||
  errorColor.value     !== DEFAULTS.error          ||
  warning.value        !== DEFAULTS.warning        ||
  info.value           !== DEFAULTS.info           ||
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
  motionScale.value    !== DEFAULTS.motionScale,
);

// ── Download ──────────────────────────────────────────────
function downloadCSS() {
  const lines: string[] = [':root {'];
  const add = (token: string, val: string, def: string) => {
    if (val !== def) lines.push(`  ${token}: ${val};`);
  };
  add('--coar-accent',  accent.value,  DEFAULTS.accent);
  add('--coar-success', success.value, DEFAULTS.success);
  add('--coar-error',   errorColor.value, DEFAULTS.error);
  add('--coar-warning', warning.value, DEFAULTS.warning);
  add('--coar-info',    info.value,    DEFAULTS.info);
  add('--coar-button-radius',    buttonRadius.value,   DEFAULTS.buttonRadius);
  add('--coar-input-radius',     inputRadius.value,    DEFAULTS.inputRadius);
  add('--coar-tag-radius',       tagRadius.value,      DEFAULTS.tagRadius);
  add('--coar-badge-radius',     badgeRadius.value,    DEFAULTS.badgeRadius);
  add('--coar-card-radius',      cardRadius.value,     DEFAULTS.cardRadius);
  add('--coar-menu-radius',      menuRadius.value,     DEFAULTS.menuRadius);
  add('--coar-popover-radius',   popoverRadius.value,  DEFAULTS.popoverRadius);
  add('--coar-dropdown-radius',  dropdownRadius.value, DEFAULTS.dropdownRadius);
  add('--coar-dialog-border-radius', dialogRadius.value, DEFAULTS.dialogRadius);
  add('--coar-toast-border-radius',  toastRadius.value,  DEFAULTS.toastRadius);
  add('--coar-card-shadow',      cardShadow.value,     DEFAULTS.cardShadow);
  add('--coar-menu-shadow',      menuShadow.value,     DEFAULTS.menuShadow);
  add('--coar-popover-shadow',   popoverShadow.value,  DEFAULTS.popoverShadow);
  add('--coar-dropdown-shadow',  dropdownShadow.value, DEFAULTS.dropdownShadow);
  add('--coar-dialog-shadow',    dialogShadow.value,   DEFAULTS.dialogShadow);
  add('--coar-toast-shadow',     toastShadow.value,    DEFAULTS.toastShadow);
  if (fontBody.value !== DEFAULTS.fontBody)
    lines.push(`  --coar-font-family-body: ${fontBody.value}, ui-sans-serif, system-ui, sans-serif;`);
  if (fontTitle.value !== DEFAULTS.fontTitle)
    lines.push(`  --coar-font-family-title: ${fontTitle.value}, ui-sans-serif, system-ui, sans-serif;`);
  if (motionScale.value !== DEFAULTS.motionScale) {
    for (const [key, base] of Object.entries(BASE_DURATIONS)) {
      lines.push(`  --coar-duration-${key}: ${Math.round(base * motionScale.value)}ms;`);
    }
  }
  lines.push('}');
  const blob = new Blob([lines.join('\n')], { type: 'text/css' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'coar-theme.css';
  a.click();
  URL.revokeObjectURL(a.href);
}

const TABS = [
  { id: 'presets', label: 'Presets' },
  { id: 'brand',   label: 'Brand'   },
  { id: 'shape',   label: 'Shape'   },
  { id: 'type',    label: 'Type'    },
  { id: 'depth',   label: 'Depth'   },
  { id: 'motion',  label: 'Motion'  },
] as const;
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/>
        <circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
      </svg>
    </button>

    <!-- Panel -->
    <Transition name="te-slide">
      <aside v-if="isOpen" class="te-panel">

        <!-- Header -->
        <header class="te-header">
          <span class="te-header-title">Theme Editor</span>
          <div class="te-header-actions">
            <button v-if="hasChanges" class="te-btn te-btn--ghost te-btn--sm" @click="reset">Reset</button>
            <button class="te-btn te-btn--ghost te-btn--sm" @click="isOpen = false">✕</button>
          </div>
        </header>

        <!-- Tabs -->
        <nav class="te-tabs">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            class="te-tab"
            :class="{ 'te-tab--active': activeTab === tab.id }"
            @click="activeTab = tab.id"
          >{{ tab.label }}</button>
        </nav>

        <!-- Tab content -->
        <div class="te-body">

          <!-- PRESETS -->
          <div v-if="activeTab === 'presets'" class="te-section">
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

          <!-- BRAND -->
          <div v-if="activeTab === 'brand'">
            <div v-if="!hideDarkToggle" class="te-section">
              <div class="te-section-label">Mode</div>
              <div class="te-mode-toggle">
                <button class="te-mode-btn" :class="{ active: !isDark }" @click="isDark = false">☀ Light</button>
                <button class="te-mode-btn" :class="{ active: isDark  }" @click="isDark = true">☾ Dark</button>
              </div>
            </div>

            <div class="te-section">
              <div class="te-section-label">Accent</div>
              <div class="te-color-row">
                <input type="color" class="te-color-swatch" v-model="accent" />
                <span class="te-color-name">Brand</span>
                <code class="te-color-value">{{ accent }}</code>
              </div>
            </div>

            <div class="te-section">
              <div class="te-section-label">Status</div>
              <div class="te-color-row">
                <input type="color" class="te-color-swatch" v-model="success" />
                <span class="te-color-name">Success</span>
                <code class="te-color-value">{{ success }}</code>
              </div>
              <div class="te-color-row">
                <input type="color" class="te-color-swatch" v-model="errorColor" />
                <span class="te-color-name">Error</span>
                <code class="te-color-value">{{ errorColor }}</code>
              </div>
              <div class="te-color-row">
                <input type="color" class="te-color-swatch" v-model="warning" />
                <span class="te-color-name">Warning</span>
                <code class="te-color-value">{{ warning }}</code>
              </div>
              <div class="te-color-row">
                <input type="color" class="te-color-swatch" v-model="info" />
                <span class="te-color-name">Info</span>
                <code class="te-color-value">{{ info }}</code>
              </div>
            </div>
          </div>

          <!-- SHAPE -->
          <div v-if="activeTab === 'shape'">
            <div class="te-section">
              <div class="te-section-label">Controls & Inputs</div>
              <div class="te-radius-row">
                <span class="te-radius-label">Button</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: buttonRadius === o.value }"
                    @click="buttonRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Input</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: inputRadius === o.value }"
                    @click="inputRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
            </div>

            <div class="te-section">
              <div class="te-section-label">Tags & Badges</div>
              <div class="te-radius-row">
                <span class="te-radius-label">Tag</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: tagRadius === o.value }"
                    @click="tagRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Badge</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: badgeRadius === o.value }"
                    @click="badgeRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
            </div>

            <div class="te-section">
              <div class="te-section-label">Containers</div>
              <div class="te-radius-row">
                <span class="te-radius-label">Card</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: cardRadius === o.value }"
                    @click="cardRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Dialog</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: dialogRadius === o.value }"
                    @click="dialogRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Toast</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: toastRadius === o.value }"
                    @click="toastRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
            </div>

            <div class="te-section">
              <div class="te-section-label">Overlays</div>
              <div class="te-radius-row">
                <span class="te-radius-label">Menu</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: menuRadius === o.value }"
                    @click="menuRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Popover</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: popoverRadius === o.value }"
                    @click="popoverRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Dropdown</span>
                <div class="te-chip-group">
                  <button v-for="o in RADIUS_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: dropdownRadius === o.value }"
                    @click="dropdownRadius = o.value">{{ o.label }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- TYPE -->
          <div v-if="activeTab === 'type'" class="te-section">
            <div class="te-section-label">Font Families</div>
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

          <!-- DEPTH -->
          <div v-if="activeTab === 'depth'">
            <div class="te-section">
              <div class="te-section-label">Containers</div>
              <div class="te-radius-row">
                <span class="te-radius-label">Card</span>
                <div class="te-chip-group">
                  <button v-for="o in SHADOW_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: cardShadow === o.value }"
                    @click="cardShadow = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Dialog</span>
                <div class="te-chip-group">
                  <button v-for="o in SHADOW_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: dialogShadow === o.value }"
                    @click="dialogShadow = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Toast</span>
                <div class="te-chip-group">
                  <button v-for="o in SHADOW_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: toastShadow === o.value }"
                    @click="toastShadow = o.value">{{ o.label }}</button>
                </div>
              </div>
            </div>
            <div class="te-section">
              <div class="te-section-label">Overlays</div>
              <div class="te-radius-row">
                <span class="te-radius-label">Menu</span>
                <div class="te-chip-group">
                  <button v-for="o in SHADOW_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: menuShadow === o.value }"
                    @click="menuShadow = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Popover</span>
                <div class="te-chip-group">
                  <button v-for="o in SHADOW_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: popoverShadow === o.value }"
                    @click="popoverShadow = o.value">{{ o.label }}</button>
                </div>
              </div>
              <div class="te-radius-row">
                <span class="te-radius-label">Dropdown</span>
                <div class="te-chip-group">
                  <button v-for="o in SHADOW_OPTIONS" :key="o.value"
                    class="te-chip" :class="{ active: dropdownShadow === o.value }"
                    @click="dropdownShadow = o.value">{{ o.label }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- MOTION -->
          <div v-if="activeTab === 'motion'" class="te-section">
            <div class="te-section-label">
              Animation speed
              <span class="te-section-badge">{{ motionLabel(motionScale) }}</span>
            </div>
            <div class="te-slider-row">
              <span class="te-slider-end">⚡</span>
              <input type="range" class="te-slider" min="0" max="3" step="0.25" v-model.number="motionScale" />
              <span class="te-slider-end">🐢</span>
            </div>
            <p class="te-motion-hint">
              Scales all <code>--coar-duration-*</code> tokens proportionally (0 = instant, 3 = 3× slower).
            </p>
          </div>

        </div>

        <!-- Footer -->
        <footer class="te-footer">
          <button class="te-btn te-btn--primary te-btn--full" :disabled="!hasChanges" @click="downloadCSS">
            Download coar-theme.css
          </button>
          <p class="te-footer-hint">Import after <code>@cocoar/vue-ui/styles</code> in your app entry.</p>
        </footer>

      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── FAB ─────────────────────────────────────────── */
.te-fab {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  width: 48px; height: 48px; border-radius: 50%; border: none;
  background: var(--coar-accent, #1183CD); color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  transition: transform 0.2s, box-shadow 0.2s;
}
.te-fab:hover    { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,.32); }
.te-fab--open    { transform: rotate(15deg); }

/* ── Panel ───────────────────────────────────────── */
.te-panel {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 9998;
  width: 320px; display: flex; flex-direction: column;
  background: var(--coar-surface-default, #fff);
  border-left: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  box-shadow: -4px 0 24px rgba(0,0,0,.12);
  font-family: var(--coar-font-family-body, Poppins, sans-serif);
  font-size: 13px;
}
.te-slide-enter-active, .te-slide-leave-active { transition: transform 0.25s cubic-bezier(.4,0,.2,1); }
.te-slide-enter-from,  .te-slide-leave-to      { transform: translateX(100%); }

/* ── Header ──────────────────────────────────────── */
.te-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  flex-shrink: 0;
}
.te-header-title { font-weight: 600; font-size: 14px; color: var(--coar-text-neutral-primary, #333); }
.te-header-actions { display: flex; gap: 4px; }

/* ── Tabs ────────────────────────────────────────── */
.te-tabs {
  display: flex; flex-shrink: 0;
  border-bottom: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  overflow-x: auto; scrollbar-width: none;
}
.te-tabs::-webkit-scrollbar { display: none; }
.te-tab {
  flex-shrink: 0; padding: 8px 12px; border: none; background: transparent;
  font-size: 12px; font-weight: 500; cursor: pointer;
  color: var(--coar-text-neutral-secondary, #666);
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.te-tab:hover    { color: var(--coar-text-neutral-primary, #333); }
.te-tab--active  { color: var(--coar-accent, #1183CD); border-bottom-color: var(--coar-accent, #1183CD); font-weight: 600; }

/* ── Body ────────────────────────────────────────── */
.te-body { flex: 1; overflow-y: auto; }

/* ── Section ─────────────────────────────────────── */
.te-section { padding: 14px 16px; border-bottom: 1px solid var(--coar-border-neutral-primary, #e0e0e0); }
.te-section:last-child { border-bottom: none; }
.te-section-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  color: var(--coar-text-neutral-tertiary, #888); margin-bottom: 10px;
}
.te-section-badge {
  text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 10px;
  background: var(--coar-background-neutral-secondary, #f0f0f0);
  color: var(--coar-text-neutral-secondary, #555);
  padding: 1px 6px; border-radius: 99px;
}

/* ── Presets ─────────────────────────────────────── */
.te-preset-grid { display: flex; flex-direction: column; gap: 8px; }
.te-preset-card {
  display: flex; flex-direction: column; gap: 3px; text-align: left;
  padding: 10px 12px; border-radius: 6px; border: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  background: var(--coar-background-neutral-secondary, #fafafa);
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.te-preset-card:hover { border-color: var(--coar-accent, #1183CD); background: var(--coar-background-accent-subtle, #e8f1fb); }
.te-preset-name { font-size: 13px; font-weight: 600; color: var(--coar-text-neutral-primary, #333); }
.te-preset-desc { font-size: 11px; color: var(--coar-text-neutral-tertiary, #888); }

/* ── Mode toggle ─────────────────────────────────── */
.te-mode-toggle {
  display: flex; border: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  border-radius: 6px; overflow: hidden;
}
.te-mode-btn {
  flex: 1; border: none; background: transparent; padding: 6px 0;
  font-size: 13px; cursor: pointer; color: var(--coar-text-neutral-secondary, #666);
  transition: background 0.15s, color 0.15s;
}
.te-mode-btn.active { background: var(--coar-accent, #1183CD); color: #fff; font-weight: 500; }

/* ── Color rows ──────────────────────────────────── */
.te-color-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.te-color-row:last-child { margin-bottom: 0; }
.te-color-swatch {
  width: 28px; height: 28px; border-radius: 6px;
  border: 2px solid var(--coar-border-neutral-primary, #e0e0e0);
  padding: 0; cursor: pointer; flex-shrink: 0; overflow: hidden;
}
.te-color-swatch::-webkit-color-swatch-wrapper { padding: 0; }
.te-color-swatch::-webkit-color-swatch         { border: none; border-radius: 4px; }
.te-color-name  { flex: 1; color: var(--coar-text-neutral-primary, #333); }
.te-color-value { font-size: 11px; color: var(--coar-text-neutral-tertiary, #888); font-family: ui-monospace, monospace; }

/* ── Radius rows ─────────────────────────────────── */
.te-radius-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.te-radius-row:last-child { margin-bottom: 0; }
.te-radius-label { font-size: 12px; color: var(--coar-text-neutral-secondary, #555); font-weight: 500; }

/* ── Chip group ──────────────────────────────────── */
.te-chip-group { display: flex; flex-wrap: wrap; gap: 4px; }
.te-chip {
  padding: 3px 8px; border-radius: 4px; border: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  background: transparent; font-size: 11px; cursor: pointer;
  color: var(--coar-text-neutral-secondary, #666);
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.te-chip:hover { border-color: var(--coar-accent, #1183CD); color: var(--coar-accent, #1183CD); }
.te-chip.active {
  background: var(--coar-accent, #1183CD); border-color: var(--coar-accent, #1183CD);
  color: #fff; font-weight: 500;
}

/* ── Typography ──────────────────────────────────── */
.te-font-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.te-font-label { width: 36px; flex-shrink: 0; font-size: 11px; color: var(--coar-text-neutral-tertiary, #888); }
.te-select {
  flex: 1; padding: 5px 8px;
  border: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  border-radius: 5px; background: var(--coar-surface-default, #fff);
  color: var(--coar-text-neutral-primary, #333); font-size: 13px; cursor: pointer; outline: none;
}
.te-select:focus { border-color: var(--coar-accent, #1183CD); }
.te-font-preview { margin: 8px 0 0; font-size: 12px; color: var(--coar-text-neutral-secondary, #555); line-height: 1.5; }
.te-font-preview--title { font-size: 16px; font-weight: 600; margin-top: 6px; }

/* ── Motion ──────────────────────────────────────── */
.te-slider-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.te-slider-end { font-size: 14px; flex-shrink: 0; }
.te-slider { flex: 1; accent-color: var(--coar-accent, #1183CD); cursor: pointer; }
.te-motion-hint { font-size: 11px; color: var(--coar-text-neutral-tertiary, #999); line-height: 1.4; margin: 0; }
.te-motion-hint code { font-family: ui-monospace, monospace; font-size: 10px; }

/* ── Footer ──────────────────────────────────────── */
.te-footer {
  padding: 14px 16px; border-top: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  flex-shrink: 0;
}
.te-footer-hint { margin: 8px 0 0; font-size: 11px; color: var(--coar-text-neutral-tertiary, #999); line-height: 1.4; }
.te-footer-hint code { font-family: ui-monospace, monospace; font-size: 10px; }

/* ── Shared buttons ──────────────────────────────── */
.te-btn {
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 6px; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: background 0.15s; padding: 5px 10px;
}
.te-btn--sm      { padding: 3px 8px; font-size: 11px; }
.te-btn--full    { width: 100%; padding: 9px; font-size: 13px; }
.te-btn--ghost   { background: transparent; color: var(--coar-text-neutral-secondary, #666); }
.te-btn--ghost:hover { background: var(--coar-background-neutral-secondary, #f0f0f0); }
.te-btn--primary { background: var(--coar-accent, #1183CD); color: #fff; }
.te-btn--primary:hover:not(:disabled) { filter: brightness(0.92); }
.te-btn--primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
