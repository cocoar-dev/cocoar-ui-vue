<script setup lang="ts">
/**
 * Side-by-side: `<CoarMapEditor>` (left) and `<CoarMap>` (right) bound to the
 * SAME `data` ref. Edit on the left and the viewer updates live — and you can
 * see how the editor's draggable handles differ from the viewer's render:
 *   • stop                -> same category pin on both
 *   • shape WITH label    -> white handle (editor) vs small grey dot (viewer)
 *   • shape WITHOUT label  -> white handle (editor) vs nothing (viewer; line only)
 */
import { ref } from 'vue';
import {
  CoarMap,
  CoarMapEditor,
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
    { lat: 51.504, lng: -0.122, kind: 'shape' }, // unnamed → editor handle, viewer nothing
    { lat: 51.5076, lng: -0.118, kind: 'shape', label: 'Thames bend' }, // named → editor handle, viewer grey dot
    { lat: 51.5129, lng: -0.1243, kind: 'stop', label: 'Dishoom', category: 'food', icon: '🥘' },
    { lat: 51.5194, lng: -0.127, kind: 'stop', label: 'British Museum', category: 'sight' },
  ],
});

// Shared selection — click a marker on either side, it rings on both.
const selected = ref<number | null>(null);
</script>

<template>
  <div class="split">
    <h2 class="split__title">Editor ↔ Viewer <small>(same data, live)</small></h2>

    <div class="split__controls">
      <span class="split__label">Type:</span>
      <button
        v-for="t in (['single', 'multi', 'route'] as MapType[])"
        :key="t"
        :class="['split__btn', { 'is-active': data.type === t }]"
        @click="data = { ...data, type: t, points: t === 'single' ? data.points.slice(0, 1) : data.points }"
      >{{ t }}</button>
    </div>

    <p class="split__note">
      The <strong>white dots</strong> on the left are <strong>editor-only</strong> drag handles for
      <code>shape</code> vertices. In the viewer a <em>named</em> shape is a small grey dot and an
      <em>unnamed</em> one is invisible (it only bends the route line).
    </p>

    <div class="split__panes">
      <section class="split__pane">
        <header class="split__pane-head split__pane-head--edit">✏️ CoarMapEditor</header>
        <CoarMapEditor v-model:data="data" v-model:selected="selected" :config="config" />
      </section>

      <section class="split__pane">
        <header class="split__pane-head split__pane-head--view">👁️ CoarMap (viewer)</header>
        <CoarMap v-model:selected="selected" :data="data" :config="config" />
      </section>
    </div>

    <details class="split__data">
      <summary>Shared data</summary>
      <pre>{{ JSON.stringify(data, null, 2) }}</pre>
    </details>
  </div>
</template>

<style scoped>
.split {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  max-width: 1200px;
}
.split__title {
  margin: 0;
  font-size: 18px;
}
.split__title small {
  font-weight: 400;
  color: var(--coar-text-neutral-tertiary, #999);
  font-size: 13px;
}
.split__controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.split__label {
  font-size: 13px;
  font-weight: 600;
}
.split__btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--coar-border-neutral, #d4d4d4);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}
.split__btn.is-active {
  background: var(--coar-background-accent-primary, #6366f1);
  color: #fff;
  border-color: transparent;
}
.split__note {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--coar-text-neutral-secondary, #555);
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  padding: 8px 12px;
  border-radius: 8px;
}
.split__panes {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.split__pane {
  flex: 1;
  min-width: 0;
  --coar-map-height: 460px;
}
.split__pane-head {
  font-size: 13px;
  font-weight: 700;
  padding: 6px 10px;
  margin-bottom: 8px;
  border-radius: 6px;
}
.split__pane-head--edit {
  background: #eef2ff;
  color: #4338ca;
}
.split__pane-head--view {
  background: #ecfdf5;
  color: #047857;
}
.split__data pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  border-radius: 6px;
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
}
@media (max-width: 880px) {
  .split__panes { flex-direction: column; }
}
</style>
