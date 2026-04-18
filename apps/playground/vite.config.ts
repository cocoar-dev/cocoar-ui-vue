import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  server: { port: 5188 },
  resolve: {
    alias: [
      { find: /^@cocoar\/vue-ui$/, replacement: resolve(__dirname, '../../packages/ui/src/index.ts') },
      { find: /^@cocoar\/vue-ui\/styles$/, replacement: resolve(__dirname, '../../packages/ui/styles/all.css') },
      { find: /^@cocoar\/vue-ui\/fonts$/, replacement: resolve(__dirname, '../../packages/ui/src/fonts.ts') },
      { find: /^@cocoar\/vue-localization$/, replacement: resolve(__dirname, '../../packages/localization/src/index.ts') },
      { find: /^@cocoar\/vue-fragment-parser$/, replacement: resolve(__dirname, '../../packages/fragment-parser/src/index.ts') },
      { find: /^@cocoar\/vue-data-grid$/, replacement: resolve(__dirname, '../../packages/data-grid/src/index.ts') },
      { find: /^@cocoar\/vue-script-editor$/, replacement: resolve(__dirname, '../../packages/script-editor/src/index.ts') },
    ],
  },
});
