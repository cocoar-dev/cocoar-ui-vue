# Document Viewer <Badge type="warning" text="Preview" />

`@cocoar/vue-document-viewer` is a generic, source-agnostic document viewer for Vue 3. One component — [`<CoarDocumentViewer>`](./coar-document-viewer) — renders **PDFs**, **single images**, and **multi-page image galleries**, with shared toolbar chrome, side panels, and an annotation layer.

You pick the source kind with a small factory (`pdfSource(...)`, `imageSource(...)`, `imageGallerySource(...)`); the viewer dispatches internally. The toolbar greys out tools the active source doesn't support — e.g. search and outline are PDF-only — rather than hiding them, so users don't see UI moving around when they switch documents.

```ts
import {
  CoarDocumentViewer,
  imageSource,
  imageGallerySource,
} from '@cocoar/vue-document-viewer';
import { pdfSource } from '@cocoar/vue-document-viewer/pdf';
import '@cocoar/vue-document-viewer/styles';
```

`pdfjs-dist` is an **optional peer dependency**. PDF consumers import `pdfSource` from the `/pdf` subpath; image-only consumers never pay the pdfjs bundle cost.

## Three source factories

```ts
// PDF — pdfjs subpath
pdfSource({ url, headers?, withCredentials? })

// Single-page raster / vector image (JPG / PNG / SVG / WebP / AVIF / GIF / blob: / data:)
imageSource({ url })

// Multi-page image document — pages may mix orientations
imageGallerySource({ urls })
```

Each factory returns a frozen `DocumentSource`. Build it inside a `computed` so the viewer rebinds only when something actually changes — switching sources keeps the toolbar, panels, and viewport mounted; only the inner page renderer rebinds.

## Single image

<preview path="./demos/ImageSourceDemo.vue" />

Toolbar tools the source doesn't support stay visible but disabled — e.g. **Search**, **Previous/Next page**, and **Outline** are off for a single-page image. Their tooltips append the `notAvailableForSource` label so the user understands the state.

## Image gallery

<preview path="./demos/GallerySourceDemo.vue" />

Pages can mix orientations (landscape page 1, portrait page 2, wide page 3 above). Every page's intrinsic dimensions are read from its own image, so the viewer never letter-boxes or stretches. Sidebar thumbnails track the active page.

## PDF source

The PDF demo runs in the playground at [`localhost:5188/pdf-viewer`](http://localhost:5188/pdf-viewer) — it's omitted here because the pdfjs worker has to be configured by the consumer (one-line setup, below).

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { CoarDocumentViewer } from '@cocoar/vue-document-viewer';
import { pdfSource } from '@cocoar/vue-document-viewer/pdf';
import '@cocoar/vue-document-viewer/styles';

const source = computed(() => pdfSource({
  url: '/api/files/contract.pdf',
  withCredentials: true,         // forward cookies / HTTP auth
  headers: { 'X-Tenant': 'acme' }, // arbitrary request headers
}));
</script>

<template>
  <CoarDocumentViewer
    :source="source"
    :show-thumbnails="true"
    :show-outline="true"
    :show-annotations-panel="true"
    :show-print-download="true"
  />
</template>
```

### Worker setup (PDF consumers only)

pdfjs needs a worker to parse the binary off the main thread. Wire it once at app bootstrap — Vite/webpack/Rollup all support the `?worker` query:

```ts
// main.ts
import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
```

If you skip this step, pdfjs will try to fetch the worker over the network and fall back to a slow inline mode — both viable, but not what you want in production.

## Source capabilities

Every source advertises what it can do. The toolbar reads these flags to enable/disable individual tools; consumers can inspect them too:

```ts
interface DocumentSourceCapabilities {
  multiPage: boolean;     // Prev / Next / page input
  textLayer: boolean;     // Text selection, Ctrl+C copy
  search: boolean;        // Search button
  outline: boolean;       // Outline (TOC) sidebar tab
  print: boolean;         // Print button
}
```

The factories pre-populate the right values: PDFs get all-true, images get a single-page no-text profile, galleries get the same with `multiPage: true`. Adding a future source kind (e.g. OCR'd images) is a matter of providing a new factory that flips the relevant flags.

::: tip Why disabled, not hidden?
Tools that vanish when the source changes make the toolbar layout shift — buttons jump positions, muscle memory breaks. Greying out keeps positions stable and surfaces the capability constraint to the user via tooltip.
:::

## Info panel

When the right-side annotations panel is open, a collapsible **Info** section at the top surfaces source metadata:

- Format string (`"PDF · v1.7"`, `"Image · PNG"`, `"Image gallery · SVG"`)
- Total page count
- Current page dimensions (live — updates as the user flips pages)
- PDF-only fields: title / author / subject / keywords / creator / producer / created / modified / PDF version (empty fields are skipped)
- File size in bytes (PDFs only — pdfjs exposes `contentLength`)

Disable with `:show-info-section="false"` if you want a minimal annotations-only panel.

## Architecture

```
<CoarDocumentViewer :source="…">
  useDocumentLoader(sourceRef)             ← internal dispatcher, watches source.kind
    usePdfDocumentAdapter(pdfSourceRef)
    useImageDocumentAdapter(imgSourceRef)
    useImageGalleryAdapter(gallerySourceRef)
        each publishes { status, pageProviders, info, error, retry, destroy }
  usePageRenderer({ pageProviders, … })    ← source-agnostic, owns canvas + textLayer DOM
  DocumentToolbar, DocumentSidebar, DocumentAnnotationPanel, DocumentSearchBar
```

The seam between formats is `PageProvider` — every page (PDF page proxy, image element, future kinds) materializes through the same interface (`render(canvas, opts)`, `cancel()`, optional `getTextLayer()`). The renderer never imports `pdfjs-dist`.

## What's next

| Page | Covers |
|------|--------|
| [CoarDocumentViewer](./coar-document-viewer) | Full props / emits / slots reference, labels, position memory |
| [Toolbar customization](./toolbar) | Order-driven `tools` array, separator pseudo-tool, section toggles |
| [Annotations](./annotations) | Modes, types, lifecycle events, schema, color picker |
