<script setup lang="ts">
/**
 * Standalone `<CoarMap>` demo — NO markdown anywhere. It's fed resolved data +
 * config directly, exactly how any consumer would after resolving its own
 * source (store / API / a `:::map{id}` directive — the map doesn't care).
 */
import { computed, ref } from 'vue';
import {
  CoarMap,
  fallbackEntries,
  type MapConfig,
  type MapData,
  type MapType,
} from '@cocoar/vue-map';

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
const legendOn = ref(true);

// Interactive bridge: a template ref to call the map's imperative methods, and a
// two-way selection shared between the map and the consumer list.
const mapRef = ref<{
  focusPoint: (index: number) => void;
  highlightPoint: (index: number | null) => void;
} | null>(null);
const selected = ref<number | null>(null);

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

// The list view is the CONSUMER's job — built here from the same data using the
// exported `fallbackEntries` helper. <CoarMap> is untouched.
const listEntries = computed(() => fallbackEntries(data.value, config));
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

      <label class="map-demo__toggle">
        <input v-model="legendOn" type="checkbox" /> legend
      </label>
    </div>

    <div class="map-demo__layout">
      <div class="map-demo__frame">
        <CoarMap
          ref="mapRef"
          v-model:selected="selected"
          :data="data"
          :config="config"
          :hide-legend="!legendOn"
          @point-click="(e) => (selected = e.index)"
        />
      </div>

      <aside class="map-demo__list">
        <div class="map-demo__list-title">Points <span>({{ listEntries.length }})</span></div>
        <ul class="map-demo__list-items">
          <li
            v-for="entry in listEntries"
            :key="entry.index"
            :class="['map-demo__list-item', { 'map-demo__list-item--active': selected === entry.index }]"
            @click="mapRef?.focusPoint(entry.index)"
            @mouseenter="mapRef?.highlightPoint(entry.index)"
            @mouseleave="mapRef?.highlightPoint(null)"
          >
            <span class="map-demo__list-emoji">{{ entry.emoji }}</span>
            <span class="map-demo__list-label">{{ entry.label || '(unnamed)' }}</span>
            <span class="map-demo__list-coords">{{ entry.lat.toFixed(3) }}, {{ entry.lng.toFixed(3) }}</span>
          </li>
        </ul>
      </aside>
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
.map-demo__layout {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.map-demo__frame {
  flex: 1;
  min-width: 0;
  --coar-map-height: 420px;
}
.map-demo__list {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--coar-border-neutral, #e2e2e2);
  border-radius: 10px;
  overflow: hidden;
}
.map-demo__list-title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-secondary, #777);
  border-bottom: 1px solid var(--coar-border-neutral, #ededed);
}
.map-demo__list-title span {
  font-weight: 500;
}
.map-demo__list-items {
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow: auto;
  max-height: 380px;
}
.map-demo__list-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.map-demo__list-item:hover {
  background: var(--coar-background-neutral-secondary, #f3f4f6);
}
.map-demo__list-item--active {
  background: var(--coar-background-accent-secondary, #eef2ff);
  box-shadow: inset 2px 0 0 var(--coar-background-accent-primary, #6366f1);
}
.map-demo__toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.map-demo__list-emoji {
  grid-row: span 2;
}
.map-demo__list-label {
  font-weight: 600;
}
.map-demo__list-coords {
  grid-column: 2;
  font-size: 11px;
  color: #999;
  font-variant-numeric: tabular-nums;
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
