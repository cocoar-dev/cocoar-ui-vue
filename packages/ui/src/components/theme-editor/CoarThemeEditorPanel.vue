<script setup lang="ts">
import CoarPaletteEditor from './CoarPaletteEditor.vue';
import CoarButton from '../button/CoarButton.vue';
import CoarSelect from '../select/CoarSelect.vue';
import CoarSwitch from '../switch/CoarSwitch.vue';
import CoarSegmentedControl from '../segmented-control/CoarSegmentedControl.vue';
import CoarFormField from '../form-field/CoarFormField.vue';
import {
  DEFAULTS, RADIUS_OPTIONS, SHADOW_OPTIONS, FONT_OPTIONS_BODY_SELECT, FONT_OPTIONS_TITLE_SELECT,
  DENSITY_OPTIONS, PRESETS, PALETTE_STEPS, SEMANTIC_GROUPS, SEMANTIC_PAL_OPTIONS, SEMANTIC_STEP_OPTIONS,
  accent, success, errorColor, warning, info,
  radiusXxs, radiusXs, radiusS, radiusM, radiusL, radiusXl,
  spacingXs, spacingS, spacingM, spacingL, spacingXl, spacingXxl,
  density, buttonRadius, inputRadius, inputPaddingX, inputPaddingXEnabled,
  tagRadius, badgeRadius, cardRadius, menuRadius, popoverRadius, dropdownRadius, dialogRadius, toastRadius,
  cardShadow, menuShadow, popoverShadow, dropdownShadow, dialogShadow, toastShadow,
  fontBody, fontTitle, motionScale, motionLabel,
  isDark, themeName, activePalette, hasChanges,
  paletteOverrides, semanticOverrides,
  applyPreset, reset, downloadCSS, setSemantic, resetSemantic,
} from './theme-editor-state';

const props = defineProps<{ onClose?: () => void; hideDarkToggle?: boolean }>();
</script>

