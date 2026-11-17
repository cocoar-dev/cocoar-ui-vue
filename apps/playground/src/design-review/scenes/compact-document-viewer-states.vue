<script setup lang="ts">
/**
 * Two real `CoarDocumentViewer`s (profile-neutral):
 *  - `[data-scene-part=outline]`: the local three-page PDF with a two-level outline and text
 *    (`compact-document-viewer-outline.pdf`, made by make-outline-pdf.py), thumbnails + outline sidebar open.
 *    "budget" occurs on pages 1 and 2 (two search matches); "calendar" once.
 *  - `[data-scene-part=error]`: a PDF source that cannot be parsed (a one-byte data: URL, same origin, no network),
 *    so the viewer's own error card with its Retry button shows. Every `error` event is counted in
 *    `[data-scene-part=error-count]`.
 */
import { ref } from 'vue';
import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { CoarDocumentViewer } from '../../../../../packages/document-viewer/src/index';
import { pdfSource } from '../../../../../packages/document-viewer/src/sources/pdf';
import outlineUrl from './compact-document-viewer-outline.pdf?url';

pdfjs.GlobalWorkerOptions.workerPort ??= new PdfWorker();

const outlineSource = pdfSource({ url: outlineUrl, withCredentials: false });
const brokenSource = pdfSource({ url: 'data:application/pdf;base64,AA==', withCredentials: false });
const sidebarOpen = ref(true);
const errors = ref(0);
</script>

<template>
  <div data-scene="document-viewer-states" style="display: grid; gap: 12px">
    <div data-scene-part="outline" style="height: 520px">
      <CoarDocumentViewer
        v-model:sidebar-open="sidebarOpen"
        :source="outlineSource"
        :show-thumbnails="true"
        :show-outline="true"
      />
    </div>
    <div data-scene-part="error" style="height: 200px">
      <CoarDocumentViewer :source="brokenSource" @error="errors += 1" />
    </div>
    <span data-scene-part="error-count" style="font-size: 12px">{{ errors }}</span>
  </div>
</template>
