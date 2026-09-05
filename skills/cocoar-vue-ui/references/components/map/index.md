<!-- Generated from apps/docs/components/map/index.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Map (Preview)

An interactive [Leaflet](https://leafletjs.com/) map for Vue 3. `<CoarMap>` is
**standalone and data-driven**: you feed it resolved `MapData` + `MapConfig` and
it renders pins, a route, popups and an optional legend. It has **no dependency
on — and no knowledge of — markdown or any embedding layer**; resolving a source
(a store, an API, a `:::map{id}` directive) into `MapData` is the consumer's job.

> **Info: Separate package**
>
```bash
pnpm add @cocoar/vue-map
```
> `leaflet` is a regular dependency, imported **lazily** at runtime — `vue` is the
> only peer. Import the component stylesheet once (it carries the pin, legend and
> layout styles); Leaflet's own CSS is still loaded lazily by the component:
>
```ts
import '@cocoar/vue-map/styles';
```

> **Tip: Authoring maps?**
>
> This page is the **viewer**. To place, move and edit points visually, see
> [**CoarMapEditor**](./editor.md) — the write counterpart, same data.

**Demo — `map/demos/MapBasic.vue`**

```vue
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
```

The list on the right is **not** part of `<CoarMap>` — it's built by the demo from
the exported `fallbackEntries` helper and wired to the map via the
[interactive bridge](#interactive-bridge). Click a row to fly to it, hover to
highlight, click a marker to select it back.

## Quick start

```vue
<template>
  <CoarMap :data="data" :config="config" />
</template>

<script setup lang="ts">
import { CoarMap, type MapData, type MapConfig } from '@cocoar/vue-map';

const config: MapConfig = {
  defaultBasemap: 'osm',
  basemaps: [
    { id: 'osm', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' },
  ],
  categories: [
    { id: 'sight', label: 'Sights', emoji: '🏛️', color: '#a855f7' },
  ],
};

const data: MapData = {
  type: 'route',
  points: [
    { lat: 51.4995, lng: -0.1248, kind: 'stop', label: 'Westminster', category: 'sight' },
    { lat: 51.5194, lng: -0.1270, kind: 'stop', label: 'British Museum', category: 'sight' },
  ],
};
</script>
```

## Data

| Field | Type | Description |
|---|---|---|
| `type` | `'single' \| 'multi' \| 'route'` | `route` draws a polyline through all points; others just place markers. |
| `caption` | `string?` | Shown under the map. |
| `basemap` | `string?` | Basemap id; falls back to `config.defaultBasemap`. |
| `viewport` | `{ centerLat, centerLng, zoom }?` | Fixed view; when omitted the map **auto-fits** all points. |
| `points` | `MapPoint[]` | The markers + route vertices. |

A **`MapPoint`**:

| Field | Type | Description |
|---|---|---|
| `lat` / `lng` | `number` | Position. |
| `kind` | `'stop' \| 'shape'` | `stop` = a marker; `shape` = a route/line vertex. |
| `label` | `string?` | Hover tooltip + popup title. |
| `note` | `string?` | Extra line in the click popup. |
| `category` | `string?` | _(stop only)_ category id → marker color + legend. |
| `icon` | `string?` | _(stop only)_ emoji override (else the category's emoji). |

Markers: a **stop** is a category-colored pin (emoji = `icon` or the category's);
a **named shape** point is a small dot; an **unnamed shape** point draws no
marker (it only contributes to the route line + auto-fit bounds).

## Config

| Field | Type | Description |
|---|---|---|
| `defaultBasemap` | `string` | Basemap id used when a map specifies none. |
| `basemaps` | `MapBasemap[]` | Tile sources (`{ id, url, subdomains?, attribution?, maxZoom? }`). |
| `categories` | `MapCategory[]?` | `{ id, label, emoji?, color }` — drives stop colors + the legend. |

Pass it per-instance via `config`, or app-wide:

```ts
import { COAR_MAP_CONFIG_KEY } from '@cocoar/vue-map';
app.provide(COAR_MAP_CONFIG_KEY, config); // a per-instance `config` prop still wins
```

> **Info: Google basemaps**
>
> Out of scope for now. A basemap flagged `google: true` is **skipped** in favour
> of the default. The `google` / `googleType` fields are kept on `MapBasemap` so a
> registry can carry them for a future release.

## Interactive bridge

The component renders the map; **the list/layout around it is the consumer's
job** (the data is yours, and `fallbackEntries(data, config)` gives ready-made
rows — each carrying its `index` into `data.points`). What a consumer *can't* do
alone is drive the map from outside, so `<CoarMap>` exposes exactly that:

| API | Direction | Description |
|---|---|---|
| `v-model:selected` | both | Selected point index. Set it to ring a marker; reads back when a marker is clicked. |
| `@point-click` | map → out | `{ point, index }` when a marker is clicked. |
| `focusPoint(index)` | out → map | Pan to the point, open its popup, select it. _(exposed method)_ |
| `highlightPoint(index \| null)` | out → map | Transient hover emphasis on a marker. _(exposed method)_ |

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarMap, fallbackEntries } from '@cocoar/vue-map';

const mapRef = ref<InstanceType<typeof CoarMap>>();
const selected = ref<number | null>(null);
const rows = computed(() => fallbackEntries(data, config));
</script>

<template>
  <CoarMap ref="mapRef" v-model:selected="selected" :data="data" :config="config" />
  <ul>
    <li
      v-for="row in rows"
      :key="row.index"
      :class="{ active: selected === row.index }"
      @click="mapRef?.focusPoint(row.index)"
      @mouseenter="mapRef?.highlightPoint(row.index)"
      @mouseleave="mapRef?.highlightPoint(null)"
    >{{ row.emoji }} {{ row.label }}</li>
  </ul>
</template>
```

## Legend & caption

The legend is **off by default**. Set `show-legend` to enable it — it then
appears when **≥ 2 categories** are present among the stops, listing each
category's swatch + label. The `caption` from `MapData` renders below the map.

```vue
<CoarMap :data="data" :config="config" show-legend />
```

## Lazy loading & fallback

Leaflet (JS **and** CSS) is imported in `onMounted`, so it loads only on pages
that actually render a map (your bundler code-splits it into its own chunk).
Until the map hydrates — and if Leaflet ever fails to load, or with JS off — a
crawlable `<ol>` of the named points is shown and then hidden once the map is
live. The map container's height is `--coar-map-height` (default `360px`).

## Security

Point text (`label`, `note`, `icon`) is treated as untrusted: popups are built
from DOM **text nodes** (never an HTML string), tooltips and the marker emoji are
HTML-escaped, and a category color is guarded before it reaches an inline style.
A hostile label can't break out into markup.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `MapData` | _required_ | The resolved map data. |
| `config` | `MapConfig` | _provide_ | Basemaps + categories. Falls back to `COAR_MAP_CONFIG_KEY`. |
| `selected` | `number \| null` | `null` | Selected point index (`v-model:selected`). |
| `showLegend` | `boolean` | `false` | Show the legend (then needs ≥ 2 categories). |

## Using it as a markdown embed

`<CoarMap>` and the [markdown custom-embed](../markdown-embeds.md) system are
fully independent. To show a map inside markdown, a consumer registers a small
wrapper that resolves the directive's id into `MapData` and renders `<CoarMap>`:

```ts
// the wrapper is the CONSUMER's — it bridges markdown ↔ map; neither package
// depends on the other.
const embeds = {
  map: {
    viewer: defineComponent({
      props: { id: { type: String, required: true } },
      setup: (props) => () => h(CoarMap, { data: resolveMap(props.id), config }),
    }),
  },
};
```
