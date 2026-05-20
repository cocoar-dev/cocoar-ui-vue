# @cocoar/vue-document-viewer

Universal document viewer for Vue 3 — renders **PDFs**, **single images**, and **multi-page image galleries** through a single component with shared toolbar, panels, and annotation layer.

> **Status: Preview tier.** Ships under the suite version (GitVersion-calculated) but the public API is still settling — small tweaks may land before the Preview marker drops.

📖 **Full reference, live demos, and configuration guide:** [docs.cocoar.dev/cocoar-ui-vue/components/document-viewer/](https://docs.cocoar.dev/cocoar-ui-vue/components/document-viewer/)

## Install

```bash
pnpm add @cocoar/vue-document-viewer @cocoar/vue-ui
```

`@cocoar/vue-ui` is a peer dependency. **`pdfjs-dist` is optional** — only required if you render PDFs:

```bash
pnpm add pdfjs-dist     # PDF consumers only
```

Image-only consumers (`imageSource`, `imageGallerySource`) skip pdfjs entirely.

## Three source factories

```ts
import {
  CoarDocumentViewer,
  imageSource,
  imageGallerySource,
} from '@cocoar/vue-document-viewer';
import { pdfSource } from '@cocoar/vue-document-viewer/pdf';
import '@cocoar/vue-document-viewer/styles';

pdfSource({ url, headers?, withCredentials? })   // PDF — pdfjs subpath
imageSource({ url })                              // Single image (JPG / PNG / SVG / WebP / AVIF / GIF / blob: / data:)
imageGallerySource({ urls })                      // Multi-page image document
```

Each factory returns a frozen `DocumentSource`. Build it inside a `computed` so the viewer rebinds only on real source changes.

## Quick start — image

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { CoarDocumentViewer, imageSource } from '@cocoar/vue-document-viewer';
import '@cocoar/vue-document-viewer/styles';

const source = computed(() => imageSource({ url: '/attachments/diagram.png' }));
</script>

<template>
  <div style="height: 80vh">
    <CoarDocumentViewer :source="source" />
  </div>
</template>
```

## Quick start — image gallery

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { CoarDocumentViewer, imageGallerySource } from '@cocoar/vue-document-viewer';

const source = computed(() => imageGallerySource({
  urls: ['/scans/page-1.jpg', '/scans/page-2.jpg', '/scans/page-3.jpg'],
}));
</script>

<template>
  <CoarDocumentViewer :source="source" :show-thumbnails="true" />
</template>
```

Pages may mix orientations — each carries its own intrinsic dimensions.

## Quick start — PDF

PDFs need a one-line worker setup at app bootstrap (Vite shown — webpack, Rollup, esbuild all support `?worker`):

```ts
// main.ts
import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
```

Then:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { CoarDocumentViewer } from '@cocoar/vue-document-viewer';
import { pdfSource } from '@cocoar/vue-document-viewer/pdf';

const source = computed(() => pdfSource({
  url: '/api/files/contract.pdf',
  withCredentials: true,
  headers: { 'X-Tenant': 'acme' },
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

## Capability-driven toolbar

Every source advertises what it can do via `capabilities` flags. The toolbar **disables** unsupported tools rather than hiding them — switching sources never makes buttons jump around. Search and outline are PDF-only; image sources see them greyed out with a tooltip suffix.

```ts
interface DocumentSourceCapabilities {
  multiPage: boolean;   // Prev / Next / page input
  textLayer: boolean;   // Text selection, Ctrl+C copy
  search: boolean;      // Search button
  outline: boolean;     // Outline (TOC) sidebar tab
  print: boolean;       // Print button
}
```

## Order-driven custom toolbar

The `tools` prop drives BOTH the visible set AND order:

```ts
import type { CoarDocumentViewerTool } from '@cocoar/vue-document-viewer';

const MINIMAL: CoarDocumentViewerTool[] = [
  'prev-page', 'page-input', 'next-page',
  'separator',
  'zoom-out', 'zoom-reset', 'zoom-in',
];
```

```vue
<CoarDocumentViewer :source="source" :tools="MINIMAL" />
```

Leading + trailing separators auto-trim; consecutive separators collapse. See the [toolbar guide](https://docs.cocoar.dev/cocoar-ui-vue/components/document-viewer/toolbar.html) for the full layer model.

## Annotations

Four types — marker / comment / ink / freetext — controlled-component pattern: the viewer emits events, the consumer owns persistence.

```vue
<CoarDocumentViewer
  :source="source"
  v-model:annotation-mode="mode"
  :annotations="annotations"
  :show-annotations-panel="true"
  @annotation:create="onCreate"
  @annotation:update="onUpdate"
  @annotation:delete="onDelete"
/>
```

Coordinates are page-relative and normalized to `[0..1]`, so annotations render correctly across zoom levels and rotations and stay portable across rendering contexts. Full lifecycle, types, and a worked review example in the [annotations guide](https://docs.cocoar.dev/cocoar-ui-vue/components/document-viewer/annotations.html).

## Position memory

Two compatible mechanisms — pick one:

```vue
<!-- Automatic localStorage persistence -->
<CoarDocumentViewer :source="source" storage-key="contract-abc" />

<!-- Or two-way binding for your own state -->
<CoarDocumentViewer :source="source" v-model:position="position" />
```

Position covers `{ page, pageOffset, zoom, rotation }`.

## Theming

Component visuals expose CSS custom properties — override on any ancestor:

```css
.my-doc-modal {
  --coar-pdf-toolbar-bg: #1f2937;
  --coar-pdf-toolbar-fg: #f9fafb;
  --coar-pdf-page-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  --coar-pdf-highlight-color: rgba(250, 204, 21, 0.5);
}
```

(The `--coar-pdf-*` prefix is historical — the component was renamed from `vue-pdf-viewer` to `vue-document-viewer` but the CSS variable names stay stable for back-compat.)

## Known limitations

- **PDF worker setup must be done by the consumer** (shown above) — the package can't do it for you because Vite's `?worker` import is a build-time concern.
- **Large PDFs (> 50 MB)** are not specifically optimized yet — pages render lazily, but the document is loaded fully.
- **Gallery bulk-print** prints the visible page only; multi-page print for galleries is on the roadmap.
- **Cross-origin auth** with cookies on a different origin (CORS-with-credentials) is out of scope; same-origin cookies via `withCredentials: true` work.

## Architecture

The viewer is **source-agnostic** internally — every source kind (PDF page proxy, HTMLImageElement, future kinds) materializes through the same `PageProvider` interface (`render(canvas, opts)`, `cancel()`, optional `getTextLayer()`). The page renderer never imports `pdfjs-dist`.

The seam keeps the public component identical across formats: same toolbar, same side panels, same annotation surface. Adding a future source kind (OCR'd images, DOCX, etc.) is a matter of providing a new factory + adapter.

## License

Apache 2.0. See [LICENSE](./LICENSE).
