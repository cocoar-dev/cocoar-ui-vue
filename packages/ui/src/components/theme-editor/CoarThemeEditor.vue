<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{ hideDarkToggle?: boolean }>(), {
  hideDarkToggle: false,
});

const isOpen = ref(false);
const isDark = ref(false);

const DEFAULTS = {
  accent:  '#1183CD',
  success: '#1e8f48',
  error:   '#d63b3b',
  warning: '#cc821f',
  info:    '#5e6b84',
  radiusScale: 1,
  fontBody:  'Poppins',
  fontTitle: 'Inter',
};

const accent       = ref(DEFAULTS.accent);
const success      = ref(DEFAULTS.success);
const errorColor   = ref(DEFAULTS.error);
const warning      = ref(DEFAULTS.warning);
const info         = ref(DEFAULTS.info);
const radiusScale  = ref(DEFAULTS.radiusScale);
const fontBody     = ref(DEFAULTS.fontBody);
const fontTitle    = ref(DEFAULTS.fontTitle);

const BASE_RADIUS: Record<string, number> = {
  xxs: 1, xs: 2, s: 3, m: 4, l: 5, xl: 6,
};

const FONT_OPTIONS_BODY  = ['Poppins', 'Inter', 'DM Sans', 'Nunito', 'system-ui'];
const FONT_OPTIONS_TITLE = ['Inter', 'Poppins', 'DM Sans', 'Nunito', 'system-ui'];

function applyTokens() {
  const r = document.documentElement;
  r.style.setProperty('--coar-accent',  accent.value);
  r.style.setProperty('--coar-success', success.value);
  r.style.setProperty('--coar-error',   errorColor.value);
  r.style.setProperty('--coar-warning', warning.value);
  r.style.setProperty('--coar-info',    info.value);

  const s = radiusScale.value;
  for (const [key, base] of Object.entries(BASE_RADIUS)) {
    r.style.setProperty(`--coar-radius-${key}`, `${Math.round(base * s)}px`);
  }

  r.style.setProperty('--coar-font-family-body',  `${fontBody.value}, ui-sans-serif, system-ui, sans-serif`);
  r.style.setProperty('--coar-font-family-title', `${fontTitle.value}, ui-sans-serif, system-ui, sans-serif`);

  if (isDark.value) r.classList.add('dark-mode');
  else              r.classList.remove('dark-mode');
}

watch([accent, success, errorColor, warning, info, radiusScale, fontBody, fontTitle, isDark], applyTokens);

function reset() {
  accent.value      = DEFAULTS.accent;
  success.value     = DEFAULTS.success;
  errorColor.value  = DEFAULTS.error;
  warning.value     = DEFAULTS.warning;
  info.value        = DEFAULTS.info;
  radiusScale.value = DEFAULTS.radiusScale;
  fontBody.value    = DEFAULTS.fontBody;
  fontTitle.value   = DEFAULTS.fontTitle;
  isDark.value      = false;

  const r = document.documentElement;
  r.classList.remove('dark-mode');
  for (const key of ['--coar-accent', '--coar-success', '--coar-error', '--coar-warning', '--coar-info',
    '--coar-font-family-body', '--coar-font-family-title',
    ...Object.keys(BASE_RADIUS).map(k => `--coar-radius-${k}`)]) {
    r.style.removeProperty(key);
  }
}

function hasChanges() {
  return (
    accent.value      !== DEFAULTS.accent  ||
    success.value     !== DEFAULTS.success ||
    errorColor.value  !== DEFAULTS.error   ||
    warning.value     !== DEFAULTS.warning ||
    info.value        !== DEFAULTS.info    ||
    radiusScale.value !== DEFAULTS.radiusScale ||
    fontBody.value    !== DEFAULTS.fontBody    ||
    fontTitle.value   !== DEFAULTS.fontTitle
  );
}

