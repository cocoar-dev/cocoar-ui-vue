<script setup lang="ts">
/**
 * Phase 0 stress harness — 2D virtualized grid, playground host.
 *
 * Validates `<VirtualizedSurface2D>` against the same authoritative
 * Tier A bar as the 1D pages: 0 long frames, worst frame < 50 ms,
 * during diagonal wheel scroll on a 1.000 × 1.000 grid (= 1 M cells
 * total, ~200 visible at any time).
 *
 * The 2D surface is a separate component from `<VirtualizedSurface1DY>`
 * — they share NOTHING at the Vue layer. Only the
 * framework-agnostic `core/` primitives (`getVisibleRange1D`,
 * `MeasurementCache`) are common. Adding 2D therefore cannot regress
 * 1D performance or behaviour.
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
const scrollPos = ref({ scrollX: 0, scrollY: 0 });

function onRangeChange(r: Range2D) { range.value = r; }
function onScroll(p: { scrollX: number; scrollY: number }) { scrollPos.value = p; }

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

// Color cells deterministically so motion is obvious. Hash-like.
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
  <div class="view">
    <header class="view__header">
      <h1>Phase 0 — Virtual Surface stress (2D, 1.000 × 1.000)</h1>
      <p>
        2D virtualization: 1 million cells total ({{ totalCells.toLocaleString('en-US') }}), with
        ~ <strong>{{ visibleCellCount }}</strong> rendered at any time.
        Scroll diagonally with the wheel (Shift + wheel for horizontal,
        or drag the scrollbars). The same 0/0 LoAF bar applies — 2D
        should not regress 1D performance.
      </p>
    </header>

    <div class="metrics" aria-live="polite">
      <div class="metric metric--authoritative">
        <span class="metric__label">⚖ Long frames (5s)</span>
        <span
          class="metric__value"
          :class="{
            'metric__value--good': loafSupported && loafCount === 0,
            'metric__value--ok': loafSupported && loafCount > 0 && loafCount <= 3,
            'metric__value--bad': loafSupported && loafCount > 3,
          }"
        >{{ loafSupported ? loafCount : 'n/a' }}</span>
      </div>
      <div class="metric metric--authoritative">
        <span class="metric__label">⚖ Worst frame (5s)</span>
        <span
          class="metric__value"
          :class="{
            'metric__value--good': loafSupported && loafWorst < 50,
            'metric__value--ok': loafSupported && loafWorst >= 50 && loafWorst < 100,
            'metric__value--bad': loafSupported && loafWorst >= 100,
          }"
        >{{ loafSupported ? `${loafWorst} ms` : 'n/a' }}</span>
      </div>
      <div class="metric metric--secondary">
        <span class="metric__label">rAF FPS mean (advisory)</span>
        <span class="metric__value metric__value--secondary">{{ fpsMean || '—' }}</span>
      </div>
      <div class="metric metric--secondary">
        <span class="metric__label">rAF FPS min (advisory)</span>
        <span class="metric__value metric__value--secondary">{{ fpsMin || '—' }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Cells in DOM</span>
        <span class="metric__value">{{ visibleCellCount }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Range X</span>
        <span class="metric__value">{{ range.x.startIndex }}–{{ range.x.endIndex }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Range Y</span>
        <span class="metric__value">{{ range.y.startIndex }}–{{ range.y.endIndex }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Total cells</span>
        <span class="metric__value">{{ totalCells.toLocaleString('en-US') }}</span>
      </div>
    </div>

    <div class="controls">
      <button class="btn" @click="jumpTopLeft">Top-left</button>
      <button class="btn" @click="jumpBottomRight">Bottom-right</button>
      <button class="btn" @click="jumpRandom">Random</button>
      <button class="btn" @click="jumpSmoothCenter">Smooth → center</button>
    </div>

    <VirtualizedSurface2D
      ref="surface"
      :item-count-x="COLS"
      :item-count-y="ROWS"
      :cell-width="CELL_W"
      :cell-height="CELL_H"
      :overscan-x="3"
      :overscan-y="3"
      class="surface"
      @range-change="onRangeChange"
      @scroll="onScroll"
    >
      <template #cell="{ x, y }">
        <div
          class="cell"
          :style="{ background: cellTone(x, y) }"
        >
          {{ cellLabel(x, y) }}
        </div>
      </template>
    </VirtualizedSurface2D>
  </div>
</template>

<style scoped>
.view {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: var(--coar-body-base-family, system-ui, sans-serif);
}
.view__header h1 {
  margin: 0 0 4px 0;
  font-size: 22px;
}
.view__header p {
  margin: 0;
  color: #6c7280;
  font-size: 14px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  padding: 12px;
  background: #f6f7f9;
  border: 1px solid #e3e5e9;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}
.metric { display: flex; flex-direction: column; gap: 2px; }
.metric--authoritative {
  background: rgba(37, 99, 235, 0.06);
  border-radius: 4px;
  padding: 2px 6px;
  margin: -4px -2px;
}
.metric--secondary { opacity: 0.55; }
.metric__value--secondary { color: #6c7280; }
.metric__label {
  font-size: 11px;
  color: #6c7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.metric__value {
  font-size: 20px;
  font-weight: 600;
  color: #1a1c1f;
}
.metric__value--good { color: #16a34a; }
.metric__value--ok   { color: #d97706; }
.metric__value--bad  { color: #dc2626; }

.controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.btn {
  padding: 6px 12px;
  font-size: 13px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
}
.btn:hover { background: #f3f4f6; }

.surface {
  height: 600px;
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
}

.cell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #4b5563;
  border: 1px solid #e3e5e9;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, monospace;
}
</style>
