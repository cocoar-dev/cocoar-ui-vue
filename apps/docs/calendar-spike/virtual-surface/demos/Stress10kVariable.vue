<script setup lang="ts">
/**
 * Phase 0 stress demo — 10 k variable-size items.
 *
 * Validates the variable-size code path of `<VirtualizedSurface1DY>`:
 *
 *   - `MeasurementCache` is populated lazily as ResizeObserver reports
 *     each item's actual height on mount.
 *   - Items carry deterministic heights by index (a stable hash, so
 *     the same index always renders to the same height — useful for
 *     reproducing scroll behavior across reloads).
 *   - **Anchor restoration**: a "Grow item above viewport" control
 *     enlarges a specific item that is currently scrolled past. The
 *     user-visible content should not jump — the surface compensates
 *     scrollTop by the size delta so the anchor item (first visible
 *     row by default) stays in the same screen position.
 *
 * Same LoAF-based perf instrumentation as the fixed-size demo. The
 * variable path is intrinsically more expensive than fixed because
 * every measurement flush triggers a Fenwick update + range recompute
 * + per-item transform refresh, and the anchor adjustment writes
 * scrollTop. This is the harder test; if 0 long frames here, the
 * surface is solid.
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

// ─── Item-height pattern ──────────────────────────────────────────────
//
// Deterministic per-index, range 40 – 240 px. Three visual tiers:
//   - "tiny"   ~40-60   (compact list rows)
//   - "card"   ~80-140  (event card with one line of body)
//   - "tall"   ~150-240 (expanded card with description)
//
// Plus an explicit override map so the "expand item N" control can
// toggle a single item's height at runtime — the cleanest test for
// anchor restoration.

const overrides = ref<Map<number, number>>(new Map());

function naturalHeight(y: number): number {
  // Fast, stable hash → 0–199, plus the 40px floor.
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

// ─── Cache stats poll ─────────────────────────────────────────────────

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

/**
 * Grow / shrink a specific item ABOVE the viewport. The anchor
 * restoration logic should keep the user's view stable.
 *
 * `range.startIndex` is misleading here: it includes overscan, so it
 * is *itself* above the viewport. The semantically-correct anchor
 * reference point is `getFirstVisibleIndex()`, which returns the
 * topmost item whose pixels actually intersect the viewport.
 */
function toggleItemAboveViewport() {
  const firstVisible = surfaceRef.value?.getFirstVisibleIndex() ?? 0;
  const target = Math.max(0, firstVisible - 5);
  toggleOverride(target);
}
/**
 * Grow / shrink the SECOND visible item (the one just below the
 * anchor). The anchor (first visible) should stay put; the toggled
 * item itself stays put too (its transform is fixed by its
 * prefixSum); items below it shift down to make room. The anchor
 * row's screen y-coordinate must be constant before vs. after.
 */
function toggleVisibleItem() {
  const firstVisible = surfaceRef.value?.getFirstVisibleIndex() ?? 0;
  const target = Math.min(itemCount.value - 1, firstVisible + 1);
  toggleOverride(target);
}
function toggleOverride(idx: number) {
  if (idx < 0 || idx >= itemCount.value) return;
  const next = new Map(overrides.value);
  if (next.has(idx)) {
    next.delete(idx);
  } else {
    next.set(idx, naturalHeight(idx) * 2);
  }
  overrides.value = next;
}
function clearOverrides() { overrides.value = new Map(); }

const totalSizePretty = computed(() => range.value.totalSize.toLocaleString('en-US'));
const scrollPretty = computed(() => Math.round(scrollTop.value).toLocaleString('en-US'));
const cachePretty = computed(() =>
  `${cacheMeasured.value.toLocaleString('en-US')} / ${itemCount.value.toLocaleString('en-US')}`,
);
const overrideCount = computed(() => overrides.value.size);