function downloadCSS() {
  const lines: string[] = [':root {'];

  if (accent.value      !== DEFAULTS.accent)   lines.push(`  --coar-accent: ${accent.value};`);
  if (success.value     !== DEFAULTS.success)  lines.push(`  --coar-success: ${success.value};`);
  if (errorColor.value  !== DEFAULTS.error)    lines.push(`  --coar-error: ${errorColor.value};`);
  if (warning.value     !== DEFAULTS.warning)  lines.push(`  --coar-warning: ${warning.value};`);
  if (info.value        !== DEFAULTS.info)     lines.push(`  --coar-info: ${info.value};`);

  if (radiusScale.value !== DEFAULTS.radiusScale) {
    const s = radiusScale.value;
    for (const [key, base] of Object.entries(BASE_RADIUS)) {
      lines.push(`  --coar-radius-${key}: ${Math.round(base * s)}px;`);
    }
  }

  if (fontBody.value  !== DEFAULTS.fontBody)
    lines.push(`  --coar-font-family-body: ${fontBody.value}, ui-sans-serif, system-ui, sans-serif;`);
  if (fontTitle.value !== DEFAULTS.fontTitle)
    lines.push(`  --coar-font-family-title: ${fontTitle.value}, ui-sans-serif, system-ui, sans-serif;`);

  lines.push('}');

  const blob = new Blob([lines.join('\n')], { type: 'text/css' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'coar-theme.css';
  a.click();
  URL.revokeObjectURL(a.href);
}

const radiusLabel = (v: number) => {
  if (v === 0) return 'Sharp';
  if (v < 0.8) return 'Minimal';
  if (v < 1.3) return 'Default';
  if (v < 2.5) return 'Rounded';
  return 'Pill';
};
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
        <circle cx="13.5" cy="6.5" r="1.5" /><circle cx="17.5" cy="10.5" r="1.5" />
        <circle cx="8.5" cy="7.5" r="1.5" /><circle cx="6.5" cy="12.5" r="1.5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </svg>
    </button>

    <!-- Panel -->
    <Transition name="te-slide">
      <aside v-if="isOpen" class="te-panel">
        <header class="te-panel-header">
          <span class="te-panel-title">Theme Editor</span>
          <div class="te-header-actions">
            <button v-if="hasChanges()" class="te-btn te-btn--ghost te-btn--sm" @click="reset">Reset</button>
            <button class="te-btn te-btn--ghost te-btn--sm te-close" @click="isOpen = false">✕</button>
          </div>
        </header>

        <div class="te-body">

          <!-- Dark mode -->
          <section v-if="!props.hideDarkToggle" class="te-section">
            <label class="te-section-label">Mode</label>
            <div class="te-mode-toggle">
              <button class="te-mode-btn" :class="{ active: !isDark }" @click="isDark = false">☀ Light</button>
              <button class="te-mode-btn" :class="{ active: isDark  }" @click="isDark = true">☾ Dark</button>
            </div>
          </section>

          <!-- Brand color -->
          <section class="te-section">
            <label class="te-section-label">Brand</label>
            <div class="te-color-row">
              <input type="color" class="te-color-swatch" v-model="accent" :title="accent" />
              <span class="te-color-label">Accent</span>
              <code class="te-color-value">{{ accent }}</code>
            </div>
          </section>

          <!-- Status colors -->
          <section class="te-section">
            <label class="te-section-label">Status Colors</label>
            <div class="te-color-row">
              <input type="color" class="te-color-swatch te-swatch--success" v-model="success" />
              <span class="te-color-label">Success</span>
              <code class="te-color-value">{{ success }}</code>
            </div>
            <div class="te-color-row">
              <input type="color" class="te-color-swatch te-swatch--error" v-model="errorColor" />
              <span class="te-color-label">Error</span>
              <code class="te-color-value">{{ errorColor }}</code>
            </div>
            <div class="te-color-row">
              <input type="color" class="te-color-swatch te-swatch--warning" v-model="warning" />
              <span class="te-color-label">Warning</span>
              <code class="te-color-value">{{ warning }}</code>
            </div>
            <div class="te-color-row">
              <input type="color" class="te-color-swatch te-swatch--info" v-model="info" />
              <span class="te-color-label">Info</span>
              <code class="te-color-value">{{ info }}</code>
            </div>
          </section>

          <!-- Shape -->
          <section class="te-section">
            <label class="te-section-label">
              Shape
              <span class="te-section-badge">{{ radiusLabel(radiusScale) }}</span>
            </label>
            <div class="te-slider-row">
              <span class="te-slider-end">■</span>
              <input type="range" class="te-slider" min="0" max="4" step="0.25" v-model.number="radiusScale" />
              <span class="te-slider-end">◉</span>
            </div>
            <div class="te-radius-preview">
              <div
                v-for="key in ['xxs','xs','s','m','l','xl']"
                :key="key"
                class="te-radius-swatch"
                :style="{ borderRadius: Math.round(BASE_RADIUS[key] * radiusScale) + 'px' }"
                :title="`--coar-radius-${key}: ${Math.round(BASE_RADIUS[key] * radiusScale)}px`"
              />
            </div>
          </section>

          <!-- Typography -->
          <section class="te-section">
            <label class="te-section-label">Typography</label>
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
            <p class="te-font-preview" :style="{ fontFamily: fontBody }">
              The quick brown fox jumps over the lazy dog.
            </p>
          </section>

        </div>

        <footer class="te-panel-footer">
          <button
            class="te-btn te-btn--primary te-btn--full"
            :disabled="!hasChanges()"
            @click="downloadCSS"
          >
            Download coar-theme.css
          </button>
          <p class="te-footer-hint">Import after <code>@cocoar/vue-ui/styles</code> in your app entry.</p>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── FAB ───────────────────────────────────────────────── */
.te-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--coar-accent, #1183CD);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  transition: transform 0.2s, box-shadow 0.2s;
}
.te-fab:hover    { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,.32); }
.te-fab--open    { transform: rotate(15deg); }

