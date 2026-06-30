<script setup lang="ts">
/**
 * Standalone `<CoarMapEditor>` demo — the write counterpart of `<CoarMap>`.
 * Click the map to add points, drag markers to move them; on a route the
 * polyline follows live. Everything flows through `v-model:data` — no markdown.
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
  caption: 'Click the map to add points · drag markers to move them.',
  basemap: 'voyager',
  points: [
    { lat: 51.4995, lng: -0.1248, kind: 'stop', label: 'Westminster', category: 'sight' },
    { lat: 51.5076, lng: -0.118, kind: 'shape' },
    { lat: 51.5129, lng: -0.1243, kind: 'stop', label: 'Dishoom', category: 'food', icon: '🥘' },
    { lat: 51.5194, lng: -0.127, kind: 'stop', label: 'British Museum', category: 'sight' },
  ],
});

const selected = ref<number | null>(null);

function setType(t: MapType): void {
  const points = t === 'single' ? data.value.points.slice(0, 1) : data.value.points;
  data.value = { ...data.value, type: t, points };
}
</script>

<template>
  <div class="mapedit-demo">
    <h2 class="mapedit-demo__title">
      CoarMapEditor <small>(@cocoar/vue-map — visual editor, no markdown)</small>
    </h2>

    <div class="mapedit-demo__controls">
      <span class="mapedit-demo__label">Type:</span>
      <button
        v-for="t in (['single', 'multi', 'route'] as MapType[])"
        :key="t"
        :class="['mapedit-demo__btn', { 'mapedit-demo__btn--active': data.type === t }]"
        @click="setType(t)"
      >{{ t }}</button>
      <span class="mapedit-demo__hint">
        selected: <strong>{{ selected ?? '—' }}</strong> · points: <strong>{{ data.points.length }}</strong>
      </span>
    </div>

    <div class="mapedit-demo__frame">
      <CoarMapEditor
        v-model:data="data"
        v-model:selected="selected"
        :config="config"
      />
    </div>

    <details class="mapedit-demo__data" open>
      <summary>Live data (v-model:data)</summary>
      <pre>{{ JSON.stringify(data, null, 2) }}</pre>
    </details>
  </div>
</template>

<style scoped>
.mapedit-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  max-width: 900px;
}
.mapedit-demo__title {
  margin: 0;
  font-size: 18px;
}
.mapedit-demo__title small {
  font-weight: 400;
  color: var(--coar-text-neutral-tertiary, #999);
  font-size: 13px;
}
.mapedit-demo__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.mapedit-demo__label {
  font-size: 13px;
  font-weight: 600;
}
.mapedit-demo__btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--coar-border-neutral, #d4d4d4);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.mapedit-demo__btn--active {
  background: var(--coar-background-accent-primary, #6366f1);
  color: #fff;
  border-color: transparent;
}
.mapedit-demo__hint {
  margin-left: 12px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary, #777);
}
.mapedit-demo__frame {
  --coar-map-height: 440px;
}
.mapedit-demo__data pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  border-radius: 6px;
  font-size: 12px;
  max-height: 240px;
  overflow: auto;
}
</style>