function tierLabel(t: 'tiny' | 'card' | 'tall'): string {
  return t === 'tiny' ? 'compact' : t === 'card' ? 'card' : 'expanded';
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
        <span class="stress-demo__label">Cache (measured / total)</span>
        <span class="stress-demo__value">{{ cachePretty }}</span>
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
        <span class="stress-demo__label">Active overrides</span>
        <span class="stress-demo__value">{{ overrideCount }}</span>
      </div>
    </div>

    <p v-if="loafSupported" class="stress-demo__loaf-help">
      Same authoritative metrics as the fixed-size page. The
      variable-size path adds <strong>cache fills</strong> (each newly
      measured item) and <strong>anchor adjustments</strong> (each size
      change above the viewport) to the work per scroll frame —
      strictly more than the fixed mode. If <strong>⚖ Long frames is 0
      here</strong>, the surface is genuinely solid.
    </p>

    <div class="stress-demo__controls">
      <button class="stress-demo__btn" @click="jumpTop">Top</button>
      <button class="stress-demo__btn" @click="jumpBottom">Bottom</button>
      <button class="stress-demo__btn" @click="jumpRandom">Random</button>
      <button class="stress-demo__btn" @click="jumpSmoothMid">Smooth → middle</button>
      <span class="stress-demo__divider" />
      <button class="stress-demo__btn" @click="toggleItemAboveViewport">
        Toggle item above viewport
      </button>
      <button class="stress-demo__btn" @click="toggleVisibleItem">
        Toggle visible item (2nd row)
      </button>
      <button v-if="overrideCount > 0" class="stress-demo__btn" @click="clearOverrides">
        Clear overrides ({{ overrideCount }})
      </button>
    </div>

    <p class="stress-demo__anchor-help">
      <strong>Anchor restoration test:</strong> scroll down a few
      hundred items. Click <em>"Toggle item above viewport"</em> — the
      item above your view doubles in height, but the visible content
      should not jump. The surface adjusts <code>scrollTop</code> by the
      delta so the first-visible row stays at the same screen position.
    </p>

    <VirtualizedSurface1DY
      ref="surface"
      :item-count="itemCount"
      :estimated-item-size="ESTIMATED"
      :overscan="3"
      class="stress-demo__surface"
      @range-change="onRangeChange"
      @scroll="onScroll"
    >
      <template #item="{ y }">
        <div
          class="stress-demo__item"
          :class="`stress-demo__item--${tierForHeight(heightFor(y))}`"
          :style="{ minHeight: heightFor(y) + 'px' }"
        >
          <div class="stress-demo__item-row">
            <span class="stress-demo__item-index">#{{ y.toLocaleString('en-US') }}</span>
            <span class="stress-demo__item-tier">
              {{ tierLabel(tierForHeight(heightFor(y))) }}
              · {{ heightFor(y) }} px
              <template v-if="overrides.has(y)"> · overridden</template>
            </span>
            <span class="stress-demo__item-bar" :style="{ width: `${(y % 100) + 5}%` }" />
          </div>
          <p
            v-if="tierForHeight(heightFor(y)) !== 'tiny'"
            class="stress-demo__item-body"
          >
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

    <p class="stress-demo__note">
      Each item's height is a deterministic hash of its index, so
      reloading the page produces the same heights at the same indices.
      The cache fills as you scroll — watch the
      <strong>Cache (measured / total)</strong> climb.
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

.stress-demo__loaf-help,
.stress-demo__anchor-help {
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-subtle, #6c7280);
  background: rgba(37, 99, 235, 0.04);
  border-left: 3px solid var(--coar-color-accent, #2563eb);
  padding: 8px 12px;
  margin: 0;
  line-height: 1.55;
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
  flex-direction: column;
  gap: 4px;
  padding: 8px var(--coar-space-4, 16px);
  border-bottom: 1px solid var(--coar-border-subtle, #e3e5e9);
  font-variant-numeric: tabular-nums;
  background: var(--coar-surface-base, #fff);
  box-sizing: border-box;
}
.stress-demo__item--tiny  { background: var(--coar-surface-base, #fff); }
.stress-demo__item--card  { background: var(--coar-surface-subtle, #f6f7f9); }
.stress-demo__item--tall  {
  background: var(--coar-surface-base, #fff);
  border-left: 3px solid var(--coar-color-accent, #2563eb);
}

.stress-demo__item-row {
  display: flex;
  align-items: center;
  gap: var(--coar-space-3, 12px);
}

.stress-demo__item-index {
  font-weight: 600;
  color: var(--coar-text-base, #1a1c1f);
  min-width: 80px;
}
.stress-demo__item-tier {
  font-size: var(--coar-font-size-xs, 11px);
  color: var(--coar-text-subtle, #6c7280);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 180px;
}
.stress-demo__item-bar {
  flex: 1;
  height: 4px;
  background: linear-gradient(
    90deg,
    var(--coar-color-accent, #2563eb) 0%,
    var(--coar-color-accent-soft, #93c5fd) 100%
  );
  border-radius: 2px;
  max-width: 400px;
}
.stress-demo__item-body {
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-subtle, #4b5563);
  margin: 0;
  line-height: 1.5;
}

.stress-demo__note {
  font-size: var(--coar-font-size-sm, 13px);
  color: var(--coar-text-subtle, #6c7280);
  margin: 0;
}
</style>
