import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';
import { createCoarLocalization } from '@cocoar/vue-localization';
import * as monacoNs from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

// One-time pdfjs worker registration — pdfSource() (from
// @cocoar/vue-document-viewer/pdf) expects this to be set before any viewer
// instance mounts a PDF source.
pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

// Expose on window so e2e tests can read Monaco markers directly. Playground is a dev tool;
// never bundled into consumer apps.
(window as unknown as { monaco: typeof monacoNs }).monaco = monacoNs;

import '@cocoar/vue-ui/fonts';
import '@cocoar/vue-ui/styles';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};

import App from './App.vue';
import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.use(CoarOverlayPlugin);
app.use(createCoarLocalization({ defaultLanguage: 'en' }));
app.mount('#app');
