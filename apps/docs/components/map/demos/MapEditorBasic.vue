<script setup lang="ts">
/**
 * `<CoarMapEditor>` — the write counterpart of `<CoarMap>`. Click the map to
 * add points, drag markers to move them, click a marker to edit its properties,
 * click the route line to insert a waypoint. Everything flows through
 * `v-model:data`; no markdown anywhere.
 */
import { ref } from 'vue';
import { CoarMapEditor, type MapConfig, type MapData, type MapType } from '@cocoar/vue-map';

const config: MapConfig = {
  defaultBasemap: 'voyager',
  basemaps: [
    {
      id: 'voyager',
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      subdomains: 'abcd',
      attribution: '© OpenStreetMap, © CARTO',
      maxZoom: 20,
    },
  ],
  categories: [
    { id: 'sight', label: 'Sights', emoji: '🏛️', color: '#a855f7' },
    { id: 'food', label: 'Food', emoji: '🍽️', color: '#f97316' },
    { id: 'nature', label: 'Nature', emoji: '🌲', color: '#16a34a' },
  ],
};

const data = ref<MapData>({
  type: 'route',
  caption: 'Click to add · drag to move · click a marker to edit · click the line to insert · Esc / click-away to close.',
  points: [
    { lat: 51.4995, lng: -0.1248, kind: 'stop', label: 'Westminster', category: 'sight' },
    { lat: 51.5076, lng: -0.118, kind: 'shape' },
    { lat: 51.5129, lng: -0.1243, kind: 'stop', label: 'Dishoom', category: 'food', icon: '🥘' },
    { lat: 51.5194, lng: -0.127, kind: 'stop', label: 'British Museum', category: 'sight' },
  ],
});

const selected = ref<number | null>(null);
const editor = ref<{ captureViewport: () => void } | null>(null);

function setType(t: MapType): void {
  const points = t === 'single' ? data.value.points.slice(0, 1) : data.value.points;
  data.value = { ...data.value, type: t, points };
}
</script>

<template>
  <ClientOnly>
    <div class="mape-d__controls">
      <span class="mape-d__label">Type:</span>
      <button
        v-for="t in (['single', 'multi', 'route'] as MapType[])"
        :key="t"
        :class="['mape-d__btn', { 'is-active': data.type === t }]"
        @click="setType(t)"
      >{{ t }}</button>
      <button class="mape-d__btn" @click="editor?.captureViewport()">Save view</button>
      <span class="mape-d__hint">{{ data.points.length }} points</span>
    </div>

    <div class="mape-d__map">
      <CoarMapEditor ref="editor" v-model:data="data" v-model:selected="selected" :config="config" />
    </div>

    <details class="mape-d__data">
      <summary>Live data (v-model:data)</summary>
      <pre>{{ JSON.stringify(data, null, 2) }}</pre>
    </details>
  </ClientOnly>
</template>

<style scoped>
.mape-d__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.mape-d__label {
  font-size: 13px;
  font-weight: 600;
}
.mape-d__btn {
  padding: 4px 12px;
  border-radius: 5px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.mape-d__btn.is-active {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: transparent;
}
.mape-d__hint {
  margin-left: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.mape-d__map {
  --coar-map-height: 420px;
}
.mape-d__data {
  margin-top: 10px;
}
.mape-d__data pre {
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
}
</style>
