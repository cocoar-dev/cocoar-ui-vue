<script setup lang="ts">
/**
 * Phase 0 stress demo for `<VirtualizedSurface1DY>` — 10 k fixed-size items.
 *
 * Two perf signals shown side by side:
 *
 *   1. **Long Animation Frames (LoAF)** — `PerformanceObserver` with
 *      type `'long-animation-frame'`. Reports actual ≥ 50 ms frames
 *      from the browser's pipeline. Authoritative — cannot be fooled
 *      by rAF scheduling. **0 long frames + worst < 50 ms = page is
 *      genuinely smooth.**
 *   2. **rAF FPS** (advisory) — easy to read but unreliable under
 *      Chrome's wheel-scroll handling: the browser can defer rAF
 *      callbacks one or two vsync ticks during input dispatch without
 *      producing visual jank. The rAF counter dips to 30 in that
 *      case even though the page is smooth. We keep the metric
 *      visible but visually de-emphasized.
 *
 * The same demo runs as a standalone page in the playground at
 * `/calendar-virtual-surface` (port 5188) — useful for isolating
 * Component perf from any docs-site overhead.
 */

import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import {
  VirtualizedSurface1DY,
  type Range1D,
} from '@cocoar/vue-calendar';

const ITEM_SIZE = 80;
const itemCount = ref(10_000);

const surfaceRef = useTemplateRef<InstanceType<typeof VirtualizedSurface1DY>>('surface');

const range = ref<Range1D>({ startIndex: 0, endIndex: 0, offset: 0, totalSize: 0 });
const scrollTop = ref(0);

function onRangeChange(r: Range1D) { range.value = r; }
function onScroll(top: number) { scrollTop.value = top; }

// ─── rAF-based FPS (advisory) ─────────────────────────────────────────

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

function jumpTop() { surfaceRef.value?.scrollToIndex(0, 'auto'); }
function jumpBottom() { surfaceRef.value?.scrollToIndex(Math.max(0, itemCount.value - 1), 'auto'); }
function jumpRandom() {
  const i = Math.floor(Math.random() * itemCount.value);
  surfaceRef.value?.scrollToIndex(i, 'auto');
}
function jumpSmoothMid() {
  surfaceRef.value?.scrollToIndex(Math.floor(itemCount.value / 2), 'smooth');
}
function add1k() { itemCount.value += 1_000; }
function remove1k() { itemCount.value = Math.max(0, itemCount.value - 1_000); }

const totalSizePretty = computed(() => range.value.totalSize.toLocaleString('en-US'));
const scrollPretty = computed(() => Math.round(scrollTop.value).toLocaleString('en-US'));

