import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  server: { port: 5193 },
  resolve: {
    alias: [
      {
        find: /^@cocoar\/vue-ui$/,
        replacement: resolve(__dirname, '../../packages/ui/src/index.ts'),
      },
      {
        find: /^@cocoar\/vue-ui\/styles$/,
        replacement: resolve(__dirname, '../../packages/ui/styles/all.css'),
      },
      {
        find: /^@cocoar\/vue-ui\/fonts$/,
        replacement: resolve(__dirname, '../../packages/ui/src/fonts.ts'),
      },
      {
        find: /^@cocoar\/vue-localization$/,
        replacement: resolve(__dirname, '../../packages/localization/src/index.ts'),
      },
      {
        find: /^@cocoar\/vue-markdown-editor$/,
        replacement: resolve(__dirname, '../../packages/markdown-editor/src/index.ts'),
      },
      {
        find: /^@cocoar\/vue-markdown-form$/,
        replacement: resolve(__dirname, '../../packages/markdown-form/src/index.ts'),
      },
      {
        find: /^@cocoar\/vue-markdown-form\/styles$/,
        replacement: resolve(__dirname, '../../packages/markdown-form/styles/markdown-form.css'),
      },
      {
        find: /^@cocoar\/vue-markdown$/,
        replacement: resolve(__dirname, '../../packages/markdown/src/index.ts'),
      },
      {
        find: /^@cocoar\/vue-markdown\/styles$/,
        replacement: resolve(__dirname, '../../packages/markdown/styles/markdown-blocks.css'),
      },
      {
        find: /^@cocoar\/vue-markdown-core$/,
        replacement: resolve(__dirname, '../../packages/markdown-core/src/index.ts'),
      },
    ],
  },
});
