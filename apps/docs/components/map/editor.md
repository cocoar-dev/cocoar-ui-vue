# Map Editor <Badge type="warning" text="Preview" />

A visual editor for [`<CoarMap>`](/components/map/) data. `<CoarMapEditor>` is the
**write counterpart** of `<CoarMap>`: same `MapData` + `MapConfig`, but you can
**place, move, edit, reorder and delete** points directly on the map, with every
change flowing out through `v-model:data`. Like `<CoarMap>` it is **standalone** —
no dependency on, or knowledge of, markdown or any embedding layer.

::: info Same package as the map
```bash
pnpm add @cocoar/vue-map
```
`CoarMapEditor` ships alongside `CoarMap` and is tree-shakeable — pages that only
render `<CoarMap>` don't pull in the editing weight. Leaflet is imported
**lazily** at runtime. The editor's built-in form uses the Cocoar UI controls, so
`@cocoar/vue-ui` is an **optional peer** — install it when you use the editor;
viewer-only `<CoarMap>` consumers don't need it.
:::

<preview path="./demos/MapEditorBasic.vue" />

## Quick start

```vue
<template>
  <CoarMapEditor v-model:data="data" :config="config" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMapEditor, type MapData, type MapConfig } from '@cocoar/vue-map';

const config: MapConfig = {
  defaultBasemap: 'osm',
  basemaps: [
    { id: 'osm', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' },
  ],
  categories: [{ id: 'sight', label: 'Sights', emoji: '🏛️', color: '#a855f7' }],
};

const data = ref<MapData>({
  type: 'route',
  points: [
    { lat: 51.4995, lng: -0.1248, kind: 'stop', label: 'Westminster', category: 'sight' },
    { lat: 51.5194, lng: -0.127, kind: 'stop', label: 'British Museum', category: 'sight' },
  ],
});
</script>
```

`data` is **controlled**: the editor never mutates your object, it emits a fresh
`MapData` on every edit. The data contract (`MapData`, `MapPoint`, `MapConfig`)
is identical to [`<CoarMap>`](/components/map/#data) — read that page for the
field-level reference.

## Editing

| Gesture | Result |
|---|---|
| **Click an empty spot** | Adds a point — type-aware: `route` / `multi` **append** a stop, `single` **moves** the one point. The new point is **not** auto-opened, so dropping several in a row stays fluid. |
| **Drag a marker** | Moves that point; the route polyline follows **live**, `update:data` fires on drop. |
| **Click a marker** | Selects it and opens the **property popup** (see below). |
| **Click the route line** | Inserts a waypoint **exactly there**, snapped to the nearest segment. |
| **Click away · `Esc` · popup ×** | Closes the popup (deselects). Clicking empty space **while a point is selected dismisses it** — it does *not* add a point. |

Every point gets a draggable handle — including the unnamed `shape` vertices that
`<CoarMap>` draws as pure line geometry — so route shapes are editable too. Set
`readonly` to freeze all of this (the editor then behaves like `<CoarMap>`).

## Property popup

Selecting a point opens a small popup anchored over its marker. The built-in form
is rendered with the Cocoar UI controls (`CoarTextInput`, `CoarSelect`,
`CoarButton`) so it matches the design system; it edits `label`, `note`,
`category` and `icon` (for stops), toggles a point between **stop** and
**vertex**, **reorders** route waypoints (↑ / ↓) and **deletes** the point. It
flips below the marker automatically when there isn't room above. Close it with
the **×**, **`Esc`**, or by clicking empty map space (which dismisses rather than
adding a point).

Override it entirely with the **`#point-form`** slot to drop in your own
controls (e.g. design-system inputs):

```vue
<CoarMapEditor v-model:data="data" :config="config">
  <template #point-form="{ point, index, update, remove, moveUp, moveDown }">
    <CoarTextInput :model-value="point.label" @update:model-value="(v) => update({ label: v })" />
    <button @click="moveUp">Up</button>
    <button @click="moveDown">Down</button>
    <button @click="remove">Delete</button>
  </template>
</CoarMapEditor>
```

| Slot prop | Type | Description |
|---|---|---|
| `point` | `MapPoint` | The selected point. |
| `index` | `number` | Its index in `data.points`. |
| `update` | `(patch: Partial<MapPoint>) => void` | Apply a partial change to the point. |
| `remove` | `() => void` | Delete the point. |
| `moveUp` / `moveDown` | `() => void` | Reorder the point earlier / later. |

## Imperative bridge

A consumer-built toolbar or point list can drive edits through exposed methods —
the same hooks as `<CoarMap>` plus the editing operations:

| API | Description |
|---|---|
| `v-model:selected` | Selected point index (rings the marker, opens the popup). |
| `@point-click` | `{ point, index }` when a marker is clicked. |
| `addPoint(lat, lng, init?)` | Add a point (type-aware), like a map click. |
| `updatePoint(index, patch)` | Patch a point's fields. |
| `removePoint(index)` | Delete a point. Selection follows (stays on the same point, or clears). |
| `reorder(from, to)` | Move a point within the order. Selection tracks the same point. |
| `captureViewport()` | Save the current center + zoom into `data.viewport`. |
| `focusPoint(index)` / `highlightPoint(index \| null)` | Pan-to-and-select / transient hover emphasis. |

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarMapEditor } from '@cocoar/vue-map';

