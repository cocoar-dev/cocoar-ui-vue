<script setup lang="ts">
/**
 * Standalone `<CoarMap>` demo — NO markdown anywhere. It's fed resolved data +
 * config directly, exactly how any consumer would after resolving its own
 * source (store / API / a `:::map{id}` directive — the map doesn't care).
 */
import { computed, ref } from 'vue';
import { CoarMap, type MapConfig, type MapData, type MapType } from '@cocoar/vue-map';

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
    {
      id: 'osm',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: 'abc',
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    },
    {
      id: 'positron',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
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

const type = ref<MapType>('route');
const basemap = ref('voyager');

const points = [
  { lat: 51.4995, lng: -0.1248, kind: 'stop' as const, label: 'Westminster', note: 'Start of the walk', category: 'sight' },
  { lat: 51.5033, lng: -0.1195, kind: 'shape' as const },
  { lat: 51.5076, lng: -0.118, kind: 'shape' as const, label: 'Thames bend' },
  { lat: 51.5129, lng: -0.1243, kind: 'stop' as const, label: 'Dishoom', note: 'Lunch stop', category: 'food', icon: '🥘' },
  { lat: 51.5194, lng: -0.127, kind: 'stop' as const, label: 'British Museum', category: 'sight' },
  { lat: 51.5074, lng: -0.1657, kind: 'stop' as const, label: 'Hyde Park', category: 'nature' },
];

const data = computed<MapData>(() => ({
  type: type.value,
  caption: 'A sample London walk — switch the type and basemap above.',
  basemap: basemap.value,
  points: type.value === 'single' ? points.slice(0, 1) : points,
}));
</script>

<template>
  <div class="map-demo">
    <h2 class="map-demo__title">CoarMap <small>(@cocoar/vue-map — standalone, no markdown)</small></h2>

    <div class="map-demo__controls">
      <span class="map-demo__label">Type:</span>
      <button
        v-for="t in (['single', 'multi', 'route'] as MapType[])"
        :key="t"
        :class="['map-demo__btn', { 'map-demo__btn--active': type === t }]"
        @click="type = t"
      >{{ t }}</button>

      <span class="map-demo__label">Basemap:</span>
      <button
        v-for="b in (['voyager', 'osm', 'positron'])"
        :key="b"
        :class="['map-demo__btn', { 'map-demo__btn--active': basemap === b }]"
        @click="basemap = b"
      >{{ b }}</button>
    </div>

    <div class="map-demo__frame">
      <CoarMap :data="data" :config="config" />
    </div>

    <details class="map-demo__data">
      <summary>Resolved data (the prop fed to &lt;CoarMap&gt;)</summary>
      <pre>{{ JSON.stringify(data, null, 2) }}</pre>
    </details>
  </div>
</template>

<style scoped>
.map-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  max-width: 900px;
}
.map-demo__title {
  margin: 0;
  font-size: 18px;
}
.map-demo__title small {
  font-weight: 400;
  color: var(--coar-text-neutral-tertiary, #999);
  font-size: 13px;
}
.map-demo__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.map-demo__label {
  font-size: 13px;
  font-weight: 600;
  margin-left: 8px;
}
.map-demo__label:first-child { margin-left: 0; }
.map-demo__btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--coar-border-neutral, #d4d4d4);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.map-demo__btn--active {
  background: var(--coar-background-accent-primary, #6366f1);
  color: #fff;
  border-color: transparent;
}
.map-demo__frame {
  --coar-map-height: 420px;
}
.map-demo__data pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  border-radius: 6px;
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
}
</style>