function bandColor(y: number): string {
  return y % 2 === 0
    ? 'var(--coar-surface-base)'
    : 'var(--coar-surface-subtle)';
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
        <span class="stress-demo__label">Items in DOM</span>
        <span class="stress-demo__value">{{ range.endIndex - range.startIndex }}</span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Range</span>
        <span class="stress-demo__value">{{ range.startIndex }}–{{ range.endIndex }}</span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Scroll</span>
        <span class="stress-demo__value">{{ scrollPretty }} / {{ totalSizePretty }} px</span>
      </div>
      <div class="stress-demo__metric">
        <span class="stress-demo__label">Item count</span>
        <span class="stress-demo__value">{{ itemCount.toLocaleString('en-US') }}</span>
      </div>
    </div>

    <p v-if="loafSupported" class="stress-demo__loaf-help">
      <strong>⚖ Long frames</strong> and <strong>⚖ Worst frame</strong>
      are the authoritative metrics — they come from Chrome's Long
      Animation Frame API and report actual ≥ 50 ms frames out of the
      browser's render pipeline. <strong>0 long frames + worst &lt; 50 ms
      = page is smooth, no debate.</strong> The rAF FPS values are
      advisory only: Chrome's wheel-scroll handler can defer rAF
      callbacks one or two vsync ticks during input dispatch without any
      visible jank, which makes the rAF counter dip to 30 even on a
      smooth page.
    </p>
    <p v-else class="stress-demo__loaf-help stress-demo__loaf-help--unavail">
      Long Animation Frame API not supported in this browser; falling
      back to rAF FPS, which can read low during wheel-scroll without a
      real jank. Chrome 123+ / Edge 123+ have LoAF.
    </p>

    <div class="stress-demo__controls">
      <button class="stress-demo__btn" @click="jumpTop">Top</button>
      <button class="stress-demo__btn" @click="jumpBottom">Bottom</button>
      <button class="stress-demo__btn" @click="jumpRandom">Random</button>
      <button class="stress-demo__btn" @click="jumpSmoothMid">Smooth → middle</button>
      <span class="stress-demo__divider" />
      <button class="stress-demo__btn" @click="add1k">+1.000 items</button>
      <button class="stress-demo__btn" @click="remove1k">−1.000 items</button>
    </div>

    <VirtualizedSurface1DY
      ref="surface"
      :item-count="itemCount"
      :estimated-item-size="ITEM_SIZE"
      :fixed-item-size="ITEM_SIZE"
      :overscan="3"
      class="stress-demo__surface"
      @range-change="onRangeChange"
      @scroll="onScroll"
    >
      <template #item="{ y }">
        <div
          class="stress-demo__item"
          :style="{ background: bandColor(y) }"
        >
          <span class="stress-demo__item-index">#{{ y.toLocaleString('en-US') }}</span>
          <span class="stress-demo__item-bar" :style="{ width: `${(y % 100) + 5}%` }" />
        </div>
      </template>
    </VirtualizedSurface1DY>

    <p class="stress-demo__note">
      Scroll the surface, use the controls, change item count on the
      fly. The <strong>Items in DOM</strong> metric is the count of
      currently-mounted slot components — it should stay below ~30 even
      with 10.000 items.
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

.stress-demo__metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stress-demo__metric--authoritative {
  background: rgba(37, 99, 235, 0.06);
  border-radius: 4px;
  padding: 2px 6px;
  margin: -4px -2px;
}

.stress-demo__metric--secondary {
  opacity: 0.55;
}

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

.stress-demo__loaf-help {
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-subtle, #6c7280);
  background: rgba(37, 99, 235, 0.04);
  border-left: 3px solid var(--coar-color-accent, #2563eb);
  padding: 8px 12px;
  margin: 0;
  line-height: 1.55;
}
.stress-demo__loaf-help--unavail {
  background: rgba(0, 0, 0, 0.04);
  border-left-color: var(--coar-text-subtle, #9ca3af);
}

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
  transition: background-color 100ms ease;
}
.stress-demo__btn:hover {
  background: var(--coar-surface-hover, #f3f4f6);
}

.stress-demo__divider {
  width: 1px;
  height: 20px;
  background: var(--coar-border-subtle, #e3e5e9);
  margin: 0 var(--coar-space-1, 4px);
}

.stress-demo__surface {
  height: 600px;
  border: 1px solid var(--coar-border-base, #d1d5db);
  border-radius: var(--coar-radius-md, 8px);
  background: var(--coar-surface-base, #fff);
}

.stress-demo__item {
  display: flex;
  align-items: center;
  gap: var(--coar-space-3, 12px);
  height: 80px;
  padding: 0 var(--coar-space-4, 16px);
  border-bottom: 1px solid var(--coar-border-subtle, #e3e5e9);
  font-variant-numeric: tabular-nums;
}

.stress-demo__item-index {
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
  min-width: 80px;
}

.stress-demo__item-bar {
  height: 6px;
  background: linear-gradient(
    90deg,
    var(--coar-color-accent, #2563eb) 0%,
    var(--coar-color-accent-soft, #93c5fd) 100%
  );
  border-radius: 3px;
  max-width: 600px;
}

.stress-demo__note {
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-subtle, #6c7280);
  margin: 0;
}
</style>
