<script setup lang="ts">
/**
 * Phase 0 stress demo — 2D virtualized grid (1.000 × 1.000).
 *
 * Validates `<VirtualizedSurface2D>` against the same Tier A bar as
 * the 1D pages: 0 long frames + worst frame < 50 ms during real-user
 * wheel-scroll. The 2D surface is a separate Vue component from the
 * 1D one — they share NOTHING at the Vue layer, only the framework-
 * agnostic `core/` primitives. Adding 2D therefore cannot regress 1D.
 */

import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import {
  VirtualizedSurface2D,
  type Range2D,
} from '@cocoar/vue-calendar';

const COLS = 1000;
const ROWS = 1000;
const CELL_W = 80;
const CELL_H = 56;

const surfaceRef = useTemplateRef<InstanceType<typeof VirtualizedSurface2D>>('surface');

const range = ref<Range2D>({
  x: { startIndex: 0, endIndex: 0, offset: 0, totalSize: 0 },
  y: { startIndex: 0, endIndex: 0, offset: 0, totalSize: 0 },
});

function onRangeChange(r: Range2D) { range.value = r; }

// ─── Long Animation Frames (authoritative) ────────────────────────────

const loafSupported = ref(false);
const loafCount = ref(0);
const loafWorst = ref(0);

interface LoAFEntry { t: number; duration: number }
const loafRecent: LoAFEntry[] = [];
let loafObserver: PerformanceObserver | null = null;

function recomputeLoaf() {
  const cutoff = performance.now() - 5000;
  while (loafRecent.length > 0 && loafRecent[0].t < cutoff) loafRecent.shift();
  loafCount.value = loafRecent.length;
  let worst = 0;
  for (const e of loafRecent) if (e.duration > worst) worst = e.duration;
  loafWorst.value = Math.round(worst);
}

let loafSweepHandle = 0;
function loafSweep() {
  recomputeLoaf();
  loafSweepHandle = window.setTimeout(loafSweep, 500);
}

// ─── rAF FPS (advisory) ──────────────────────────────────────────────

const fpsMean = ref(0);
const fpsMin = ref(0);

const SAMPLES_FOR_MEAN = 60;
const SAMPLES_FOR_MIN_S = 5;

let rafHandle = 0;
let lastTs = 0;
const recentDeltas: number[] = [];
const recentForMin: { t: number; fps: number }[] = [];

function loop(ts: number) {
  if (lastTs > 0) {
    const delta = ts - lastTs;
    if (delta > 0 && delta < 1000) {
      recentDeltas.push(delta);
      if (recentDeltas.length > SAMPLES_FOR_MEAN) recentDeltas.shift();
      const mean = recentDeltas.reduce((s, x) => s + x, 0) / recentDeltas.length;
      fpsMean.value = Math.round(1000 / mean);

      const fps = 1000 / delta;
      recentForMin.push({ t: ts, fps });
      const cutoff = ts - SAMPLES_FOR_MIN_S * 1000;
      while (recentForMin.length > 0 && recentForMin[0].t < cutoff) recentForMin.shift();
      let mn = Infinity;
      for (const s of recentForMin) if (s.fps < mn) mn = s.fps;
      fpsMin.value = Math.round(mn);
    }
  }
  lastTs = ts;
  rafHandle = requestAnimationFrame(loop);
}

onMounted(() => {
  rafHandle = requestAnimationFrame(loop);

  type PEWithType = typeof PerformanceObserver & {
    supportedEntryTypes?: readonly string[];
  };
  const supports =
    typeof PerformanceObserver !== 'undefined' &&
    (PerformanceObserver as PEWithType).supportedEntryTypes?.includes(
      'long-animation-frame',
    );

  if (supports) {
    loafSupported.value = true;
    loafObserver = new PerformanceObserver((list) => {
      const now = performance.now();
      for (const entry of list.getEntries()) {
        loafRecent.push({ t: now, duration: entry.duration });
      }
      recomputeLoaf();
    });
    try {
      loafObserver.observe({ type: 'long-animation-frame', buffered: true });
    } catch {
      loafSupported.value = false;
    }
    loafSweep();
  }
});

onBeforeUnmount(() => {
  if (rafHandle) cancelAnimationFrame(rafHandle);
  if (loafSweepHandle) clearTimeout(loafSweepHandle);
  loafObserver?.disconnect();
});

// ─── Mouse-pan-to-scroll (demo-only) ──────────────────────────────────
//
// Pan-to-scroll is a consumer concern, not a Surface responsibility.
// The demo wires it up so the user can validate diagonal-scroll
// smoothness with a regular mouse, no touchpad / shift+wheel needed.