const editor = ref<InstanceType<typeof CoarMapEditor>>();
</script>

<template>
  <button @click="editor?.captureViewport()">Save current view</button>
  <CoarMapEditor ref="editor" v-model:data="data" :config="config" />
</template>
```

## Point list (`CoarMapPointList`)

A ready-made, drop-anywhere point list ships in the package so you don't rebuild
it per app. It's **controlled** (`v-model:data` / `v-model:selected`) and stays
decoupled from the map — bind both to the same refs as the editor, and wire its
`focus` / `highlight` events to the map's exposed methods for fly-to + hover.

<preview path="./demos/MapEditorList.vue" />

```vue
<CoarMapEditor ref="editor" v-model:data="data" v-model:selected="sel" :config="config" />

<CoarMapPointList
  v-model:data="data"
  v-model:selected="sel"
  :config="config"
  reorderable
  removable
  @focus="editor.focusPoint($event)"
  @highlight="editor.highlightPoint($event)"
/>
```

| Prop / event | Description |
|---|---|
| `v-model:data` | The map data; reorder + delete emit a fresh `MapData`. |
| `v-model:selected` | Active row ↔ selected index. |
| `config` | Resolves stop emojis/labels (falls back to a point's own `icon`). |
| `reorderable` | Drag-and-drop sorting via a per-row handle (default `false`). |
| `removable` | Per-row delete button (default `false`). |
| `@focus(index)` | Row activated — wire to `focusPoint`. |
| `@highlight(index \| null)` | Row hover — wire to `highlightPoint`. |
| `#row="{ point, index, selected }"` | Override a row's content. |

It lists **every** point — including the unnamed `shape` vertices the viewer
draws as bare geometry — so the whole route order stays editable. Reordering and
deleting keep the selection on the **same point**, so the active row never
drifts. Drag-and-drop is built on Cocoar UI's `useDragDrop`. The list works next
to a read-only [`<CoarMap>`](/components/map/) too (omit `reorderable` /
`removable` for a pure navigator). Prefer your own layout? It's still the
consumer's call — the same edits are available as exposed methods (above) and as
[pure operations](#pure-editing-operations).

## Pure editing operations

The same immutable, Leaflet-free helpers the editor uses are exported, for
consumers building edits outside a map (validation, undo stacks, server sync):

```ts
import {
  addPointForType, movePoint, updatePoint, removePoint,
  reorderPoint, insertOnSegment, setViewport, nearestSegment, normalizeLatLng,
} from '@cocoar/vue-map';

const next = addPointForType(data, 51.5, -0.12);   // returns a fresh MapData
```

Each takes a `MapData` and returns a new one — your input is never mutated.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `MapData` | _required_ | The map data (`v-model:data`). |
| `config` | `MapConfig` | _provide_ | Basemaps + categories. Falls back to `COAR_MAP_CONFIG_KEY`. |
| `selected` | `number \| null` | `null` | Selected point index (`v-model:selected`). |
| `readonly` | `boolean` | `false` | Freeze editing — behaves like `<CoarMap>`. |

## Events

| Event | Payload | Description |
|---|---|---|
| `update:data` | `MapData` | Emitted on every edit. |
| `update:selected` | `number \| null` | Selection changed. |
| `point-click` | `{ point, index }` | A marker was clicked. |

## Relationship to `<CoarMap>`

Use `<CoarMap>` to **display** a map and `<CoarMapEditor>` to **author** one —
they share the exact same `MapData`/`MapConfig`, so editor output drops straight
into the viewer. The editor keeps the same discipline as the viewer: Leaflet is
lazy-loaded, custom pins avoid Leaflet's broken default-icon asset path, point
text is treated as untrusted (escaped on render), and the package stays
**markdown-agnostic** — bridging a map into markdown is the consumer's job, not
the package's.
