<script setup lang="ts">
/**
 * Phase 0 / Spike C — Multi-day-bar layout demo.
 *
 * Generates N synthetic intervals on a multi-week canvas, runs them
 * through `layoutOverlappingIntervals`, and renders each bar at its
 * computed (lane, start, end) position. The visual confirms the
 * algorithm's output: no two bars share a (lane, column) cell, and
 * the layout uses the minimum number of lanes (= max overlap depth).
 *
 * Live timing readout below — each layout call is timed via
 * `performance.now()`. At Tier A targets (< 30 ms for 1000 events)
 * any user-visible bar count change should be effectively
 * instantaneous.
 */

import { computed, ref, watch } from 'vue';
import {
  layoutOverlappingIntervals,
  type IntervalInput,
  type IntervalLayout,
} from '@cocoar/vue-calendar';

const COLUMNS = 28; // 4 weeks
const COL_PX = 36;
const LANE_PX = 24;
const LANE_GAP = 2;

const eventCount = ref(50);
const seed = ref(1);
const distribution = ref<'random' | 'worst' | 'mixed'>('random');

// Mulberry32 PRNG, deterministic per seed.
function makeRand(s: number): () => number {
  let state = (s | 0) ^ 0x9e3779b9;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(): IntervalInput[] {
  const n = eventCount.value;
  const rand = makeRand(seed.value);
  const out: IntervalInput[] = new Array(n);
  for (let i = 0; i < n; i++) {
    if (distribution.value === 'worst') {
      out[i] = { id: `iv-${i}`, start: 0, end: COLUMNS - 1 };
    } else if (distribution.value === 'mixed') {
      // 70% short events (1-3 days), 25% medium (4-7 days), 5% long (8-14 days)
      const r = rand();
      let span: number;
      if (r < 0.7) span = 1 + Math.floor(rand() * 3);
      else if (r < 0.95) span = 4 + Math.floor(rand() * 4);
      else span = 8 + Math.floor(rand() * 7);
      const start = Math.floor(rand() * (COLUMNS - span));
      out[i] = { id: `iv-${i}`, start, end: Math.min(COLUMNS - 1, start + span - 1) };
    } else {
      const a = Math.floor(rand() * COLUMNS);
      const b = Math.floor(rand() * COLUMNS);
      out[i] = {
        id: `iv-${i}`,
        start: Math.min(a, b),
        end: Math.max(a, b),
      };
    }
  }
  return out;
}

const intervals = ref<IntervalInput[]>([]);
const layoutResult = ref<{ bars: IntervalLayout[]; laneCount: number }>({
  bars: [],
  laneCount: 0,
});
const layoutTimeMs = ref<number>(0);

function recompute() {
  intervals.value = generate();
  const t0 = performance.now();
  const r = layoutOverlappingIntervals(intervals.value);
  const t1 = performance.now();
  layoutResult.value = { bars: [...r.bars], laneCount: r.laneCount };
  layoutTimeMs.value = Math.round((t1 - t0) * 1000) / 1000;
}

// Initial run + reactive recompute on prop changes.
recompute();
watch([eventCount, seed, distribution], () => recompute());

const canvasHeight = computed(
  () => Math.max(1, layoutResult.value.laneCount) * (LANE_PX + LANE_GAP) + 16,
);
const canvasWidth = computed(() => COLUMNS * COL_PX);

function barColor(id: string): string {
  // Deterministic color per id.
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = ((hash >>> 0) % 360);
  return `hsl(${hue} 60% 70%)`;
}

function bumpSeed() { seed.value = (seed.value + 1) % 1_000_000; }
function setEventCount(n: number) { eventCount.value = n; }
</script>

<template>
  <div class="view">
    <header class="view__header">
      <h1>Phase 0 — Multi-day-bar layout (Spike C)</h1>
      <p>
        Greedy interval-graph coloring laid out visually. No two bars
        share a <strong>(lane, column)</strong> cell. The lane count
        equals the maximum overlap depth — proven optimal.
      </p>
    </header>

    <div class="metrics">
      <div class="metric">
        <span class="metric__label">Events</span>
        <span class="metric__value">{{ intervals.length }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Lanes used</span>
        <span class="metric__value">{{ layoutResult.laneCount }}</span>
      </div>
      <div class="metric metric--authoritative">
        <span class="metric__label">⚖ Layout time</span>
        <span
          class="metric__value"
          :class="{
            'metric__value--good': layoutTimeMs < 5,
            'metric__value--ok': layoutTimeMs >= 5 && layoutTimeMs < 30,
            'metric__value--bad': layoutTimeMs >= 30,
          }"
        >{{ layoutTimeMs }} ms</span>
      </div>
      <div class="metric">
        <span class="metric__label">Distribution</span>
        <span class="metric__value">{{ distribution }}</span>
      </div>
    </div>

    <div class="controls">
      <label>
        Events:
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          :value="eventCount"
          @input="setEventCount(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="controls__num">{{ eventCount }}</span>
      </label>

      <label>
        Distribution:
        <select v-model="distribution">
          <option value="random">random</option>
          <option value="mixed">mixed (calendar-like)</option>
          <option value="worst">worst case (all-overlap)</option>
        </select>
      </label>

      <button class="btn" @click="bumpSeed">New seed</button>
      <span class="controls__num">seed = {{ seed }}</span>
    </div>

    <p class="legend">
      Targets per spike plan: 50 events &lt; 0.5 ms, 200 events &lt; 5 ms,
      1000 events &lt; 30 ms (Tier A). Color: <span class="good">green</span>
      = under, <span class="ok">amber</span> = over but OK,
      <span class="bad">red</span> = over budget.
    </p>

    <div class="canvas-host">
      <div
        class="canvas"
        :style="{
          width: canvasWidth + 'px',
          height: canvasHeight + 'px',
        }"
      >
        <!-- Column grid lines -->
        <div
          v-for="col in COLUMNS"
          :key="`col-${col}`"
          class="grid-col"
          :style="{ left: ((col - 1) * COL_PX) + 'px' }"
        >
          <span class="grid-col__label">{{ col - 1 }}</span>
        </div>

        <!-- Bars -->
        <div
          v-for="bar in layoutResult.bars"
          :key="bar.id"
          class="bar"
          :title="`${bar.id} | lane ${bar.lane} | cols ${bar.start}-${bar.end}`"
          :style="{
            left: bar.start * COL_PX + 'px',
            top: 8 + bar.lane * (LANE_PX + LANE_GAP) + 'px',
            width: ((bar.end - bar.start + 1) * COL_PX - 4) + 'px',
            height: LANE_PX + 'px',
            background: barColor(bar.id),
          }"
        >
          <span class="bar__label">{{ bar.id }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.view {
  max-width: 1300px;
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
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
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
.metric__value--ok { color: #d97706; }
.metric__value--bad { color: #dc2626; }
.good { color: #16a34a; }
.ok { color: #d97706; }
.bad { color: #dc2626; }

.controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: #4b5563;
}
.controls input[type='range'] {
  width: 240px;
  vertical-align: middle;
  margin: 0 8px;
}
.controls__num {
  min-width: 50px;
  display: inline-block;
  font-feature-settings: 'tnum';
  color: #1a1c1f;
}

.btn {
  padding: 4px 12px;
  font-size: 13px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
}
.btn:hover { background: #f3f4f6; }

.legend { font-size: 12px; color: #6c7280; margin: 0; }

.canvas-host {
  overflow: auto;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  padding: 4px;
}
.canvas {
  position: relative;
}
.grid-col {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: #f3f4f6;
}
.grid-col__label {
  position: absolute;
  bottom: 4px;
  left: 4px;
  font-size: 9px;
  color: #9ca3af;
  font-feature-settings: 'tnum';
}

.bar {
  position: absolute;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  white-space: nowrap;
  font-size: 11px;
  color: #1a1c1f;
  cursor: default;
  transition: filter 100ms ease;
}
.bar:hover {
  filter: brightness(0.93);
  z-index: 10;
}
.bar__label {
  font-feature-settings: 'tnum';
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
