<script setup lang="ts">
/**
 * `<CoarMapEditor>` with a consumer-built point list beside it — the list is the
 * CONSUMER's job (built from `data.points`), the editor just exposes the hooks.
 * Reorder with ↑/↓ (`editor.reorder`), delete (`editor.removePoint`), click a
 * row to fly to + select it (`focusPoint`), hover to highlight (`highlightPoint`).
 * Unlike the viewer's `fallbackEntries` list, this shows EVERY point — including
 * the unnamed `shape` vertices — so the whole route order is editable.
 */
import { ref } from 'vue';
import {
  CoarMapEditor,
  stopEmoji,
  type MapConfig,
  type MapData,
  type MapPoint,
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
  reorder: (from: number, to: number) => void;
  removePoint: (index: number) => void;
  focusPoint: (index: number) => void;
  highlightPoint: (index: number | null) => void;
} | null>(null);

function rowEmoji(p: MapPoint): string {
  return p.kind === 'stop' ? stopEmoji(p, config) || '📍' : '◇';
}
function rowLabel(p: MapPoint): string {
  return p.label || (p.kind === 'shape' ? '(vertex)' : '(unnamed stop)');
}
</script>

<template>
  <ClientOnly>
    <div class="mel">
      <div class="mel__map">
        <CoarMapEditor ref="editor" v-model:data="data" v-model:selected="selected" :config="config" />
      </div>

      <aside class="mel__list">
        <div class="mel__list-title">Points <span>({{ data.points.length }})</span></div>
        <ul>
          <li
            v-for="(p, i) in data.points"
            :key="i"
            :class="{ 'is-active': selected === i }"
            @click="editor?.focusPoint(i)"
            @mouseenter="editor?.highlightPoint(i)"
            @mouseleave="editor?.highlightPoint(null)"
          >
            <span class="mel__emoji">{{ rowEmoji(p) }}</span>
            <span class="mel__label">{{ rowLabel(p) }}</span>
            <span class="mel__actions">
              <button :disabled="i === 0" title="Move up" @click.stop="editor?.reorder(i, i - 1)">↑</button>
              <button :disabled="i === data.points.length - 1" title="Move down" @click.stop="editor?.reorder(i, i + 1)">↓</button>
              <button class="is-danger" title="Delete" @click.stop="editor?.removePoint(i)">✕</button>
            </span>
          </li>
        </ul>
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
  width: 230px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
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
.mel__list ul {
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow: auto;
  max-height: 360px;
}
.mel__list li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.mel__list li:hover {
  background: var(--vp-c-bg-soft);
}
.mel__list li.is-active {
  background: var(--vp-c-brand-soft);
}
.mel__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mel__actions {
  display: inline-flex;
  gap: 2px;
}
.mel__actions button {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  background: var(--vp-c-bg);
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}
.mel__actions button:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
}
.mel__actions button:disabled {
  opacity: 0.4;
  cursor: default;
}
.mel__actions button.is-danger:hover {
  color: #b91c1c;
  border-color: #fca5a5;
}
@media (max-width: 720px) {
  .mel { flex-direction: column; }
  .mel__list { width: auto; }
}
</style>