<template>
  <aside class="te-panel">

    <!-- Header -->
    <header class="te-header">
      <svg class="te-header-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/>
        <circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
      </svg>
      <span class="te-header-title">Theme Editor</span>
      <div class="te-header-actions">
        <CoarButton v-if="hasChanges" variant="ghost" size="xs" @click="reset" title="Reset all changes">
          <template #prefix><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></template>
          Reset
        </CoarButton>
        <button class="te-icon-btn" @click="props.onClose?.()" title="Close">
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

          <div v-if="!props.hideDarkToggle" class="te-section">
            <div class="te-section-label">Appearance</div>
            <CoarSegmentedControl
              v-model="isDark"
              :options="[{ value: false, label: 'Light' }, { value: true, label: 'Dark' }]"
              size="s"
              full-width
            />
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
              <CoarSelect
                :model-value="semanticOverrides[entry.token]?.palette ?? entry.defaultPalette"
                @update:model-value="setSemantic(entry, 'palette', $event as string)"
                :options="SEMANTIC_PAL_OPTIONS"
                size="xs"
                style="width:80px;flex-shrink:0"
              />
              <CoarSelect
                :model-value="semanticOverrides[entry.token]?.step ?? entry.defaultStep"
                @update:model-value="setSemantic(entry, 'step', $event as number)"
                :options="SEMANTIC_STEP_OPTIONS"
                size="xs"
                style="width:58px;flex-shrink:0"
              />
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
              <CoarSelect v-model="fontBody" :options="FONT_OPTIONS_BODY_SELECT" size="s" style="flex:1" />
            </div>
            <div class="te-font-row">
              <span class="te-font-label">Title</span>
              <CoarSelect v-model="fontTitle" :options="FONT_OPTIONS_TITLE_SELECT" size="s" style="flex:1" />
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
              <input type="range" class="te-slider" min="0" max="32" v-model.number="radiusXxs" />
              <span class="te-scale-val">{{ radiusXxs }}px</span>
              <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': radiusXxs !== DEFAULTS.radiusXxs }" :disabled="radiusXxs === DEFAULTS.radiusXxs" @click="radiusXxs = DEFAULTS.radiusXxs" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            </div>
            <div class="te-scale-row">
              <span class="te-scale-name">XS</span>
              <input type="range" class="te-slider" min="0" max="32" v-model.number="radiusXs" />
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
              <input type="range" class="te-slider" min="0" max="32" v-model.number="radiusL" />
              <span class="te-scale-val">{{ radiusL }}px</span>
              <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': radiusL !== DEFAULTS.radiusL }" :disabled="radiusL === DEFAULTS.radiusL" @click="radiusL = DEFAULTS.radiusL" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            </div>
            <div class="te-scale-row">
              <span class="te-scale-name">XL</span>
              <input type="range" class="te-slider" min="0" max="32" v-model.number="radiusXl" />
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
              <input type="range" class="te-slider" min="0" max="96" v-model.number="spacingXs" />
              <span class="te-scale-val">{{ spacingXs }}px</span>
              <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingXs !== DEFAULTS.spacingXs }" :disabled="spacingXs === DEFAULTS.spacingXs" @click="spacingXs = DEFAULTS.spacingXs" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            </div>
            <div class="te-scale-row">
              <span class="te-scale-name">S</span>
              <input type="range" class="te-slider" min="0" max="96" v-model.number="spacingS" />
              <span class="te-scale-val">{{ spacingS }}px</span>
              <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingS !== DEFAULTS.spacingS }" :disabled="spacingS === DEFAULTS.spacingS" @click="spacingS = DEFAULTS.spacingS" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            </div>
            <div class="te-scale-row">
              <span class="te-scale-name">M</span>
              <input type="range" class="te-slider" min="0" max="96" v-model.number="spacingM" />
              <span class="te-scale-val">{{ spacingM }}px</span>
              <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingM !== DEFAULTS.spacingM }" :disabled="spacingM === DEFAULTS.spacingM" @click="spacingM = DEFAULTS.spacingM" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            </div>
            <div class="te-scale-row">
              <span class="te-scale-name">L</span>
              <input type="range" class="te-slider" min="0" max="96" v-model.number="spacingL" />
              <span class="te-scale-val">{{ spacingL }}px</span>
              <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingL !== DEFAULTS.spacingL }" :disabled="spacingL === DEFAULTS.spacingL" @click="spacingL = DEFAULTS.spacingL" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            </div>
            <div class="te-scale-row">
              <span class="te-scale-name">XL</span>
              <input type="range" class="te-slider" min="0" max="96" v-model.number="spacingXl" />
              <span class="te-scale-val">{{ spacingXl }}px</span>
              <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingXl !== DEFAULTS.spacingXl }" :disabled="spacingXl === DEFAULTS.spacingXl" @click="spacingXl = DEFAULTS.spacingXl" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            </div>
            <div class="te-scale-row">
              <span class="te-scale-name">XXL</span>
              <input type="range" class="te-slider" min="0" max="96" v-model.number="spacingXxl" />
              <span class="te-scale-val">{{ spacingXxl }}px</span>
              <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': spacingXxl !== DEFAULTS.spacingXxl }" :disabled="spacingXxl === DEFAULTS.spacingXxl" @click="spacingXxl = DEFAULTS.spacingXxl" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            </div>
          </div>
          <div class="te-section">
            <div class="te-section-label">Component density</div>
            <CoarSegmentedControl v-model="density" :options="DENSITY_OPTIONS" size="s" full-width />
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
            <CoarFormField label="Corner radius" class="te-field">
              <CoarSelect v-model="inputRadius" :options="RADIUS_OPTIONS" size="s" />
            </CoarFormField>
          </div>
          <div class="te-section">
            <div class="te-section-label">
              Horizontal padding
              <CoarSwitch v-model="inputPaddingXEnabled" label="Override" size="s" style="margin-left:auto" />
            </div>
            <div class="te-scale-row" :class="{ 'te-scale-row--disabled': !inputPaddingXEnabled }">
              <input type="range" class="te-slider" min="4" max="32" step="1" v-model.number="inputPaddingX" :disabled="!inputPaddingXEnabled" />
              <span class="te-scale-val">{{ inputPaddingXEnabled ? inputPaddingX + 'px' : 'auto' }}</span>
              <button class="te-icon-btn te-icon-btn--reset" :class="{ 'te-icon-btn--changed': inputPaddingXEnabled }" :disabled="!inputPaddingXEnabled" @click="inputPaddingXEnabled = false; inputPaddingX = DEFAULTS.inputPaddingX" title="Reset"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            </div>
            <p class="te-hint">
              <template v-if="inputPaddingXEnabled">Fixed override — CSS default ignored.</template>
              <template v-else>Auto: <code>calc(spacing-s + spacing-xs)</code></template>
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
            <CoarFormField label="Corner radius" class="te-field">
              <CoarSelect v-model="buttonRadius" :options="RADIUS_OPTIONS" size="s" />
            </CoarFormField>
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
              <CoarSelect v-model="tagRadius" :options="RADIUS_OPTIONS" size="s" style="flex:1" />
            </div>
            <div class="te-radius-row" style="margin-top:8px">
              <span class="te-radius-label">Badge</span>
              <CoarSelect v-model="badgeRadius" :options="RADIUS_OPTIONS" size="s" style="flex:1" />
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
            <CoarFormField label="Corner radius" class="te-field">
              <CoarSelect v-model="cardRadius" :options="RADIUS_OPTIONS" size="s" />
            </CoarFormField>
          </div>
          <div class="te-section">
            <CoarFormField label="Shadow" class="te-field">
              <CoarSelect v-model="cardShadow" :options="SHADOW_OPTIONS" size="s" />
            </CoarFormField>
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
              <CoarSelect :model-value="row.v" @update:model-value="row.set($event as string)" :options="RADIUS_OPTIONS" size="s" style="flex:1" />
            </div>
          </div>
          <div class="te-section">
            <div class="te-section-label">Shadow</div>
            <div v-for="row in [{ label:'Menu', v: menuShadow, set:(v:string)=>menuShadow=v }, { label:'Popover', v: popoverShadow, set:(v:string)=>popoverShadow=v }, { label:'Dropdown', v: dropdownShadow, set:(v:string)=>dropdownShadow=v }]" :key="row.label" class="te-radius-row">
              <span class="te-radius-label">{{ row.label }}</span>
              <CoarSelect :model-value="row.v" @update:model-value="row.set($event as string)" :options="SHADOW_OPTIONS" size="s" style="flex:1" />
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
              <CoarSelect :model-value="row.v" @update:model-value="row.set($event as string)" :options="RADIUS_OPTIONS" size="s" style="flex:1" />
            </div>
          </div>
          <div class="te-section">
            <div class="te-section-label">Shadow</div>
            <div v-for="row in [{ label:'Dialog', v: dialogShadow, set:(v:string)=>dialogShadow=v }, { label:'Toast', v: toastShadow, set:(v:string)=>toastShadow=v }]" :key="row.label" class="te-radius-row">
              <span class="te-radius-label">{{ row.label }}</span>
              <CoarSelect :model-value="row.v" @update:model-value="row.set($event as string)" :options="SHADOW_OPTIONS" size="s" style="flex:1" />
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
      <CoarButton variant="primary" size="m" full-width :disabled="!hasChanges" @click="downloadCSS">
        <template #prefix><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg></template>
        Download CSS
      </CoarButton>
      <p class="te-footer-hint">Apply with <code>&lt;html class="coar-theme--{{ themeName || 'custom' }}"&gt;</code></p>
    </footer>

    <!-- Palette editor modals -->
    <CoarPaletteEditor v-if="activePalette === 'accent'"  label="Accent"          css-family="accent" :base-color="accent"     :steps="PALETTE_STEPS.accent"  :model-value="paletteOverrides.accent"  @update:model-value="paletteOverrides.accent = $event"  @close="activePalette = null" />
    <CoarPaletteEditor v-if="activePalette === 'error'"   label="Error (red)"     css-family="red"    :base-color="errorColor" :steps="PALETTE_STEPS.error"   :model-value="paletteOverrides.error"   @update:model-value="paletteOverrides.error = $event"   @close="activePalette = null" />
    <CoarPaletteEditor v-if="activePalette === 'success'" label="Success (green)" css-family="green"  :base-color="success"    :steps="PALETTE_STEPS.success" :model-value="paletteOverrides.success" @update:model-value="paletteOverrides.success = $event" @close="activePalette = null" />
    <CoarPaletteEditor v-if="activePalette === 'warning'" label="Warning (amber)" css-family="amber"  :base-color="warning"    :steps="PALETTE_STEPS.warning" :model-value="paletteOverrides.warning" @update:model-value="paletteOverrides.warning = $event" @close="activePalette = null" />
    <CoarPaletteEditor v-if="activePalette === 'info'"    label="Info (slate)"    css-family="slate"  :base-color="info"       :steps="PALETTE_STEPS.info"    :model-value="paletteOverrides.info"    @update:model-value="paletteOverrides.info = $event"    @close="activePalette = null" />

  </aside>