const isPanning = ref(false);
let panStartX = 0;
let panStartY = 0;
let panStartScrollX = 0;
let panStartScrollY = 0;
let panEl: HTMLElement | null = null;

function onPanStart(e: PointerEvent) {
  const el = (e.currentTarget as HTMLElement).querySelector(
    '.coar-virtualized-surface-2d',
  ) as HTMLElement | null;
  if (!el || e.button !== 0) return;
  panEl = el;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panStartScrollX = el.scrollLeft;
  panStartScrollY = el.scrollTop;
  isPanning.value = true;
  (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  e.preventDefault();
}
function onPanMove(e: PointerEvent) {
  if (!isPanning.value || !panEl) return;
  panEl.scrollLeft = panStartScrollX - (e.clientX - panStartX);
  panEl.scrollTop = panStartScrollY - (e.clientY - panStartY);
}
function onPanEnd(e: PointerEvent) {
  if (!isPanning.value) return;
  isPanning.value = false;
  panEl = null;
  (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
}

// ─── Controls ──────────────────────────────────────────────────────────

function jumpTopLeft() { surfaceRef.value?.scrollToCell({ x: 0, y: 0 }); }
function jumpBottomRight() { surfaceRef.value?.scrollToCell({ x: COLS - 1, y: ROWS - 1 }); }
function jumpRandom() {
  const x = Math.floor(Math.random() * COLS);
  const y = Math.floor(Math.random() * ROWS);
  surfaceRef.value?.scrollToCell({ x, y });
}
function jumpSmoothCenter() {
  surfaceRef.value?.scrollToCell({ x: COLS / 2, y: ROWS / 2 }, 'smooth');
}

const visibleCellCount = computed(() =>
  (range.value.x.endIndex - range.value.x.startIndex) *
  (range.value.y.endIndex - range.value.y.startIndex),
);
const totalCells = computed(() => COLS * ROWS);

function cellTone(x: number, y: number): string {
  const n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const hue = n % 360;
  return `hsl(${hue} 50% 92%)`;
}
function cellLabel(x: number, y: number): string {
  return `${x},${y}`;
}
</script>

<template>
  <div class="stress-demo">
    <div class="stress-demo__metrics" aria-live="polite">
      <div class="stress-demo__metric stress-demo__metric--authoritative">
        <span class="stress-demo__label">⚖ Long frames (5s)</span>
        <span
          class="stress-demo__value"
          :class="{
            'stress-demo__value--good': loafSupported && loafCount === 0,
            'stress-demo__value--ok': loafSupported && loafCount > 0 && loafCount <= 3,
            'stress-demo__value--bad': loafSupported && loafCount > 3,
          }"
        >{{ loafSupported ? loafCount : 'n/a' }}</span>
      </div>
      <div class="stress-demo__metric stress-demo__metric--authoritative">
        <span class="stress-demo__label">⚖ Worst frame (5s)</span>
        <span
          class="stress-demo__value"
          :class="{
            'stress-demo__value--good': loafSupported && loafWorst < 50,
            'stress-demo__value--ok': loafSupported && loafWorst >= 50 && loafWorst < 100,
            'stress-demo__value--bad': loafSupported && loafWorst >= 100,
          }"
        >{{ loafSupported ? `${loafWorst} ms` : 'n/a' }}</span>
      </div>
      <div class="stress-demo__metric stress-demo__metric--secondary">
        <span class="stress-demo__label">rAF FPS mean (advisory)</span>
        <span class="stress-demo__value stress-demo__value--secondary">{{ fpsMean || '—' }}</span>
      </div>
      <div class="stress-demo__metric stress-demo__metric--secondary">
        <span class="stress-demo__label">rAF FPS min (advisory)</span>
        <span class="stress-demo__value stress-demo__value--secondary">{{ fpsMin || '—' }}</span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Cells in DOM</span>
        <span class="stress-demo__value">{{ visibleCellCount }}</span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Range X</span>
        <span class="stress-demo__value">{{ range.x.startIndex }}–{{ range.x.endIndex }}</span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Range Y</span>
        <span class="stress-demo__value">{{ range.y.startIndex }}–{{ range.y.endIndex }}</span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Total cells</span>
        <span class="stress-demo__value">{{ totalCells.toLocaleString('en-US') }}</span>
      </div>
    </div>

    <div class="stress-demo__controls">
      <button class="stress-demo__btn" @click="jumpTopLeft">Top-left</button>
      <button class="stress-demo__btn" @click="jumpBottomRight">Bottom-right</button>
      <button class="stress-demo__btn" @click="jumpRandom">Random</button>
      <button class="stress-demo__btn" @click="jumpSmoothCenter">Smooth → center</button>
    </div>

    <p class="stress-demo__pan-help">
      <strong>Pan test:</strong> click and drag anywhere on the grid in
      any direction (X, Y, or diagonal). Touchpad two-finger pan and
      shift + wheel also work. ⚖ Long frames should stay at 0
      throughout.
    </p>

    <div
      class="stress-demo__pan-host"
      :class="{ 'stress-demo__pan-host--panning': isPanning }"
      @pointerdown="onPanStart"
      @pointermove="onPanMove"
      @pointerup="onPanEnd"
      @pointercancel="onPanEnd"
    >
      <VirtualizedSurface2D
        ref="surface"
        :item-count-x="COLS"
        :item-count-y="ROWS"
        :cell-width="CELL_W"
        :cell-height="CELL_H"
        :overscan-x="3"
        :overscan-y="3"
        class="stress-demo__surface"
        @range-change="onRangeChange"
      >
        <template #cell="{ x, y }">
          <div class="stress-demo__cell" :style="{ background: cellTone(x, y) }">
            {{ cellLabel(x, y) }}
          </div>
        </template>
      </VirtualizedSurface2D>
    </div>

    <p class="stress-demo__note">
      <strong>1 million cells total, ~ 350 in the DOM at any time.</strong>
      Scroll with the wheel (vertical) or shift-wheel (horizontal), or
      drag the scrollbars in either direction.
    </p>
  </div>
