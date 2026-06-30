<script setup lang="ts">
/**
 * `<CoarMapEditor>` + the ready-made `<CoarMapPointList>` beside it. Both bind
 * to the same `data` + `selected` (no coupling — just shared v-model). The list
 * is `reorderable` (drag the handle) + `removable`; its `focus` / `highlight`
 * events are wired to the editor's exposed methods for fly-to + hover emphasis.
 */
import { ref } from 'vue';
import {
  CoarMapEditor,
  CoarMapPointList,
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

const data = ref<MapData>({
  type: 'route',
  points: [
    { lat: 51.4995, lng: -0.1248, kind: 'stop', label: 'Westminster', category: 'sight' },
    { lat: 51.5076, lng: -0.118, kind: 'shape', label: 'Thames bend' },
    { lat: 51.5129, lng: -0.1243, kind: 'stop', label: 'Dishoom', category: 'food', icon: '🥘' },
    { lat: 51.5194, lng: -0.127, kind: 'stop', label: 'British Museum', category: 'sight' },
    { lat: 51.5074, lng: -0.1657, kind: 'stop', label: 'Hyde Park', category: 'nature' },
  ],
});

const selected = ref<number | null>(null);
const editor = ref<{
  focusPoint: (index: number) => void;
  highlightPoint: (index: number | null) => void;
} | null>(null);
</script>

<template>
  <ClientOnly>
    <div class="mel">
      <div class="mel__map">
        <CoarMapEditor ref="editor" v-model:data="data" v-model:selected="selected" :config="config" />
      </div>

      <aside class="mel__list">
        <div class="mel__list-title">Points <span>({{ data.points.length }})</span></div>
        <CoarMapPointList
          v-model:data="data"
          v-model:selected="selected"
          :config="config"
          reorderable
          removable
          @focus="editor?.focusPoint($event)"
          @highlight="editor?.highlightPoint($event)"
        />
      </aside>
    </div>
  </ClientOnly>
</template>

<style scoped>
.mel {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.mel__map {
  flex: 1;
  min-width: 0;
  --coar-map-height: 400px;
}
.mel__list {
  width: 250px;
  flex-shrink: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.mel__list-title {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
}
@media (max-width: 720px) {
  .mel { flex-direction: column; }
  .mel__list { width: auto; }
}
</style>