</template>

<style scoped>
/* ── Panel frame ──────────────────────────────────────────────
   The outer positioning (.te-overlay-panel) lives in CoarThemeEditor.vue's global style.
   These are the interior panel styles. */
.te-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--coar-body-base-family, Poppins, sans-serif);
  font-size: 13px;
  color: var(--coar-text-neutral-primary, #1a1a1a);
}

/* ── Header ──────────────────────────────────────────── */
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

/* ── Icon buttons ────────────────────────────────────── */
.te-icon-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  border: none; background: transparent; cursor: pointer;
  color: var(--coar-text-neutral-tertiary, #8c8c8c);
  border-radius: 6px; padding: 0; width: 28px; height: 28px;
  font-size: 12px; font-weight: 500;
  transition: background 0.12s, color 0.12s;
}
.te-icon-btn:hover { background: var(--coar-background-neutral-secondary, #f5f5f5); color: var(--coar-text-neutral-primary, #1a1a1a); }
.te-icon-btn--reset { width: 22px; height: 22px; flex-shrink: 0; color: var(--coar-border-neutral-tertiary, #ccc); }
.te-icon-btn--reset:disabled { cursor: default; }
.te-icon-btn--reset:not(:disabled):hover { background: var(--coar-background-neutral-secondary, #f0f0f0); color: var(--coar-text-neutral-secondary, #555); }
.te-icon-btn--changed { color: var(--coar-background-accent-primary, #1183CD) !important; }

/* ── Body ────────────────────────────────────────────── */
.te-body { flex: 1; overflow-y: auto; }

/* ── Presets section ─────────────────────────────────── */
.te-presets-section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
}

/* ── Accordion ───────────────────────────────────────── */
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

/* ── Accordion body & inner sections ─────────────────── */
.te-accordion-body .te-section { border-bottom: none; }
.te-accordion-body .te-section + .te-section {
  border-top: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
}

/* ── Components divider ──────────────────────────────── */
.te-components-divider {
  padding: 7px 16px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
  color: var(--coar-text-neutral-tertiary, #8c8c8c);
  background: var(--coar-background-neutral-secondary, #f8f8f8);
  border-top: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
}

/* ── Section ─────────────────────────────────────────── */
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

/* CoarFormField used as a single-field label for the radius/shadow selects.
   The primitive doesn't add its own label→control gap, so restore the
   standard one here (same token the date-time pickers use). */
.te-field :deep(.coar-form-field__label) {
  margin-bottom: var(--coar-component-s-label-margin, 6px);
}
.te-badge {
  text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 10px;
  background: var(--coar-background-neutral-secondary, #f0f0f0);
  color: var(--coar-text-neutral-secondary, #595959);
  padding: 1px 7px; border-radius: 99px;
}

/* ── Presets ─────────────────────────────────────────── */
.te-preset-grid { display: flex; flex-direction: column; gap: 6px; }
.te-preset-card {
  display: flex; flex-direction: column; gap: 2px; text-align: left;
  padding: 10px 12px; border-radius: var(--coar-card-radius, 6px);
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

/* ── Color rows ──────────────────────────────────────── */
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

/* ── Palette button ──────────────────────────────────── */
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

/* ── Radius rows ─────────────────────────────────────── */
.te-radius-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.te-radius-row:last-child { margin-bottom: 0; }
.te-radius-label { width: 56px; flex-shrink: 0; font-size: 12px; color: var(--coar-text-neutral-secondary, #595959); }

/* ── Typography ──────────────────────────────────────── */
.te-font-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.te-font-label { width: 36px; flex-shrink: 0; font-size: 12px; color: var(--coar-text-neutral-secondary, #595959); }
.te-font-preview { margin: 10px 0 0; font-size: 12px; color: var(--coar-text-neutral-secondary, #595959); line-height: 1.5; }
.te-font-preview--title { font-size: 15px; font-weight: 700; margin-top: 4px; color: var(--coar-text-neutral-primary, #1a1a1a); }

/* ── Scale rows (sliders) ────────────────────────────── */
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

/* ── Hint text ───────────────────────────────────────── */
.te-hint { font-size: 11px; color: var(--coar-text-neutral-tertiary, #8c8c8c); line-height: 1.45; margin: 0; }
.te-hint code { font-family: ui-monospace, monospace; font-size: 10px; }

/* ── Disabled scale row ──────────────────────────────── */
.te-scale-row--disabled { opacity: 0.4; pointer-events: none; }

/* ── Semantic rows ───────────────────────────────────── */
.te-sem-row { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
.te-sem-row:last-child { margin-bottom: 0; }
.te-sem-swatch { width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
.te-sem-label { flex: 1; font-size: 12px; color: var(--coar-text-neutral-primary, #1a1a1a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Footer ──────────────────────────────────────────── */
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
.te-footer-hint { margin: 8px 0 0; font-size: 11px; color: var(--coar-text-neutral-tertiary, #8c8c8c); line-height: 1.4; }
.te-footer-hint code { font-family: ui-monospace, monospace; font-size: 10px; }
</style>