/* ── Panel ──────────────────────────────────────────────── */
.te-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  width: 300px;
  display: flex;
  flex-direction: column;
  background: var(--coar-surface-default, #fff);
  border-left: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  box-shadow: -4px 0 24px rgba(0,0,0,.12);
  font-family: var(--coar-font-family-body, Poppins, sans-serif);
  font-size: 13px;
}

.te-slide-enter-active,
.te-slide-leave-active { transition: transform 0.25s cubic-bezier(.4,0,.2,1); }
.te-slide-enter-from,
.te-slide-leave-to    { transform: translateX(100%); }

/* ── Header ─────────────────────────────────────────────── */
.te-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  gap: 8px;
  flex-shrink: 0;
}
.te-panel-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--coar-text-neutral-primary, #333);
}
.te-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ── Body ───────────────────────────────────────────────── */
.te-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 8px;
}

/* ── Section ────────────────────────────────────────────── */
.te-section {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
}
.te-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--coar-text-neutral-tertiary, #888);
  margin-bottom: 10px;
}
.te-section-badge {
  font-size: 10px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  background: var(--coar-background-neutral-secondary, #f0f0f0);
  color: var(--coar-text-neutral-secondary, #555);
  padding: 1px 6px;
  border-radius: 99px;
}

/* ── Mode Toggle ────────────────────────────────────────── */
.te-mode-toggle {
  display: flex;
  border: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;
}
.te-mode-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 6px 0;
  font-size: 13px;
  cursor: pointer;
  color: var(--coar-text-neutral-secondary, #666);
  transition: background 0.15s, color 0.15s;
}
.te-mode-btn.active {
  background: var(--coar-accent, #1183CD);
  color: #fff;
  font-weight: 500;
}

/* ── Color rows ─────────────────────────────────────────── */
.te-color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.te-color-row:last-child { margin-bottom: 0; }

.te-color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 2px solid var(--coar-border-neutral-primary, #e0e0e0);
  padding: 0;
  cursor: pointer;
  background: none;
  flex-shrink: 0;
  overflow: hidden;
}
.te-color-swatch::-webkit-color-swatch-wrapper { padding: 0; }
.te-color-swatch::-webkit-color-swatch         { border: none; border-radius: 4px; }

.te-color-label {
  flex: 1;
  color: var(--coar-text-neutral-primary, #333);
}
.te-color-value {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #888);
  font-family: ui-monospace, monospace;
}

/* ── Radius ─────────────────────────────────────────────── */
.te-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.te-slider-end {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary, #aaa);
  flex-shrink: 0;
}
.te-slider {
  flex: 1;
  accent-color: var(--coar-accent, #1183CD);
  cursor: pointer;
}

.te-radius-preview {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}
.te-radius-swatch {
  width: 28px;
  height: 28px;
  background: var(--coar-background-accent-subtle, #e8f1fb);
  border: 2px solid var(--coar-border-accent-primary, #1183CD);
  transition: border-radius 0.2s;
}

/* ── Typography ─────────────────────────────────────────── */
.te-font-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.te-font-label {
  width: 36px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #888);
}
.te-select {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  border-radius: 5px;
  background: var(--coar-surface-default, #fff);
  color: var(--coar-text-neutral-primary, #333);
  font-size: 13px;
  cursor: pointer;
  outline: none;
}
.te-select:focus {
  border-color: var(--coar-accent, #1183CD);
  box-shadow: 0 0 0 2px oklch(from var(--coar-accent, #1183CD) l c h / 0.2);
}
.te-font-preview {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--coar-text-neutral-secondary, #555);
  line-height: 1.4;
}

/* ── Footer ─────────────────────────────────────────────── */
.te-panel-footer {
  padding: 14px 16px;
  border-top: 1px solid var(--coar-border-neutral-primary, #e0e0e0);
  flex-shrink: 0;
}
.te-footer-hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #999);
  line-height: 1.4;
}
.te-footer-hint code {
  font-family: ui-monospace, monospace;
  font-size: 10px;
}

/* ── Shared buttons ─────────────────────────────────────── */
.te-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  padding: 5px 10px;
}
.te-btn--sm      { padding: 3px 8px; font-size: 11px; }
.te-btn--full    { width: 100%; padding: 9px; font-size: 13px; }
.te-btn--ghost   { background: transparent; color: var(--coar-text-neutral-secondary, #666); }
.te-btn--ghost:hover { background: var(--coar-background-neutral-secondary, #f0f0f0); }
.te-btn--primary {
  background: var(--coar-accent, #1183CD);
  color: #fff;
}
.te-btn--primary:hover:not(:disabled) {
  background: oklch(from var(--coar-accent, #1183CD) calc(l - 0.05) c h);
}
.te-btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.te-close { font-size: 14px; }
</style>