</template>

<style scoped>
.stress-demo {
  display: flex;
  flex-direction: column;
  gap: var(--coar-space-3, 12px);
}

.stress-demo__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--coar-space-2, 8px);
  padding: var(--coar-space-3, 12px);
  background: var(--coar-surface-subtle, #f6f7f9);
  border: 1px solid var(--coar-border-subtle, #e3e5e9);
  border-radius: var(--coar-radius-md, 8px);
  font-variant-numeric: tabular-nums;
}

.stress-demo__metric { display: flex; flex-direction: column; gap: 2px; }
.stress-demo__metric--authoritative {
  background: rgba(37, 99, 235, 0.06);
  border-radius: 4px;
  padding: 2px 6px;
  margin: -4px -2px;
}
.stress-demo__metric--secondary { opacity: 0.55; }

.stress-demo__label {
  font-size: var(--coar-font-size-xs, 11px);
  color: var(--coar-text-subtle, #6c7280);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stress-demo__value {
  font-size: var(--coar-font-size-lg, 18px);
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
}
.stress-demo__value--secondary { color: var(--coar-text-subtle, #6c7280); }
.stress-demo__value--good { color: var(--coar-color-success, #16a34a); }
.stress-demo__value--ok   { color: var(--coar-color-warning, #d97706); }
.stress-demo__value--bad  { color: var(--coar-color-danger,  #dc2626); }

.stress-demo__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--coar-space-2, 8px);
  align-items: center;
}

.stress-demo__btn {
  padding: 6px 12px;
  font-size: var(--coar-font-size-sm, 13px);
  background: var(--coar-surface-base, #fff);
  border: 1px solid var(--coar-border-base, #d1d5db);
  border-radius: var(--coar-radius-sm, 4px);
  color: var(--coar-text-base, #1a1c1f);
  cursor: pointer;
}
.stress-demo__btn:hover {
  background: var(--coar-surface-hover, #f3f4f6);
}

.stress-demo__surface {
  height: 600px;
  width: 100%;
  border: 1px solid var(--coar-border-base, #d1d5db);
  border-radius: var(--coar-radius-md, 8px);
  background: var(--coar-surface-base, #fff);
}

.stress-demo__pan-host {
  cursor: grab;
  user-select: none;
}
.stress-demo__pan-host--panning { cursor: grabbing; }

.stress-demo__pan-help {
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-subtle, #6c7280);
  background: rgba(37, 99, 235, 0.04);
  border-left: 3px solid var(--coar-color-accent, #2563eb);
  padding: 8px 12px;
  margin: 0;
  line-height: 1.55;
}

.stress-demo__cell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--coar-text-subtle, #4b5563);
  border: 1px solid var(--coar-border-subtle, #e3e5e9);
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, monospace;
  box-sizing: border-box;
}

.stress-demo__note {
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-subtle, #6c7280);
  margin: 0;
}
</style>
