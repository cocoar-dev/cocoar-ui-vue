<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';

export interface StepDef {
  step: number;
  defL: number | null; // null = step 500 (base color itself)
  defC: number | null;
}

export interface StepOverride { l: number; c: number }

const props = defineProps<{
  label: string;
  baseColor: string;
  cssFamily: string;           // 'accent' | 'red' | 'green' | 'amber' | 'slate'
  steps: StepDef[];
  modelValue: Record<number, StepOverride>;
}>();

const emit = defineEmits<{
  'update:modelValue': [v: Record<number, StepOverride>];
  'close': [];
}>();

/* ── drag ────────────────────────────────────────────────────── */
const pos    = ref({ x: Math.max(0, window.innerWidth / 2 - 220), y: 80 });
const origin = ref({ x: 0, y: 0, px: 0, py: 0 });
const isDragging = ref(false);

function startDrag(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('button,input')) return;
  isDragging.value = true;
  origin.value = { x: e.clientX, y: e.clientY, px: pos.value.x, py: pos.value.y };
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
  e.preventDefault();
}
function onDrag(e: MouseEvent) {
  pos.value = {
    x: origin.value.px + (e.clientX - origin.value.x),
    y: origin.value.py + (e.clientY - origin.value.y),
  };
}
function stopDrag() {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}
onUnmounted(() => stopDrag());

/* ── palette logic ───────────────────────────────────────────── */
function swatchStyle(s: StepDef): Record<string, string> {
  if (s.defL === null) return { background: props.baseColor };
  const ov = props.modelValue[s.step];
  const l  = ov?.l ?? s.defL!;
  const c  = ov?.c ?? s.defC!;
  return { background: `oklch(from ${props.baseColor} ${l} ${c} h)` };
}

function getL(s: StepDef) { return props.modelValue[s.step]?.l ?? s.defL ?? 0; }
function getC(s: StepDef) { return props.modelValue[s.step]?.c ?? s.defC ?? 0; }

function setL(s: StepDef, val: number) {
  const cur = props.modelValue[s.step] ?? { l: s.defL!, c: s.defC! };
  emit('update:modelValue', { ...props.modelValue, [s.step]: { ...cur, l: val } });
}
function setC(s: StepDef, val: number) {
  const cur = props.modelValue[s.step] ?? { l: s.defL!, c: s.defC! };
  emit('update:modelValue', { ...props.modelValue, [s.step]: { ...cur, c: val } });
}
function resetStep(s: StepDef) {
  const next = { ...props.modelValue };
  delete next[s.step];
  emit('update:modelValue', next);
}

const hasAnyOverride = computed(() => Object.keys(props.modelValue).length > 0);
function resetAll() { emit('update:modelValue', {}); }
function isChanged(s: StepDef) {
  const ov = props.modelValue[s.step];
  return !!ov && (ov.l !== s.defL || ov.c !== s.defC);
}
</script>

<template>
  <Teleport to="body">
    <div
      class="cpe-modal"
      :class="{ 'cpe-modal--dragging': isDragging }"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      role="dialog"
      :aria-label="`${label} palette editor`"
    >
      <!-- ── Title bar (drag handle) ── -->
      <div class="cpe-titlebar" @mousedown="startDrag">
        <svg class="cpe-drag-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        <span class="cpe-title">{{ label }}</span>
        <span class="cpe-subtitle">50–900 · oklch hue</span>
        <div class="cpe-titlebar-actions">
          <button v-if="hasAnyOverride" class="cpe-reset-all" @click="resetAll">Reset all</button>
          <button class="cpe-close" @click="$emit('close')" aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- ── Swatch strip ── -->
      <div class="cpe-strip">
        <div
          v-for="s in steps"
          :key="s.step"
          class="cpe-strip-swatch"
          :class="{ 'cpe-strip-swatch--changed': isChanged(s) }"
          :style="swatchStyle(s)"
          :title="`${s.step}`"
        >
          <span class="cpe-strip-label">{{ s.step }}</span>
        </div>
      </div>

      <!-- ── Step rows ── -->
      <div class="cpe-rows">
        <div
          v-for="s in steps"
          :key="s.step"
          class="cpe-row"
          :class="{ 'cpe-row--changed': isChanged(s) }"
        >
          <div class="cpe-row-swatch" :style="swatchStyle(s)" />
          <span class="cpe-row-step">{{ s.step }}</span>

          <!-- step 500 = base, not editable -->
          <template v-if="s.defL === null">
            <span class="cpe-row-base">← base color (set in Brand tab)</span>
          </template>

          <template v-else>
            <div class="cpe-sliders">
              <div class="cpe-slider-row">
                <span class="cpe-lbl">L</span>
                <input
                  type="range" min="0" max="1" step="0.005"
                  :value="getL(s)"
                  @input="setL(s, +($event.target as HTMLInputElement).value)"
                />
                <span class="cpe-val">{{ getL(s).toFixed(3) }}</span>
              </div>
              <div class="cpe-slider-row">
                <span class="cpe-lbl">C</span>
                <input
                  type="range" min="0" max="0.4" step="0.002"
                  :value="getC(s)"
                  @input="setC(s, +($event.target as HTMLInputElement).value)"
                />
                <span class="cpe-val">{{ getC(s).toFixed(3) }}</span>
              </div>
            </div>
            <button
              class="cpe-reset-btn"
              :class="{ 'cpe-reset-btn--on': isChanged(s) }"
              :disabled="!isChanged(s)"
              title="Reset this step"
              @click="resetStep(s)"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Modal shell ── */
