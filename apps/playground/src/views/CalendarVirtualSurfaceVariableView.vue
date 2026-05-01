<script setup lang="ts">
/**
 * Phase 0 stress harness — variable-size items, playground host.
 *
 * Same demo as the docs (`10k-variable.md`) without the VitePress
 * wrapper. Useful as the controlled environment for diagnosing perf
 * issues that might be docs-site overhead vs. real component cost.
 */

import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import {
  VirtualizedSurface1DY,
  type Range1D,
} from '@cocoar/vue-calendar';

const ESTIMATED = 80;
const itemCount = ref(10_000);

const surfaceRef = useTemplateRef<InstanceType<typeof VirtualizedSurface1DY>>('surface');

const range = ref<Range1D>({ startIndex: 0, endIndex: 0, offset: 0, totalSize: 0 });
const scrollTop = ref(0);

function onRangeChange(r: Range1D) { range.value = r; }
function onScroll(top: number) { scrollTop.value = top; }

const overrides = ref<Map<number, number>>(new Map());

function naturalHeight(y: number): number {
  const h = (y * 2654435761) >>> 0;
  return 40 + (h % 200);
}
function heightFor(y: number): number {
  return overrides.value.get(y) ?? naturalHeight(y);
}
function tierForHeight(h: number): 'tiny' | 'card' | 'tall' {
  if (h < 80) return 'tiny';
  if (h < 160) return 'card';
  return 'tall';
}
function tierLabel(t: 'tiny' | 'card' | 'tall'): string {
  return t === 'tiny' ? 'compact' : t === 'card' ? 'card' : 'expanded';
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

// ─── Long Animation Frames (authoritative) ───────────────────────────

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

const cacheMeasured = ref(0);
let cacheStatsHandle = 0;
function pollCacheStats() {
  const c = surfaceRef.value?.getCache();
  cacheMeasured.value = c ? c.measuredCount : 0;
  cacheStatsHandle = window.setTimeout(pollCacheStats, 250);
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
  pollCacheStats();
});

onBeforeUnmount(() => {
  if (rafHandle) cancelAnimationFrame(rafHandle);
  if (loafSweepHandle) clearTimeout(loafSweepHandle);
  if (cacheStatsHandle) clearTimeout(cacheStatsHandle);
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
function toggleItemAboveViewport() {
  const firstVisible = surfaceRef.value?.getFirstVisibleIndex() ?? 0;
  const target = Math.max(0, firstVisible - 5);
  toggleOverride(target);
}
function toggleVisibleItem() {
  const firstVisible = surfaceRef.value?.getFirstVisibleIndex() ?? 0;
  const target = Math.min(itemCount.value - 1, firstVisible + 1);
  toggleOverride(target);
}
function toggleOverride(idx: number) {
  if (idx < 0 || idx >= itemCount.value) return;
  const next = new Map(overrides.value);
  if (next.has(idx)) next.delete(idx);
  else next.set(idx, naturalHeight(idx) * 2);
  overrides.value = next;
}
function clearOverrides() { overrides.value = new Map(); }

const totalSizePretty = computed(() => range.value.totalSize.toLocaleString('en-US'));
const scrollPretty = computed(() => Math.round(scrollTop.value).toLocaleString('en-US'));
const cachePretty = computed(() =>
  `${cacheMeasured.value.toLocaleString('en-US')} / ${itemCount.value.toLocaleString('en-US')}`,
);
const overrideCount = computed(() => overrides.value.size);
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 0 — Virtual Surface stress (10k variable)</h1>
      <p>
        Variable-size path of <code>&lt;VirtualizedSurface1DY&gt;</code>:
        items have heights 40–240 px, deterministically by index. Cache
        fills lazily as you scroll; anchor restoration keeps the
        user-visible content stable on size changes above the viewport.
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
        <span class="metric__label">Items in DOM</span>
        <span class="metric__value">{{ range.endIndex - range.startIndex }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Cache (measured / total)</span>
        <span class="metric__value">{{ cachePretty }}</span>
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
        <span class="metric__label">Active overrides</span>
        <span class="metric__value">{{ overrideCount }}</span>
      </div>
    </div>

    <p class="anchor-help">
      <strong>Anchor restoration test:</strong> scroll down a few
      hundred items, then click <em>"Toggle item above viewport"</em>.
      The item above your view doubles in height, but the visible
      content should not jump — the surface adjusts <code>scrollTop</code>
      by the size delta so the first-visible row stays at the same
      screen y-coordinate.
    </p>

    <div class="controls">
      <button class="btn" @click="jumpTop">Top</button>
      <button class="btn" @click="jumpBottom">Bottom</button>
      <button class="btn" @click="jumpRandom">Random</button>
      <button class="btn" @click="jumpSmoothMid">Smooth → middle</button>
      <span class="divider" />
      <button class="btn" @click="toggleItemAboveViewport">Toggle item above viewport</button>
      <button class="btn" @click="toggleVisibleItem">Toggle visible item (2nd row)</button>
      <button v-if="overrideCount > 0" class="btn" @click="clearOverrides">
        Clear overrides ({{ overrideCount }})
      </button>
    </div>

    <VirtualizedSurface1DY
      ref="surface"
      :item-count="itemCount"
      :estimated-item-size="ESTIMATED"
      :overscan="3"
      class="surface"
      @range-change="onRangeChange"
      @scroll="onScroll"
    >
      <template #item="{ y }">
        <div
          class="row"
          :class="`row--${tierForHeight(heightFor(y))}`"
          :style="{ minHeight: heightFor(y) + 'px' }"
        >
          <div class="row__head">
            <span class="row__index">#{{ y.toLocaleString('en-US') }}</span>
            <span class="row__tier">
              {{ tierLabel(tierForHeight(heightFor(y))) }}
              · {{ heightFor(y) }} px
              <template v-if="overrides.has(y)"> · overridden</template>
            </span>
            <span class="row__bar" :style="{ width: `${(y % 100) + 5}%` }" />
          </div>
          <p v-if="tierForHeight(heightFor(y)) !== 'tiny'" class="row__body">
            Item {{ y.toLocaleString('en-US') }} — natural height
            {{ naturalHeight(y) }} px (deterministic from index hash).
            <template v-if="tierForHeight(heightFor(y)) === 'tall'">
              The tall tier renders a fuller body so we reach a
              meaningful range of measured heights for the cache.
            </template>
          </p>
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

.anchor-help {
  font-size: 13px;
  color: #6c7280;
  background: rgba(37, 99, 235, 0.04);
  border-left: 3px solid #2563eb;
  padding: 8px 12px;
  margin: 0;
  line-height: 1.55;
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
  flex-direction: column;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid #e3e5e9;
  font-variant-numeric: tabular-nums;
  background: #fff;
  box-sizing: border-box;
}
.row--tiny { background: #fff; }
.row--card { background: #f6f7f9; }
.row--tall {
  background: #fff;
  border-left: 3px solid #2563eb;
}

.row__head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.row__index { font-weight: 600; min-width: 80px; }
.row__tier {
  font-size: 11px;
  color: #6c7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 180px;
}
.row__bar {
  flex: 1;
  height: 4px;
  background: linear-gradient(90deg, #2563eb 0%, #93c5fd 100%);
  border-radius: 2px;
  max-width: 400px;
}
.row__body {
  font-size: 13px;
  color: #4b5563;
  margin: 0;
  line-height: 1.5;
}
</style>
