<script setup lang="ts">
/**
 * Phase 0 stress harness for `<VirtualizedSurface1DY>` — playground host.
 *
 * Identical demo as the docs page (`apps/docs/calendar-spike/...`) but
 * without VitePress, sticky sidebars, hot demo plugins, or any other
 * site chrome. The page is a thin Vue Router view: the only thing
 * doing work is the virtualized surface itself.
 *
 * Use this view to isolate Component perf from docs-site overhead. If
 * the rAF FPS counter still drops to 30 here, the cause is not VitePress.
 *
 * Two perf signals are shown side by side:
 *
 *   1. **rAF FPS** — easy to read but unreliable under wheel-scroll
 *      handling on Chrome (the browser can defer rAF callbacks during
 *      input dispatch without producing visual jank).
 *   2. **Long Animation Frames (LoAF)** — `PerformanceObserver` with
 *      type `'long-animation-frame'` reports actual ≥ 50 ms frames from
 *      the browser's pipeline. Authoritative; 0 long frames = smooth
 *      scroll, regardless of what rAF FPS shows.
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

function onRangeChange(r: Range1D) {
  range.value = r;
}
function onScroll(top: number) {
  scrollTop.value = top;
}

// ─── rAF-based FPS ────────────────────────────────────────────────────

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
  return y % 2 === 0 ? '#fff' : '#f6f7f9';
}
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 0 — Virtual Surface stress (10k fixed)</h1>
      <p>
        Bare-bones playground host. No VitePress, no Markdown plugin, no
        sticky sidebars. The only work happening on the page is the
        virtualized surface and the FPS counters.
      </p>
    </header>

    <div class="metrics" aria-live="polite">
      <div class="metric metric--secondary">
        <span class="metric__label">rAF FPS mean (advisory)</span>
        <span class="metric__value metric__value--secondary">{{ fpsMean || '—' }}</span>
      </div>
      <div class="metric metric--secondary">
        <span class="metric__label">rAF FPS min (advisory)</span>
        <span class="metric__value metric__value--secondary">{{ fpsMin || '—' }}</span>
      </div>
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
      <div class="metric">
        <span class="metric__label">Items in DOM</span>
        <span class="metric__value">{{ range.endIndex - range.startIndex }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Range</span>
        <span class="metric__value">{{ range.startIndex }}–{{ range.endIndex }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Scroll</span>
        <span class="metric__value">{{ scrollPretty }} / {{ totalSizePretty }} px</span>
      </div>
      <div class="metric">
        <span class="metric__label">Item count</span>
        <span class="metric__value">{{ itemCount.toLocaleString('en-US') }}</span>
      </div>
    </div>

    <p v-if="loafSupported" class="loaf-help">
      <strong>⚖ Long frames</strong> and <strong>⚖ Worst frame</strong>
      are the authoritative metrics — they come straight from Chrome's
      Long Animation Frame API and report actual ≥ 50 ms frames from the
      browser's pipeline. <strong>0 long frames + worst frame &lt; 50 ms
      = page is smooth, no debate.</strong>
      <br><br>
      The <strong>rAF FPS</strong> values below are advisory only —
      Chrome's wheel-scroll handler can defer rAF callbacks one or two
      vsync ticks during input dispatch without any visual jank, which
      makes the rAF counter dip to 30 even on a smooth page. This is a
      classic artefact of rAF-based FPS counters; the LoAF API was
      designed specifically to expose the truth instead.
    </p>
    <p v-else class="loaf-help loaf-help--unavail">
      Long Animation Frame API not supported here. Chrome 123+ / Edge
      123+ have it; Firefox / Safari fall back to rAF FPS only.
    </p>

    <div class="controls">
      <button class="btn" @click="jumpTop">Top</button>
      <button class="btn" @click="jumpBottom">Bottom</button>
      <button class="btn" @click="jumpRandom">Random</button>
      <button class="btn" @click="jumpSmoothMid">Smooth → middle</button>
      <span class="divider" />
      <button class="btn" @click="add1k">+1.000 items</button>
      <button class="btn" @click="remove1k">−1.000 items</button>
    </div>

    <VirtualizedSurface1DY
      ref="surface"
      :item-count="itemCount"
      :estimated-item-size="ITEM_SIZE"
      :fixed-item-size="ITEM_SIZE"
      :overscan="3"
      class="surface"
      @range-change="onRangeChange"
      @scroll="onScroll"
    >
      <template #item="{ y }">
        <div class="row" :style="{ background: bandColor(y) }">
          <span class="row__index">#{{ y.toLocaleString('en-US') }}</span>
          <span class="row__bar" :style="{ width: `${(y % 100) + 5}%` }" />
        </div>
      </template>
    </VirtualizedSurface1DY>
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

.loaf-help {
  font-size: 13px;
  color: #6c7280;
  background: rgba(37, 99, 235, 0.04);
  border-left: 3px solid #2563eb;
  padding: 8px 12px;
  margin: 0;
}
.loaf-help--unavail {
  background: rgba(0, 0, 0, 0.04);
  border-left-color: #9ca3af;
}

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
.divider {
  width: 1px; height: 20px;
  background: #e3e5e9;
  margin: 0 4px;
}

.surface {
  height: 600px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 80px;
  padding: 0 16px;
  border-bottom: 1px solid #e3e5e9;
  font-variant-numeric: tabular-nums;
}
.row__index { font-weight: 600; min-width: 80px; }
.row__bar {
  height: 6px;
  background: linear-gradient(90deg, #2563eb 0%, #93c5fd 100%);
  border-radius: 3px;
  max-width: 600px;
}
</style>
