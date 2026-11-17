<script setup lang="ts">
/**
 * `<CoarDocumentViewer>` with a PDF (profile-neutral): the local two-page fixture
 * `compact-document-viewer.pdf` (Helvetica text, fixed metadata), rendered by pdf.js in a
 * worker; thumbnails, the info section of the annotations panel (title, author, producer
 * and the PDF metadata rows) and the PDF-only toolbar entries (search).
 */
import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { CoarDocumentViewer } from '@cocoar/vue-document-viewer';
import { pdfSource } from '@cocoar/vue-document-viewer/pdf';
import pdfUrl from './compact-document-viewer.pdf?url';

pdfjs.GlobalWorkerOptions.workerPort ??= new PdfWorker();
const source = pdfSource({ url: pdfUrl, withCredentials: false });
</script>

<template>
  <div style="height: 560px">
    <CoarDocumentViewer
      :source="source"
      :show-thumbnails="true"
      :show-annotations-panel="true"
      :sidebar-open="true"
      :annotations-panel-open="true"
    />
  </div>
</template>