.cpe-modal {
  position: fixed;
  z-index: 9999;
  width: 400px;
  background: var(--coar-background-neutral-primary, #fff);
  border: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,.14), 0 2px 6px rgba(0,0,0,.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  font-family: var(--coar-body-base-family, Poppins, sans-serif);
  font-size: 13px;
}
.cpe-modal--dragging { cursor: grabbing; }

/* ── Title bar ── */
.cpe-titlebar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 10px 9px 12px;
  background: var(--coar-background-neutral-secondary, #f8f8f8);
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
  cursor: grab;
}
.cpe-modal--dragging .cpe-titlebar { cursor: grabbing; }

.cpe-drag-icon { color: var(--coar-text-neutral-tertiary, #ccc); flex-shrink: 0; }
.cpe-title { font-size: 13px; font-weight: 600; color: var(--coar-text-neutral-primary, #1a1a1a); }
.cpe-subtitle { font-size: 10px; color: var(--coar-text-neutral-tertiary, #8c8c8c); }
.cpe-titlebar-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }

.cpe-reset-all {
  font-size: 11px; color: var(--coar-background-accent-primary, #1183CD);
  border: none; background: transparent; cursor: pointer; padding: 0; font-family: inherit;
}
.cpe-reset-all:hover { text-decoration: underline; }

.cpe-close {
  width: 24px; height: 24px; border: none; background: transparent;
  color: var(--coar-text-neutral-tertiary, #8c8c8c);
  cursor: pointer; border-radius: 5px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s;
}
.cpe-close:hover {
  background: var(--coar-background-neutral-tertiary, #ebebeb);
  color: var(--coar-text-neutral-primary, #1a1a1a);
}

/* ── Swatch strip ── */
.cpe-strip {
  display: flex;
  height: 32px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
}
.cpe-strip-swatch {
  flex: 1;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 3px;
}
.cpe-strip-label {
  font-size: 7px;
  font-weight: 700;
  color: rgba(255,255,255,.75);
  text-shadow: 0 1px 2px rgba(0,0,0,.4);
  line-height: 1;
}
.cpe-strip-swatch--changed::after {
  content: '';
  position: absolute;
  top: 5px; left: 50%;
  transform: translateX(-50%);
  width: 4px; height: 4px;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 0 2px rgba(0,0,0,.3);
}

/* ── Rows ── */
.cpe-rows {
  overflow-y: auto;
  max-height: 460px;
}
.cpe-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-bottom: 1px solid var(--coar-border-neutral-tertiary, #f0f0f0);
  transition: background 0.1s;
}
.cpe-row:last-child { border-bottom: none; }
.cpe-row:hover { background: var(--coar-background-neutral-secondary, #fafafa); }
.cpe-row--changed {
  background: color-mix(in srgb, var(--coar-background-accent-primary, #1183CD) 5%, transparent);
}

.cpe-row-swatch {
  width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.07);
}
.cpe-row-step {
  width: 30px; flex-shrink: 0;
  font-size: 11px; font-weight: 700;
  color: var(--coar-text-neutral-tertiary, #8c8c8c);
}
.cpe-row-base {
  flex: 1; font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #8c8c8c); font-style: italic;
}

/* ── Sliders ── */
.cpe-sliders { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.cpe-slider-row { display: flex; align-items: center; gap: 6px; }
.cpe-lbl {
  width: 10px; font-size: 9px; font-weight: 700;
  color: var(--coar-text-neutral-tertiary, #bbb); flex-shrink: 0;
}
.cpe-slider-row input[type="range"] {
  flex: 1; accent-color: var(--coar-background-accent-primary, #1183CD);
  height: 14px; cursor: pointer; border: none; outline: none; background: transparent;
}
.cpe-val {
  width: 36px; text-align: right; flex-shrink: 0;
  font-size: 10px; font-family: ui-monospace, monospace;
  color: var(--coar-text-neutral-secondary, #595959);
}

/* ── Reset button ── */
.cpe-reset-btn {
  width: 22px; height: 22px; border: none; background: transparent;
  color: var(--coar-border-neutral-tertiary, #ddd);
  cursor: pointer; border-radius: 4px; padding: 0; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s;
}
.cpe-reset-btn:disabled { cursor: default; }
.cpe-reset-btn--on { color: var(--coar-background-accent-primary, #1183CD); }
.cpe-reset-btn:not(:disabled):hover {
  background: var(--coar-background-neutral-secondary, #f0f0f0);
  color: var(--coar-text-neutral-secondary, #595959);
}
</style>
