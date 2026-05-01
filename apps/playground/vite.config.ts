import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  server: { port: 5188 },
  // The recurrence worker (`@cocoar/vue-calendar/core/recurrenceWorker`)
  // imports rrule-rust (WASM) which uses top-level await to bootstrap
  // its NAPI module. Vite's default worker output format is `iife`,
  // which forbids TLA — switch to ES so the worker bundle preserves
  // the TLA boundary instead of trying to inline it.
  worker: { format: 'es' },
  resolve: {
    alias: [
      { find: /^@cocoar\/vue-ui$/, replacement: resolve(__dirname, '../../packages/ui/src/index.ts') },
      { find: /^@cocoar\/vue-ui\/styles$/, replacement: resolve(__dirname, '../../packages/ui/styles/all.css') },
      { find: /^@cocoar\/vue-ui\/fonts$/, replacement: resolve(__dirname, '../../packages/ui/src/fonts.ts') },
      { find: /^@cocoar\/vue-localization$/, replacement: resolve(__dirname, '../../packages/localization/src/index.ts') },
      { find: /^@cocoar\/vue-fragment-parser$/, replacement: resolve(__dirname, '../../packages/fragment-parser/src/index.ts') },
      { find: /^@cocoar\/vue-data-grid$/, replacement: resolve(__dirname, '../../packages/data-grid/src/index.ts') },
      { find: /^@cocoar\/vue-script-editor$/, replacement: resolve(__dirname, '../../packages/script-editor/src/index.ts') },
      { find: /^@cocoar\/vue-markdown-editor$/, replacement: resolve(__dirname, '../../packages/markdown-editor/src/index.ts') },
      { find: /^@cocoar\/vue-calendar$/, replacement: resolve(__dirname, '../../packages/calendar/src/index.ts') },
      { find: /^@cocoar\/vue-calendar\/core$/, replacement: resolve(__dirname, '../../packages/calendar/src/core/index.ts') },
      { find: /^@cocoar\/vue-calendar\/recurrence$/, replacement: resolve(__dirname, '../../packages/calendar/src/core/recurrence.ts') },
    ],
  },
});
