<!-- Generated from apps/docs/components/document-viewer/coar-document-viewer.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# CoarDocumentViewer

The all-in-one viewer component. One required prop — `source` — plus a handful of toggles for chrome, panels, and the annotation surface.

```ts
import { CoarDocumentViewer } from '@cocoar/vue-document-viewer';
import '@cocoar/vue-document-viewer/styles';
```

For PDFs, also pull `pdfSource` from the [`/pdf` subpath](./index.md#worker-setup-pdf-consumers-only) and wire the worker once at app bootstrap.

## Minimal usage

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { CoarDocumentViewer, imageSource } from '@cocoar/vue-document-viewer';
import '@cocoar/vue-document-viewer/styles';

const source = computed(() => imageSource({ url: '/attachments/diagram.png' }));
</script>

<template>
  <CoarDocumentViewer :source="source" />
</template>
```

That's it. Toolbar on, sidebars and annotations panel off, default 'view' annotation mode. Wrap the viewer in a sized container — the component fills 100% of its parent.

## Props

### Source

| Prop | Type | Default | Notes |
|---|---|---|---|
| `source` | `DocumentSource` | _required_ | Build via `pdfSource()`, `imageSource()`, or `imageGallerySource()`. Returns a frozen object — build it inside `computed` to avoid unnecessary rebinds. |

Switching the `source` keeps the surrounding chrome mounted; only the inner page renderer rebinds, so users see toolbar / panels stay still across document changes.

### Chrome toggles

| Prop | Type | Default | Notes |
|---|---|---|---|
| `showToolbar` | `boolean` | `true` | Top/side/bottom toolbar — see `toolbarPosition`. |
| `toolbarPosition` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | Where the toolbar sits. Horizontal at top/bottom, vertical at sides. |
| `showThumbnails` | `boolean` | `false` | Left-rail Thumbnails tab. Works for every source (per-page mini canvas). |
| `showOutline` | `boolean` | `false` | Left-rail Outline (TOC) tab. PDF-only; auto-hides when the doc has no outline. |
| `showAnnotationsPanel` | `boolean` | `false` | Right-rail panel: Info section + annotation list with filter/sort/search. |
| `showInfoSection` | `boolean` | `true` | Top section of the annotations panel surfacing source metadata. Only active when the panel is open. |
| `showSearch` | `boolean` | `true` | Search input (button + bar). Disabled when the source can't search (e.g. images). |
| `showPrintDownload` | `boolean` | `false` | Print + Download buttons in the toolbar. |
| `showAnnotationModes` | `boolean` | `true` | The drawing-mode button group (marker / note / draw / text). |

Two convenience props — `showThumbnails || showOutline` controls the left-rail toggle button; `showAnnotationsPanel` controls the right-rail toggle. The user can collapse either rail from inside the viewer; these props gate whether the toggle is even present in the toolbar.

#### Panel open state (`v-model`)

By default, the left and right rails start closed and their open/closed state lives inside the component — fine for stand-alone viewers. If you embed the viewer inside a parent that mounts/unmounts it (e.g. a tab bar in a file explorer where the user switches between a Markdown file and a PDF and back), use `v-model` to hold the state on the parent so it **persists across remounts**.

| Prop / Event | Type | Notes |
|---|---|---|
| `:sidebar-open` + `@update:sidebar-open` (`v-model:sidebar-open`) | `boolean` | Left rail (thumbnails / outline). Default `false`. |
| `:annotations-panel-open` + `@update:annotations-panel-open` (`v-model:annotations-panel-open`) | `boolean` | Right rail (info section + annotations list). Default `false`. |

```vue
<script setup lang="ts">
import { ref } from 'vue';
const sidebarOpen = ref(false);
const panelOpen = ref(false);
</script>

<template>
  <CoarDocumentViewer
    :source="source"
    :show-thumbnails="true"
    :show-annotations-panel="true"
    v-model:sidebar-open="sidebarOpen"
    v-model:annotations-panel-open="panelOpen"
  />
</template>
```

Without `v-model`, the state is purely internal — same behavior as before, no breaking change.

### Position memory

```ts
interface CoarDocumentViewerPosition {
  page: number;                   // 0-based page index in view
  pageOffset: number;             // fractional scroll inside the page, 0..1
  zoom: number;                   // 1 = 100%
  rotation: 0 | 90 | 180 | 270;
}
```

Two compatible mechanisms:

| Prop / Event | Use when |
|---|---|
| `storageKey: string` | You want the viewer to persist position in `localStorage` automatically. Different keys per document (e.g. include the file ID) so each document remembers its own view. |
| `:position` + `@update:position` (`v-model:position`) | You own persistence (server, IndexedDB, your existing state manager). Two-way binding — the viewer reads on mount, writes on every change. |

Both mechanisms can coexist; when both are present, the bound `position` wins on mount.

### Toolbar layout

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tools` | `CoarDocumentViewerTool[]` | `undefined` (= `COAR_DOCUMENT_VIEWER_ALL_TOOLS`) | Array drives BOTH the visible set AND the order. See [Toolbar customization](./toolbar.md). |

### Annotations

| Prop / Event | Type | Notes |
|---|---|---|
| `annotations` | `CoarPdfAnnotation[]` | Consumer-owned. The viewer never mutates this array. |
| `:annotation-mode` + `@update:annotationMode` (`v-model:annotation-mode`) | `'view' \| 'select' \| 'eraser' \| 'marker' \| 'comment' \| 'ink' \| 'freetext'` | The active pointer mode. `'view'` is read-only (existing annotations clickable, no new ones created). |
| `annotationColors` | `string[]` | Palette for the color picker. Defaults to a 7-color pastel + neon set. |
| `@annotation:create` | `(payload: CoarPdfAnnotationCreatePayload) => void` | Consumer assigns `id` + `createdAt` (+ optionally `createdBy`), pushes to `annotations`. |
| `@annotation:update` | `(payload: { id: string; patch: Partial<CoarPdfAnnotation> }) => void` | Consumer merges the patch into the matching annotation. |
| `@annotation:delete` | `(id: string) => void` | Consumer removes by id. |

See [Annotations](./annotations.md) for the full lifecycle, schema, and a worked example.

### Labels

```ts
interface CoarDocumentViewerLabels {
  // Loading / error overlays
  loading?: string;
  errorTitle?: string;
  errorRetry?: string;

  // Page navigation
  pageOf?: string;                  // "Page {current} of {total}"
  pageJumpAria?: string;
  prevPage?: string;
  nextPage?: string;

  // Zoom
  zoomIn?: string;
  zoomOut?: string;
  resetZoom?: string;
  zoomLevel?: string;
  fitWidth?: string;
  fitPage?: string;
  resetView?: string;
  pan?: string;

  // Rotation
  rotateCw?: string;
  rotateCcw?: string;

  // Search
  search?: string;
  searchNext?: string;
  searchPrev?: string;
  searchMatchOf?: string;           // "{current} of {total}"

  // Panels + sidebar tabs
  thumbnails?: string;
  outline?: string;
  annotationsPanel?: string;

  // Document actions
  print?: string;
  download?: string;

  // Annotation modes
  modeView?: string;
  modeSelect?: string;
  modeEraser?: string;
  modeMarker?: string;
  modeNote?: string;
  modeInk?: string;
  modeFreetext?: string;
  strokeWidth?: string;

  // Annotation panel
  noAnnotations?: string;
  noMatchingAnnotations?: string;
  searchAnnotations?: string;
  filterBy?: string;
  sortBy?: string;
  sortByPage?: string;
  sortChronological?: string;
  pagePrefix?: string;
  justNow?: string;
  moreActions?: string;
  annotationDelete?: string;
  annotationEditComment?: string;
  annotationColor?: string;

  // Capability tooltip suffix — appended when a tool isn't supported by the source.
  notAvailableForSource?: string;

  // Info section
  infoSection?: string;             // "Info"
  infoFormat?: string;
  infoPages?: string;
  infoPage?: string;                // "Page {n}"
  infoSize?: string;
  infoTitle?: string;
  infoAuthor?: string;
  infoSubject?: string;
  infoKeywords?: string;
  infoCreator?: string;
  infoProducer?: string;
  infoCreated?: string;
  infoModified?: string;
  infoPdfVersion?: string;
}
```

English defaults are baked in. Pass any subset to override individual strings — keys you omit fall back to the default. `{current}`, `{total}`, `{n}` placeholders are substituted at render time.

## Events

| Event | Payload | When |
|---|---|---|
| `update:position` | `CoarDocumentViewerPosition` | Page / scroll / zoom / rotation change. Used for `v-model:position`. |
| `update:annotationMode` | `CoarPdfAnnotationMode` | User picks a different mode in the toolbar. Used for `v-model:annotation-mode`. |
| `update:sidebarOpen` | `boolean` | User toggles the left rail (thumbnails / outline). Used for `v-model:sidebar-open`. |
| `update:annotationsPanelOpen` | `boolean` | User toggles the right rail (annotations panel). Used for `v-model:annotations-panel-open`. |
| `annotation:create` | `CoarPdfAnnotationCreatePayload` | New annotation drawn. Consumer assigns id + timestamp. |
| `annotation:update` | `{ id, patch }` | Existing annotation edited (color / comment / position). |
| `annotation:delete` | `string` (id) | Existing annotation removed (via panel menu or eraser tool). |
| `error` | `CoarDocumentViewerErrorEvent` | Source failed to load. `{ error: unknown, src?: string }`. |

## Slots

| Slot | Props | When |
|---|---|---|
| `loading` | _none_ | Replaces the default `"Loading…"` text shown while the source is fetching/parsing. |
| `error` | `{ error: unknown; retry: () => void }` | Replaces the default error overlay. Call `retry()` to re-trigger the load. |

```vue
<CoarDocumentViewer :source="source">
  <template #loading>
    <CoarSpinner /> Fetching document…
  </template>
  <template #error="{ error, retry }">
    <div>
      <strong>{{ String(error) }}</strong>
      <CoarButton @click="retry">Try again</CoarButton>
    </div>
  </template>
</CoarDocumentViewer>
```

## Sizing

The viewer fills 100% of its parent and uses internal flexbox to allocate space across toolbar, panels, and the page area. Put it inside a sized container:

```vue
<div style="height: 80vh">
  <CoarDocumentViewer :source="source" />
</div>
```

Splitters between the columns are draggable — users can resize the left rail (thumbnails) and right rail (annotations panel) on the fly.

## Position memory example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarDocumentViewer, type CoarDocumentViewerPosition } from '@cocoar/vue-document-viewer';
import { pdfSource } from '@cocoar/vue-document-viewer/pdf';

const source = pdfSource({ url: '/files/manual.pdf' });

// v-model:position — server-side persistence
const position = ref<CoarDocumentViewerPosition>({
  page: 0, pageOffset: 0, zoom: 1, rotation: 0,
});
watchDebounced(position, savePositionToServer, { debounce: 300 });

// OR — storageKey for automatic localStorage persistence
</script>

<template>
  <CoarDocumentViewer
    :source="source"
    v-model:position="position"
    storage-key="manual.pdf"
  />
</template>
```

Use one OR the other in practice — both is fine, just pick the priority. When both are present, the bound `position` wins on mount; afterwards both stay in sync.

## Common configurations

### Read-only PDF viewer with thumbnails

```vue
<CoarDocumentViewer
  :source="source"
  :show-thumbnails="true"
  :show-outline="true"
  :show-print-download="true"
  :show-annotation-modes="false"
/>
```

### Annotation tool with persistence

```vue
<CoarDocumentViewer
  :source="source"
  :show-annotations-panel="true"
  v-model:annotation-mode="mode"
  :annotations="annotations"
  storage-key="contract-2024"
  @annotation:create="handleCreate"
  @annotation:update="handleUpdate"
  @annotation:delete="handleDelete"
/>
```

### Minimal embedded preview (no toolbar)

```vue
<CoarDocumentViewer :source="source" :show-toolbar="false" />
```
