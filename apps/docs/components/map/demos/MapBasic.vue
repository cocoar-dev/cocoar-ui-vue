<script setup lang="ts">
/**
 * `<CoarMap>` with a consumer-built point list wired to it via the interactive
 * bridge — no markdown anywhere. The list/layout is the consumer's job (built
 * here from the exported `fallbackEntries` helper); the map provides the hooks
 * (`v-model:selected`, `focusPoint`, `highlightPoint`).
 */
import { computed, ref } from 'vue';
import {
  CoarMap,
  fallbackEntries,
  type MapConfig,
  type MapData,
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
  ],
  categories: [
    { id: 'sight', label: 'Sights', emoji: '🏛️', color: '#a855f7' },
    { id: 'food', label: 'Food', emoji: '🍽️', color: '#f97316' },
    { id: 'nature', label: 'Nature', emoji: '🌲', color: '#16a34a' },
  ],
};

const data: MapData = {
  type: 'route',
  caption: 'A sample London walk.',
  points: [
    { lat: 51.4995, lng: -0.1248, kind: 'stop', label: 'Westminster', note: 'Start', category: 'sight' },
    { lat: 51.5076, lng: -0.118, kind: 'shape', label: 'Thames bend' },
    { lat: 51.5129, lng: -0.1243, kind: 'stop', label: 'Dishoom', note: 'Lunch stop', category: 'food', icon: '🥘' },
    { lat: 51.5194, lng: -0.127, kind: 'stop', label: 'British Museum', category: 'sight' },
    { lat: 51.5074, lng: -0.1657, kind: 'stop', label: 'Hyde Park', category: 'nature' },
  ],
};

const entries = computed(() => fallbackEntries(data, config));
const selected = ref<number | null>(null);
const showLegend = ref(true);
const mapRef = ref<{
  focusPoint: (index: number) => void;
  highlightPoint: (index: number | null) => void;
} | null>(null);
</script>

<template>
  <ClientOnly>
    <label class="map-d__toggle"><input v-model="showLegend" type="checkbox" /> show legend</label>
    <div class="map-d">
      <div class="map-d__map">
        <CoarMap
          ref="mapRef"
          v-model:selected="selected"
          :data="data"
          :config="config"
          :show-legend="showLegend"
          @point-click="(e) => (selected = e.index)"
        />
      </div>
      <aside class="map-d__list">
        <div class="map-d__list-title">Points</div>
        <ul>
          <li
            v-for="entry in entries"
            :key="entry.index"
            :class="{ 'is-active': selected === entry.index }"
            @click="mapRef?.focusPoint(entry.index)"
            @mouseenter="mapRef?.highlightPoint(entry.index)"
            @mouseleave="mapRef?.highlightPoint(null)"
          >
            <span>{{ entry.emoji }}</span> {{ entry.label || '(unnamed)' }}
          </li>
        </ul>
      </aside>
    </div>
  </ClientOnly>
</template>

<style scoped>
.map-d__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}
.map-d {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.map-d__map {
  flex: 1;
  min-width: 0;
  --coar-map-height: 360px;
}
.map-d__list {
  width: 200px;
  flex-shrink: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.map-d__list-title {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
}
.map-d__list ul {
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow: auto;
  max-height: 320px;
}
.map-d__list li {
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.map-d__list li:hover {
  background: var(--vp-c-bg-soft);
}
.map-d__list li.is-active {
  background: var(--vp-c-brand-soft);
}
@media (max-width: 720px) {
  .map-d { flex-direction: column; }
  .map-d__list { width: auto; }
}
</style>
